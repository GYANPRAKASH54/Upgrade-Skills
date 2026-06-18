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
      // Fetch existing sections and lectures for this course to calculate diff
      const existingSections = await tx.section.findMany({
        where: { courseId },
        include: { lectures: true },
      });

      const existingSectionIds = existingSections.map((s) => s.id);
      const incomingSectionIds = sections.map((s) => s.id).filter((id) => !id.startsWith('new-sec-'));

      // 1. Delete sections that are no longer in the curriculum payload
      const sectionsToDelete = existingSectionIds.filter((id) => !incomingSectionIds.includes(id));
      if (sectionsToDelete.length > 0) {
        await tx.section.deleteMany({
          where: { id: { in: sectionsToDelete } },
        });
      }

      const createdOrUpdatedSections = [];

      // 2. Iterate and sync sections/lectures
      for (let sIndex = 0; sIndex < sections.length; sIndex++) {
        const sec = sections[sIndex];
        const isNewSection = sec.id.startsWith('new-sec-');

        let section;
        if (isNewSection) {
          section = await tx.section.create({
            data: {
              title: sec.title,
              sortOrder: sIndex + 1,
              courseId,
            },
          });
        } else {
          section = await tx.section.update({
            where: { id: sec.id },
            data: {
              title: sec.title,
              sortOrder: sIndex + 1,
            },
          });
        }

        const sectionId = section.id;
        const existingLectures = existingSections.find((s) => s.id === sec.id)?.lectures || [];
        const existingLectureIds = existingLectures.map((l) => l.id);
        const incomingLectures = sec.lectures || [];
        const incomingLectureIds = incomingLectures.map((l) => l.id).filter((id) => !id.startsWith('new-lec-'));

        // Delete lectures that are no longer in this section
        const lecturesToDelete = existingLectureIds.filter((id) => !incomingLectureIds.includes(id));
        if (lecturesToDelete.length > 0) {
          await tx.lecture.deleteMany({
            where: { id: { in: lecturesToDelete } },
          });
        }

        const syncedLectures = [];

        for (let lIndex = 0; lIndex < incomingLectures.length; lIndex++) {
          const lec = incomingLectures[lIndex];
          const isNewLecture = lec.id.startsWith('new-lec-');

          let lecture;
          const lecData = {
            title: lec.title,
            videoUrl: lec.videoUrl || 'https://res.cloudinary.com/demo/video/upload/q_auto/cld_sample_video.mp4',
            duration: parseInt(lec.duration) || 0,
            sortOrder: lIndex + 1,
            sectionId,
          };

          if (isNewLecture) {
            lecture = await tx.lecture.create({
              data: lecData,
            });
          } else {
            lecture = await tx.lecture.update({
              where: { id: lec.id },
              data: {
                title: lecData.title,
                videoUrl: lecData.videoUrl,
                duration: lecData.duration,
                sortOrder: lecData.sortOrder,
                sectionId, // Ensure it maps to the current section (handles movement)
              },
            });
          }
          syncedLectures.push(lecture);
        }

        createdOrUpdatedSections.push({
          ...section,
          lectures: syncedLectures,
        });
      }

      return createdOrUpdatedSections;
    });

    return NextResponse.json({ message: 'Curriculum updated successfully', sections: result });
  } catch (error) {
    console.error('Sync curriculum error:', error);
    return NextResponse.json({ error: 'Failed to update curriculum' }, { status: 500 });
  }
}
