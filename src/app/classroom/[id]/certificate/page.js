import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import CertificateClient from './CertificateClient';

export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { id: courseId } = await params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { title: true }
  });
  return {
    title: course ? `Certificate - ${course.title}` : 'Certificate'
  };
}

export default async function CertificatePage({ params }) {
  const { id: courseId } = await params;
  const session = await getServerSession(authOptions);

  // 1. Session Security Check
  if (!session) {
    redirect(`/auth/signin?callbackUrl=/classroom/${courseId}/certificate`);
  }

  // 2. Fetch Course Details
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: {
        select: { name: true },
      },
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
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: session.user.id,
        courseId,
      },
    },
  });

  const isAdminOrInstructor = session.user.role === 'ADMIN' || course.instructorId === session.user.id;

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
            You must be enrolled in this course to view or generate a completion certificate.
          </p>
          <Link href={`/courses/${courseId}`} className="btn-primary" style={{ padding: '10px 20px', fontSize: '13px', marginTop: '10px' }}>
            View Course Details
          </Link>
        </div>
      </div>
    );
  }

  // 4. Recalculate Student Progress percentage
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

  // 5. Enforce 90% progress threshold and Quiz Completion (skipped for admin/instructor previews)
  if (!isAdminOrInstructor) {
    if (percentCompleted < 90) {
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
            <h2 style={{ fontSize: '22px', fontWeight: '800' }}>Certificate Locked</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              You have only completed <strong>{percentCompleted}%</strong> of this course. A minimum of <strong>90% progress</strong> is required to generate and claim your graduation certificate.
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

    if (!enrollment || !enrollment.quizPassed) {
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
            <div style={{ fontSize: '48px' }}>📝</div>
            <h2 style={{ fontSize: '22px', fontWeight: '800' }}>Final Exam Required</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              You have met the 90% learning criteria, but you must pass the final AI-proctored exam (score &gt;= 70%) to claim and print your completion certificate.
            </p>
            <Link href={`/classroom/${courseId}/quiz`} className="btn-primary" style={{ padding: '10px 20px', fontSize: '13px' }}>
              Take Final Exam
            </Link>
          </div>
        </div>
      );
    }
  }

  // 6. Generate Issue Date and Verification Hash
  const issueDate = enrollment
    ? new Date(enrollment.joinedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  const verificationId = enrollment
    ? `US-CERT-${enrollment.id.substring(0, 8).toUpperCase()}-${courseId.substring(0, 4).toUpperCase()}`
    : `US-CERT-PREVIEW-TEMP`;

  return (
    <CertificateClient 
      studentName={session.user.name} 
      courseTitle={course.title} 
      issueDate={issueDate} 
      verificationId={verificationId} 
      courseId={courseId} 
    />
  );
}
