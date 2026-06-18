import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { notifyStudentsOfNewEvent } from '@/lib/notifications';

async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return null;
  }
  return session;
}

// POST: Create a new competition
export async function POST(request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden. Admin credentials required.' }, { status: 403 });
    }

    const { title, description, image, rules, startDate, endDate, status } = await request.json();

    if (!title || !startDate || !endDate) {
      return NextResponse.json({ error: 'Competition Title, Start Date, and End Date are required.' }, { status: 400 });
    }

    // Create the competition
    const competition = await prisma.competition.create({
      data: {
        title,
        description: description || '',
        image: image || 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800',
        rules: rules || '',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status || 'REGISTRATIONS_OPEN',
      },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });

    // Trigger student email notifications
    await notifyStudentsOfNewEvent(competition);

    return NextResponse.json({
      success: true,
      message: 'Competition created successfully!',
      competition,
    }, { status: 201 });
  } catch (error) {
    console.error('Admin create competition error:', error);
    return NextResponse.json({ error: 'Failed to create competition.' }, { status: 500 });
  }
}

// DELETE: Delete a competition
export async function DELETE(request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden. Admin credentials required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Competition ID is required.' }, { status: 400 });
    }

    // Verify competition exists
    const competition = await prisma.competition.findUnique({
      where: { id },
    });

    if (!competition) {
      return NextResponse.json({ error: 'Competition not found.' }, { status: 404 });
    }

    // Delete the competition (submissions will cascade delete)
    await prisma.competition.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Competition deleted successfully!',
    });
  } catch (error) {
    console.error('Admin delete competition error:', error);
    return NextResponse.json({ error: 'Failed to delete competition.' }, { status: 500 });
  }
}

// PUT: Update competition status
export async function PUT(request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden. Admin credentials required.' }, { status: 403 });
    }

    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'Competition ID and Status are required.' }, { status: 400 });
    }

    const competition = await prisma.competition.update({
      where: { id },
      data: { status },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });

    return NextResponse.json({ success: true, competition });
  } catch (error) {
    console.error('Admin update competition status error:', error);
    return NextResponse.json({ error: 'Failed to update competition status.' }, { status: 500 });
  }
}
