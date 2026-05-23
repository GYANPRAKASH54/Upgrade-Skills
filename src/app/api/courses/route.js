import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET: Fetch all published courses (or search courses)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const instructorId = searchParams.get('instructorId') || '';

    const where = {};

    // For public catalog, show only published. Instructors can see their own published/unpublished
    if (!instructorId) {
      where.published = true;
    } else {
      where.instructorId = instructorId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { subtitle: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        instructor: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(courses);
  } catch (error) {
    console.error('Fetch courses error:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

// POST: Create a new course (Instructor/Admin only)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'INSTRUCTOR' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized. Instructors only.' }, { status: 403 });
    }

    const { title, subtitle, description, price, thumbnail } = await request.json();

    if (!title || !price) {
      return NextResponse.json({ error: 'Title and Price are required' }, { status: 400 });
    }

    const course = await prisma.course.create({
      data: {
        title,
        subtitle: subtitle || '',
        description: description || '',
        price: parseFloat(price),
        thumbnail: thumbnail || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=60',
        instructorId: session.user.id,
        published: false, // Start unpublished
      },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error('Create course error:', error);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
