import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import QuizClient from './QuizClient';

export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { id: courseId } = await params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { title: true }
  });
  return {
    title: course ? `Final Exam - ${course.title}` : 'Final Exam'
  };
}

export default async function QuizPage({ params }) {
  const { id: courseId } = await params;
  const session = await getServerSession(authOptions);

  // 1. Session Security Check
  if (!session) {
    redirect(`/auth/signin?callbackUrl=/classroom/${courseId}/quiz`);
  }

  // 2. Fetch Course details
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sections: {
        include: {
          lectures: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!course) {
    return <div style={{ padding: '40px', color: 'white', textAlign: 'center' }}>Course not found.</div>;
  }

  // 3. Fetch Enrollment & Verify
  let enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: session.user.id,
        courseId,
      },
    },
  });

  const isAdminOrInstructor = session.user.role === 'ADMIN' || course.instructorId === session.user.id;

  // 3.5. Cooldown Auto-Reset Check (resets attempts if 12 hours have passed since last failed attempt)
  if (enrollment && !enrollment.quizPassed && enrollment.quizAttempts >= 2 && enrollment.lastAttemptAt && !isAdminOrInstructor) {
    const lastAttemptTime = new Date(enrollment.lastAttemptAt).getTime();
    const elapsed = Date.now() - lastAttemptTime;
    const twelveHours = 12 * 60 * 60 * 1000;

    if (elapsed >= twelveHours) {
      enrollment = await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          quizAttempts: 0,
          quizScore: null,
          lastAttemptAt: null,
          completed: false
        }
      });
    }
  }

  if (!enrollment && !isAdminOrInstructor) {
    return (
      <div style={{ 
        minHeight: '80vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '24px', 
        color: 'var(--text-primary)',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div className="glass-card" style={{ maxWidth: '480px', padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Not Enrolled</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            You must be enrolled in this course to take the final exam.
          </p>
          <Link href={`/courses/${courseId}`} className="btn-primary" style={{ padding: '10px 20px', fontSize: '13px', marginTop: '10px' }}>
            View Course Details
          </Link>
        </div>
      </div>
    );
  }

  // 4. Calculate Student Progress percentage
  const lectureIds = course.sections.flatMap((section) => 
    section.lectures.map((lecture) => lecture.id)
  );
  
  const totalLectures = lectureIds.length;
  let percentCompleted = 0;
  let completedCount = 0;

  if (enrollment) {
    const completedProgress = await prisma.progress.findMany({
      where: {
        studentId: session.user.id,
        completed: true,
        lectureId: { in: lectureIds },
      },
    });
    completedCount = completedProgress.length;
    percentCompleted = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;
  } else {
    // Admin / Instructor preview gets 100% completion automatically
    percentCompleted = 100;
    completedCount = totalLectures;
  }

  // 5. Enforce 90% progress threshold (skipped for admin/instructor previews)
  if (percentCompleted < 90 && !isAdminOrInstructor) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#0b0f19', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '24px', 
        color: 'white',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div className="glass-card" style={{ maxWidth: '480px', padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          <div style={{ fontSize: '48px' }}>🔒</div>
          <h2 style={{ fontSize: '22px', fontWeight: '800' }}>Exam Locked</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            You have only completed <strong>{percentCompleted}%</strong> of this course. A minimum of <strong>90% progress</strong> is required to unlock the final exam.
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            ({completedCount} of {totalLectures} lectures completed)
          </p>
          <Link href={`/classroom/${courseId}`} className="btn-primary" style={{ padding: '10px 20px', fontSize: '13px' }}>
            Resume Learning
          </Link>
        </div>
      </div>
    );
  }

  // Serialize Date properties to ISO strings for Next.js Client Component serialization safety
  const serializedEnrollment = enrollment ? {
    ...enrollment,
    joinedAt: enrollment.joinedAt?.toISOString() || null,
    lastAttemptAt: enrollment.lastAttemptAt?.toISOString() || null,
  } : null;

  return (
    <QuizClient 
      courseTitle={course.title}
      courseId={courseId}
      enrollment={serializedEnrollment}
      isStaff={isAdminOrInstructor}
    />
  );
}
