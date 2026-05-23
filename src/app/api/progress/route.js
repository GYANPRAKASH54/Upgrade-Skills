import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET: Fetch user's completed lectures for a course
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    // Get all progress for this student in lectures belonging to this course
    const progressList = await prisma.progress.findMany({
      where: {
        studentId: session.user.id,
        lecture: {
          section: {
            courseId,
          },
        },
      },
      include: {
        lecture: {
          select: { id: true },
        },
      },
    });

    // Filter to only completed ones
    const completedLectureIds = progressList
      .filter((p) => p.completed)
      .map((p) => p.lectureId);

    return NextResponse.json({ completedLectureIds });
  } catch (error) {
    console.error('Fetch progress error:', error);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}

// POST: Toggle lecture progress (complete / incomplete) or track watch time
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lectureId, completed, watchTimeIncrement } = await request.json();

    if (!lectureId) {
      return NextResponse.json({ error: 'Lecture ID is required' }, { status: 400 });
    }

    // Fetch the lecture and its duration
    const lecture = await prisma.lecture.findUnique({
      where: { id: lectureId },
    });

    if (!lecture) {
      return NextResponse.json({ error: 'Lecture not found' }, { status: 404 });
    }

    const isStaff = session.user.role === 'ADMIN' || session.user.role === 'INSTRUCTOR';

    if (isStaff && completed !== undefined) {
      // Staff members can manually toggle completion for testing
      const shouldComplete = completed === true;
      const progress = await prisma.progress.upsert({
        where: {
          studentId_lectureId: {
            studentId: session.user.id,
            lectureId,
          },
        },
        update: {
          completed: shouldComplete,
        },
        create: {
          studentId: session.user.id,
          lectureId,
          completed: shouldComplete,
          watchTime: shouldComplete ? Math.round(lecture.duration * 0.7) : 0,
        },
      });
      return NextResponse.json({ success: true, progress });
    } else {
      // Standard student progress tracking
      const increment = watchTimeIncrement ? Math.min(Math.max(0, parseInt(watchTimeIncrement)), 10) : 0;

      // Find existing progress
      const existingProgress = await prisma.progress.findUnique({
        where: {
          studentId_lectureId: {
            studentId: session.user.id,
            lectureId,
          },
        },
      });

      const newWatchTime = (existingProgress?.watchTime || 0) + increment;
      
      // Complete lecture if watchTime is >= 70% of duration (or fallback 10s if duration is 0)
      const targetDuration = lecture.duration > 0 ? lecture.duration : 10;
      const threshold = Math.round(targetDuration * 0.7);
      
      const shouldComplete = existingProgress?.completed || newWatchTime >= threshold;

      const progress = await prisma.progress.upsert({
        where: {
          studentId_lectureId: {
            studentId: session.user.id,
            lectureId,
          },
        },
        update: {
          watchTime: newWatchTime,
          completed: shouldComplete,
        },
        create: {
          studentId: session.user.id,
          lectureId,
          watchTime: newWatchTime,
          completed: shouldComplete,
        },
      });

      return NextResponse.json({ success: true, progress });
    }
  } catch (error) {
    console.error('Save progress error:', error);
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
  }
}
