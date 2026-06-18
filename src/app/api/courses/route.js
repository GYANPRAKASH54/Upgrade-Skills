import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Simple in-memory cache for course queries to handle high concurrency/load tests
const COURSE_CACHE = new Map();
const CACHE_TTL = 10000; // 10 seconds cache duration
const ACTIVE_PROMISES = new Map(); // Request collapsing (single-flight) database queries

// GET: Fetch all published courses (or search courses)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const instructorId = searchParams.get('instructorId') || '';

    const cacheKey = JSON.stringify({ search, category, instructorId });
    const cached = COURSE_CACHE.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      return NextResponse.json(cached.data);
    }

    // Collapse concurrent identical requests to a single database query
    let activePromise = ACTIVE_PROMISES.get(cacheKey);
    if (activePromise) {
      const courses = await activePromise;
      return NextResponse.json(courses);
    }

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

    activePromise = prisma.course.findMany({
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

    ACTIVE_PROMISES.set(cacheKey, activePromise);

    try {
      const courses = await activePromise;

      // Store in cache
      COURSE_CACHE.set(cacheKey, {
        data: courses,
        timestamp: Date.now(),
      });

      return NextResponse.json(courses);
    } finally {
      ACTIVE_PROMISES.delete(cacheKey);
    }
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

    // Clear cache to reflect updates
    COURSE_CACHE.clear();

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error('Create course error:', error);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
