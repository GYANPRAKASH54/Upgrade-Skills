import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const competition = await prisma.competition.findUnique({
      where: { id },
      include: {
        submissions: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [
            { score: 'desc' }, // Top scoring projects first
            { createdAt: 'desc' },
          ],
        },
      },
    });

    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    }

    return NextResponse.json(competition);
  } catch (error) {
    console.error('Fetch competition detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch competition details' }, { status: 500 });
  }
}
