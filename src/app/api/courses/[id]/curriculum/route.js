import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST/PUT: Sync curriculum (overwrite/recreate sections and lectures)
export async function PUT(request, { params }) {
  try {
    const { id: courseId } = await params;
    const session = await getServerSession(authOptions);

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (!session || (session.user.role !== 'ADMIN' && course.instructorId !== session.user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { sections } = await request.json();

    if (!Array.isArray(sections)) {
      return NextResponse.json({ error: 'Invalid sections array' }, { status: 400 });
    }

    // Sync in a Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete all existing sections (cascades to lectures and progress)
      await tx.section.deleteMany({
        where: { courseId },
      });

      // 2. Re-create sections and lectures
      const createdSections = [];

      for (let sIndex = 0; sIndex < sections.length; sIndex++) {
        const sec = sections[sIndex];
        
        const newSection = await tx.section.create({
          data: {
            title: sec.title,
            sortOrder: sIndex + 1,
            courseId,
          },
        });

        const createdLectures = [];

        if (Array.isArray(sec.lectures)) {
          for (let lIndex = 0; lIndex < sec.lectures.length; lIndex++) {
            const lec = sec.lectures[lIndex];
            
            const newLecture = await tx.lecture.create({
              data: {
                title: lec.title,
                videoUrl: lec.videoUrl || 'https://res.cloudinary.com/demo/video/upload/q_auto/cld_sample_video.mp4',
                duration: parseInt(lec.duration) || 0,
                sortOrder: lIndex + 1,
                sectionId: newSection.id,
              },
            });
            createdLectures.push(newLecture);
          }
        }

        createdSections.push({
          ...newSection,
          lectures: createdLectures,
        });
      }

      return createdSections;
    });

    return NextResponse.json({ message: 'Curriculum updated successfully', sections: result });
  } catch (error) {
    console.error('Sync curriculum error:', error);
    return NextResponse.json({ error: 'Failed to update curriculum' }, { status: 500 });
  }
}
