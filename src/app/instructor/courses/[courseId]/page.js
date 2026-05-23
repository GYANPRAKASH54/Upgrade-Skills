import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import CourseEditorClient from './CourseEditorClient';

export const revalidate = 0;

export default async function CourseEditorPage({ params }) {
  const { courseId } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin?callbackUrl=/instructor');
  }

  // Fetch course details, with sections and lectures sorted by sortOrder
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sections: {
        orderBy: { sortOrder: 'asc' },
        include: {
          lectures: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  });

  if (!course) {
    notFound();
  }

  // Security guard check
  if (session.user.role !== 'ADMIN' && course.instructorId !== session.user.id) {
    redirect('/auth/signin?error=AccessDenied');
  }

  return <CourseEditorClient course={course} />;
}
