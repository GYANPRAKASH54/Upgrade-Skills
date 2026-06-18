import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return null;
  }
  return session;
}

export async function GET(request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden. Admin credentials required.' }, { status: 403 });
    }

    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true, name: true, email: true, role: true }
    });

    const dbUrl = process.env.DATABASE_URL || '';
    const redactedDbUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');

    return NextResponse.json({
      success: true,
      databaseUrl: redactedDbUrl,
      studentsCount: students.length,
      students,
    });
  } catch (error) {
    console.error('DB diagnostics error:', error);
    return NextResponse.json({ error: error.message || 'Diagnostics failed' }, { status: 500 });
  }
}
