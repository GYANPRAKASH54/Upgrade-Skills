import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { notifyStudentsOfNewCourse } from '@/lib/notifications';

// GET: Fetch a single course with curriculum (sections & lectures)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lectures: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Check authorization/enrollment to decide if we expose video URLs
    let canAccessVideos = false;

    if (session) {
      // 1. Is user the instructor or admin?
      if (session.user.role === 'ADMIN' || course.instructorId === session.user.id) {
        canAccessVideos = true;
      } else {
        // 2. Is user enrolled in this course?
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            studentId_courseId: {
              studentId: session.user.id,
              courseId: id,
            },
          },
        });
        if (enrollment) {
          canAccessVideos = true;
        }
      }
    }

    // If not authorized to watch, redact video URLs (protecting video content)
    if (!canAccessVideos) {
      course.sections = course.sections.map((section) => ({
        ...section,
        lectures: section.lectures.map((lecture) => ({
          id: lecture.id,
          title: lecture.title,
          duration: lecture.duration,
          sortOrder: lecture.sortOrder,
          videoUrl: '', // Redacted
        })),
      }));
    }

    return NextResponse.json({
      course,
      isEnrolled: canAccessVideos && session?.user?.role !== 'ADMIN' && course.instructorId !== session?.user?.id,
    });
  } catch (error) {
    console.error('Fetch course detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch course details' }, { status: 500 });
  }
}

// PUT: Update course details, or add section/lecture (Instructor/Admin only)
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    const course = await prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (!session || (session.user.role !== 'ADMIN' && course.instructorId !== session.user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { title, subtitle, description, price, thumbnail, published } = body;

    const updatedCourse = await prisma.course.update({
      where: { id },
      data: {
        title: title !== undefined ? title : course.title,
        subtitle: subtitle !== undefined ? subtitle : course.subtitle,
        description: description !== undefined ? description : course.description,
        price: price !== undefined ? parseFloat(price) : course.price,
        thumbnail: thumbnail !== undefined ? thumbnail : course.thumbnail,
        published: published !== undefined ? published : course.published,
      },
    });

    // If course transitioned from unpublished (draft/private) to published, notify students
    if (!course.published && updatedCourse.published) {
      await notifyStudentsOfNewCourse(updatedCourse);
    }

    return NextResponse.json(updatedCourse);
  } catch (error) {
    console.error('Update course error:', error);
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
  }
}

// DELETE: Delete a course (Instructor/Admin only)
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    const course = await prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (!session || (session.user.role !== 'ADMIN' && course.instructorId !== session.user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.course.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}
