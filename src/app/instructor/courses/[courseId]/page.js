import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import dynamic from 'next/dynamic';

const CourseEditorClient = dynamic(() => import('./CourseEditorClient'), {
  loading: () => (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-muted)'
    }}>
      <div className="loadingDot" style={{ width: '20px', height: '20px', backgroundColor: 'var(--primary)', borderRadius: '50%' }}></div>
      <span style={{ marginTop: '12px', fontWeight: '700' }}>Loading curriculum editor...</span>
    </div>
  )
});

export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { courseId } = await params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { title: true }
  });
  return {
    title: course ? `Edit: ${course.title}` : 'Edit Course'
  };
}

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
