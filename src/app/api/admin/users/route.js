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

// PUT: Update a user's role
export async function PUT(request) {
  try {
    const adminSession = await verifyAdmin();
    if (!adminSession) {
      return NextResponse.json({ error: 'Forbidden. Admin credentials required.' }, { status: 403 });
    }

    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json({ error: 'User ID and Role are required.' }, { status: 400 });
    }

    if (!['STUDENT', 'INSTRUCTOR', 'ADMIN', 'TESTER'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be STUDENT, INSTRUCTOR, ADMIN, or TESTER.' }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 444 });
    }

    // Prevent changing own role
    if (user.id === adminSession.user.id) {
      return NextResponse.json({ error: 'You cannot change your own role.' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User role updated successfully!',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json({ error: 'Failed to update user role.' }, { status: 500 });
  }
}

// DELETE: Delete a user account (with cascade deletes)
export async function DELETE(request) {
  try {
    const adminSession = await verifyAdmin();
    if (!adminSession) {
      return NextResponse.json({ error: 'Forbidden. Admin credentials required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 444 });
    }

    // Prevent deleting own account
    if (user.id === adminSession.user.id) {
      return NextResponse.json({ error: 'You cannot delete your own admin account.' }, { status: 400 });
    }

    // Delete the user (Prisma cascade delete will handle enrollments, submissions etc.)
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: 'User account deleted successfully!',
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user account.' }, { status: 500 });
  }
}
