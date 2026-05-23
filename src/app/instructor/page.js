import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import InstructorDashboardClient from './InstructorDashboardClient';

export const revalidate = 0;

export default async function InstructorDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin?callbackUrl=/instructor');
  }

  if (session.user.role !== 'INSTRUCTOR' && session.user.role !== 'ADMIN') {
    redirect('/auth/signin?error=AccessDenied');
  }

  // Fetch courses with enrollment counts
  // Admins can see and edit all courses on the platform, while instructors see only their own
  const coursesQuery = {
    include: {
      _count: {
        select: { enrollments: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  };

  if (session.user.role !== 'ADMIN') {
    coursesQuery.where = {
      instructorId: session.user.id,
    };
  }

  const courses = await prisma.course.findMany(coursesQuery);

  return (
    <InstructorDashboardClient 
      initialCourses={courses} 
      instructorName={session.user.name} 
    />
  );
}
