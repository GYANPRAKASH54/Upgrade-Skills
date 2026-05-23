import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET: Fetch questions for a specific lecture index
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lectureId = searchParams.get('lectureId');

    if (!lectureId) {
      return NextResponse.json({ error: 'Lecture ID is required.' }, { status: 400 });
    }

    const questions = await prisma.question.findMany({
      where: { lectureId },
      include: {
        student: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      questions,
    });
  } catch (error) {
    console.error('Fetch questions error:', error);
    return NextResponse.json({ error: 'Failed to load lecture questions.' }, { status: 500 });
  }
}

// POST: Post a new student question
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const { content, lectureId, parentId } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Question content cannot be empty.' }, { status: 400 });
    }

    if (!lectureId) {
      return NextResponse.json({ error: 'Lecture ID is required.' }, { status: 400 });
    }

    // Verify lecture exists
    const lecture = await prisma.lecture.findUnique({
      where: { id: lectureId },
    });

    if (!lecture) {
      return NextResponse.json({ error: 'Selected lecture index does not exist.' }, { status: 444 });
    }

    // Verify parent question exists if parentId is provided
    if (parentId) {
      const parentQuestion = await prisma.question.findUnique({
        where: { id: parentId },
      });
      if (!parentQuestion) {
        return NextResponse.json({ error: 'Parent question does not exist.' }, { status: 400 });
      }
    }

    // Create the Q&A question log entry
    const newQuestion = await prisma.question.create({
      data: {
        content: content.trim(),
        studentId: session.user.id,
        lectureId,
        parentId: parentId || null,
      },
      include: {
        student: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Question posted successfully!',
      question: newQuestion,
    }, { status: 201 });
  } catch (error) {
    console.error('Post question error:', error);
    return NextResponse.json({ error: 'Failed to post question.' }, { status: 500 });
  }
}
