import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const certId = searchParams.get('id');

    if (!certId) {
      return NextResponse.json({ error: 'Verification ID is required' }, { status: 400 });
    }

    // Clean up input and check format: US-CERT-XXXXXXXX-YYYY
    const cleanId = certId.trim().toUpperCase();

    // Support temporary preview certificates for admins/instructors
    if (cleanId === 'US-CERT-PREVIEW-TEMP') {
      return NextResponse.json({
        success: true,
        studentName: 'Demo Student',
        courseTitle: 'Demo Course Title',
        issueDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        verificationId: 'US-CERT-PREVIEW-TEMP',
        isPreview: true,
      });
    }

    const match = cleanId.match(/^US-CERT-([0-9A-F]{8})-([0-9A-F]{4})$/);

    if (!match) {
      return NextResponse.json({ error: 'Invalid Certificate Verification ID format.' }, { status: 400 });
    }

    const enrollmentPrefix = match[1].toLowerCase();
    
    // Find the enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: {
          startsWith: enrollmentPrefix,
        },
      },
      include: {
        student: {
          select: { name: true },
        },
        course: {
          include: {
            sections: {
              include: {
                lectures: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'Certificate not found or invalid ID.' }, { status: 404 });
    }

    // Recalculate progress to verify completion eligibility (>= 90%)
    const lectureIds = enrollment.course.sections.flatMap((section) => 
      section.lectures.map((lecture) => lecture.id)
    );
    const totalLectures = lectureIds.length;

    const completedProgress = await prisma.progress.findMany({
      where: {
        studentId: enrollment.studentId,
        completed: true,
        lectureId: { in: lectureIds },
      },
    });

    const completedCount = completedProgress.length;
    const percentCompleted = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;

    if (percentCompleted < 90) {
      return NextResponse.json({ error: 'Certificate locked. Course criteria not met.' }, { status: 400 });
    }

    const issueDate = new Date(enrollment.joinedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return NextResponse.json({
      success: true,
      studentName: enrollment.student.name,
      courseTitle: enrollment.course.title,
      issueDate,
      verificationId: cleanId,
    });
  } catch (error) {
    console.error('Verification API error:', error);
    return NextResponse.json({ error: 'Internal server error during verification' }, { status: 500 });
  }
}
