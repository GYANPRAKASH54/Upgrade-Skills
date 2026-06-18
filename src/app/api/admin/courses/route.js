import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { notifyStudentsOfNewCourse } from '@/lib/notifications';

async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return null;
  }
  return session;
}

// POST: Create a new course catalog listing
export async function POST(request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden. Admin credentials required.' }, { status: 403 });
    }

    const { title, subtitle, description, price, thumbnail, instructorId } = await request.json();

    if (!title || !instructorId) {
      return NextResponse.json({ error: 'Course Title and Instructor are required.' }, { status: 400 });
    }

    // Check if instructor exists and has appropriate role
    const instructor = await prisma.user.findUnique({
      where: { id: instructorId },
    });

    if (!instructor) {
      return NextResponse.json({ error: 'Selected instructor does not exist.' }, { status: 444 });
    }

    if (instructor.role !== 'INSTRUCTOR' && instructor.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Selected user must be an Instructor or Admin.' }, { status: 400 });
    }

    // Parse price
    const coursePrice = parseFloat(price) || 0.0;

    // Create the course listing
    const course = await prisma.course.create({
      data: {
        title,
        subtitle: subtitle || '',
        description: description || '',
        price: coursePrice,
        thumbnail: thumbnail || '/placeholder-course.jpg',
        instructorId,
        published: true, // Default to published for convenience
      },
      include: {
        instructor: {
          select: { name: true },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    // Trigger student email notifications
    await notifyStudentsOfNewCourse(course);

    return NextResponse.json({
      success: true,
      message: 'Course created successfully!',
      course,
    }, { status: 201 });
  } catch (error) {
    console.error('Admin create course error:', error);
    return NextResponse.json({ error: 'Failed to create course.' }, { status: 500 });
  }
}

// DELETE: Delete a course catalog listing (with cascade deletes)
export async function DELETE(request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden. Admin credentials required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('id');

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required.' }, { status: 400 });
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 444 });
    }

    // Delete course (will cascade delete sections, lectures, enrollments, etc.)
    await prisma.course.delete({
      where: { id: courseId },
    });

    return NextResponse.json({
      success: true,
      message: 'Course deleted successfully!',
    });
  } catch (error) {
    console.error('Admin delete course error:', error);
    return NextResponse.json({ error: 'Failed to delete course.' }, { status: 500 });
  }
}
