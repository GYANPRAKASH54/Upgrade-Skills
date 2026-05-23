import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import ClassroomClient from './ClassroomClient';

export const revalidate = 0;

export default async function ClassroomPage({ params }) {
  const { id: courseId } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(`/auth/signin?callbackUrl=/classroom/${courseId}`);
  }

  // 1. Fetch course details
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
    redirect('/courses');
  }

  // 2. Verify enrollment security guard (Admin or Instructor of course bypassed)
  let isAuthorized = false;

  if (session.user.role === 'ADMIN' || course.instructorId === session.user.id) {
    isAuthorized = true;
  } else {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: session.user.id,
          courseId,
        },
      },
    });
    isAuthorized = !!enrollment;
  }

  if (!isAuthorized) {
    // If not enrolled, redirect back to course landing details page to purchase!
    redirect(`/courses/${courseId}?error=NotEnrolled`);
  }

  // 3. Fetch completed progress list
  const progressList = await prisma.progress.findMany({
    where: {
      studentId: session.user.id,
      completed: true,
      lecture: {
        section: {
          courseId,
        },
      },
    },
    select: {
      lectureId: true,
    },
  });

  const completedLectureIds = progressList.map((p) => p.lectureId);

  return <ClassroomClient course={course} initialProgress={completedLectureIds} currentUser={session.user} />;
}
