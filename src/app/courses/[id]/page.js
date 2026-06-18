import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Star, Shield, Award, Users, BookOpen } from 'lucide-react';
import dynamic from 'next/dynamic';

const CurriculumAccordion = dynamic(() => import('./CurriculumAccordion'), {
  loading: () => <div style={{ minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading course curriculum...</div>,
});
const CourseSidebarCard = dynamic(() => import('./CourseSidebarCard'), {
  loading: () => <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading checkout options...</div>,
});
import styles from './CourseDetail.module.css';

export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    select: { title: true, subtitle: true }
  });
  return {
    title: course ? course.title : 'Course Details',
    description: course ? course.subtitle : 'Explore course content.'
  };
}

export default async function CourseDetailPage({ params }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  // Fetch course details directly from database
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      instructor: {
        select: {
          name: true,
          email: true,
          headline: true,
        },
      },
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

  // Check enrollment
  let isEnrolled = false;
  if (session) {
    if (session.user.role === 'ADMIN' || course.instructorId === session.user.id) {
      isEnrolled = true;
    } else {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: session.user.id,
            courseId: id,
          },
        },
      });
      isEnrolled = !!enrollment;
    }
  }

  // Calculate lecture counts
  const totalLecturesCount = course.sections.reduce((acc, sec) => acc + sec.lectures.length, 0);

  return (
    <div>
      {/* 1. Header Banner */}
      <section className={styles.headerSection}>
        <div className={`${styles.headerGrid} container`}>
          <div>
            <div className={styles.badgeList}>
              <span className="badge badge-primary">Top Seller</span>
              <span className="badge badge-accent">Best Rated</span>
            </div>
            <h1 className={styles.title}>{course.title}</h1>
            <p className={styles.subtitle}>{course.subtitle}</p>

            <div className={styles.metaRow}>
              <div className={styles.ratingCol}>
                <Star size={16} fill="var(--accent)" />
                <span>4.9 (4,281 ratings)</span>
              </div>
              <div>12,940 students enrolled</div>
              <div>Created by {course.instructor.name}</div>
            </div>
          </div>
          <div style={{ display: 'none' }}>{/* Handled by floating card on Desktop */}</div>
        </div>
      </section>

      {/* 2. Main Content Grid */}
      <section className="container">
        <div className={styles.layout}>
          {/* Left Column (Details / Accordion) */}
          <div className={styles.mainContent}>
            {/* What you'll learn */}
            <div className={`${styles.sectionBlock} glass-card`} style={{ padding: '30px', hover: 'none' }}>
              <h3 className={styles.blockTitle}>What you'll learn</h3>
              <ul style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '14px', marginTop: '10px' }}>
                <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Shield size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
                  <span>Build complete practical projects matching real-world demands.</span>
                </li>
                <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Shield size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
                  <span>Understand architecture and production databases (Prisma + SQLite).</span>
                </li>
                <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Shield size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
                  <span>Configure Google OAuth, custom credentials signup, and session controls.</span>
                </li>
                <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Shield size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
                  <span>Draft startup materials with guidelines from IIT/IIM mentors.</span>
                </li>
              </ul>
            </div>

            {/* Course Description */}
            <div className={styles.sectionBlock}>
              <h3 className={styles.blockTitle}>Course Description</h3>
              <p className={styles.description}>{course.description}</p>
            </div>

            {/* Curriculum */}
            <div className={styles.sectionBlock}>
              <h3 className={styles.blockTitle}>Course Curriculum</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                <span>{course.sections.length} sections • {totalLecturesCount} lectures</span>
              </div>
              <CurriculumAccordion sections={course.sections} isEnrolled={isEnrolled} courseId={course.id} />
            </div>

            {/* Instructor Details */}
            <div className={styles.sectionBlock}>
              <h3 className={styles.blockTitle}>Your Instructor</h3>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '10px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '24px' }}>
                  {course.instructor.name[0]}
                </div>
                <div>
                  <h4 style={{ fontSize: '18px', fontWeight: '700' }}>{course.instructor.name}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '600' }}>{course.instructor.headline || 'Industry Veteran & Academic Expert'}</p>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>{course.instructor.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Floating sidebar checkout card) */}
          <div>
            <CourseSidebarCard course={course} isEnrolled={isEnrolled} />
          </div>
        </div>
      </section>
    </div>
  );
}
