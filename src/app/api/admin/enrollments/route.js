import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// MIDDLEWARE SECURITY GUARD: Helper to verify admin status
async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return null;
  }
  return session;
}

// POST: Manually enroll a student in a course
export async function POST(request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden. Admin credentials required.' }, { status: 403 });
    }

    const { studentId, courseId } = await request.json();

    if (!studentId || !courseId) {
      return NextResponse.json({ error: 'Student ID and Course ID are required.' }, { status: 400 });
    }

    // Check if student already enrolled
    const existing = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: { studentId, courseId },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Student is already enrolled in this course.' }, { status: 400 });
    }

    // Create the manual enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        courseId,
      },
      include: {
        student: {
          select: { name: true, email: true },
        },
        course: {
          select: { title: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Access granted successfully!',
      enrollment,
    }, { status: 201 });
  } catch (error) {
    console.error('Admin manual enroll error:', error);
    return NextResponse.json({ error: 'Failed to grant course access.' }, { status: 500 });
  }
}

// PUT: Reset student course progress
export async function PUT(request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden. Admin credentials required.' }, { status: 403 });
    }

    const { enrollmentId, resetType } = await request.json(); // resetType: 'test' or 'all'

    if (!enrollmentId) {
      return NextResponse.json({ error: 'Enrollment ID is required.' }, { status: 400 });
    }

    // Verify existence of enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment record not found.' }, { status: 404 });
    }

    let updatedEnrollment;
    if (resetType === 'test') {
      // 1. Reset ONLY enrollment certificate & quiz completion stats (preserving watch logs)
      updatedEnrollment = await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          completed: false,
          quizScore: null,
          quizPassed: false,
          quizAttempts: 0,
          lastAttemptAt: null,
        },
        include: {
          student: {
            select: { name: true, email: true },
          },
          course: {
            select: { title: true, price: true },
          },
        },
      });
    } else {
      // 1. Delete all watch progress for this student in this course
      await prisma.progress.deleteMany({
        where: {
          studentId: enrollment.studentId,
          lecture: {
            section: {
              courseId: enrollment.courseId,
            },
          },
        },
      });

      // 2. Reset enrollment certificate & quiz completion stats
      updatedEnrollment = await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          completed: false,
          quizScore: null,
          quizPassed: false,
          quizAttempts: 0,
          lastAttemptAt: null,
        },
        include: {
          student: {
            select: { name: true, email: true },
          },
          course: {
            select: { title: true, price: true },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: resetType === 'test' ? 'Student exam attempts reset successfully!' : 'Student progress reset successfully!',
      enrollment: updatedEnrollment,
    });
  } catch (error) {
    console.error('Admin reset progress error:', error);
    return NextResponse.json({ error: 'Failed to reset student progress.' }, { status: 500 });
  }
}

// DELETE: Manually revoke student enrollment (remove access)
export async function DELETE(request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden. Admin credentials required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const enrollmentId = searchParams.get('id');

    if (!enrollmentId) {
      return NextResponse.json({ error: 'Enrollment ID is required.' }, { status: 400 });
    }

    // Verify existence of enrollment first
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment record not found.' }, { status: 444 });
    }

    // Delete enrollment
    await prisma.enrollment.delete({
      where: { id: enrollmentId },
    });

    return NextResponse.json({
      success: true,
      message: 'Access revoked successfully!',
    });
  } catch (error) {
    console.error('Admin revoke enrollment error:', error);
    return NextResponse.json({ error: 'Failed to revoke course access.' }, { status: 500 });
  }
}
