import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET: Fetch all competitions
export async function GET(request) {
  try {
    const competitions = await prisma.competition.findMany({
      include: {
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: {
        endDate: 'asc',
      },
    });

    return NextResponse.json(competitions);
  } catch (error) {
    console.error('Fetch competitions error:', error);
    return NextResponse.json({ error: 'Failed to fetch competitions' }, { status: 500 });
  }
}

// POST: Submit project to a competition (Student only)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { competitionId, projectTitle, description, projectLink, imageUrl } = body;

    if (!competitionId || !projectTitle || !projectLink) {
      return NextResponse.json({ error: 'Competition ID, project title, and link are required' }, { status: 400 });
    }

    // Check if competition exists and is active
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
    });

    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    }

    const now = new Date();
    if (now < new Date(competition.startDate) || now > new Date(competition.endDate)) {
      return NextResponse.json({ error: 'This competition is not active for submissions' }, { status: 400 });
    }

    // Upsert submission (a user can have at most one submission per competition)
    const submission = await prisma.submission.upsert({
      where: {
        competitionId_studentId: {
          competitionId,
          studentId: session.user.id,
        },
      },
      update: {
        projectTitle,
        description: description || '',
        projectLink,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60',
        createdAt: new Date(),
      },
      create: {
        competitionId,
        studentId: session.user.id,
        projectTitle,
        description: description || '',
        projectLink,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60',
      },
    });

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error('Submit project error:', error);
    return NextResponse.json({ error: 'Failed to submit project' }, { status: 500 });
  }
}
