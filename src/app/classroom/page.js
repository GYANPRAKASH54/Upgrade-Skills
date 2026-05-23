import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { BookOpen, CheckCircle2, Award, ArrowRight, PlayCircle } from 'lucide-react';
import styles from './ClassroomList.module.css';

export const revalidate = 0;

export default async function ClassroomListPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin?callbackUrl=/classroom');
  }

  // 1. Fetch user's enrollments with course details, sections, and lectures
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: session.user.id },
    include: {
      course: {
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
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  // 2. Fetch all completed progress items for this student
  const progressList = await prisma.progress.findMany({
    where: {
      studentId: session.user.id,
      completed: true,
    },
    select: {
      lectureId: true,
    },
  });

  const completedLectureIdsSet = new Set(progressList.map((p) => p.lectureId));

  // 3. Process enrollment details and calculate progress
  let totalLecturesAcrossCourses = 0;
  let totalCompletedLecturesAcrossCourses = 0;
  let completedCoursesCount = 0;

  const coursesWithProgress = enrollments.map((enrollment) => {
    const { course } = enrollment;
    
    // Gather all lecture IDs in this course
    const lectureIds = course.sections.flatMap((section) => 
      section.lectures.map((lecture) => lecture.id)
    );

    const totalLectures = lectureIds.length;
    const completedLecturesCount = lectureIds.filter((id) => 
      completedLectureIdsSet.has(id)
    ).length;

    const percent = totalLectures > 0 ? Math.round((completedLecturesCount / totalLectures) * 100) : 0;
    const isFinished = percent >= 90 && totalLectures > 0;

    totalLecturesAcrossCourses += totalLectures;
    totalCompletedLecturesAcrossCourses += completedLecturesCount;
    if (isFinished) {
      completedCoursesCount++;
    }

    return {
      id: course.id,
      title: course.title,
      subtitle: course.subtitle,
      thumbnail: course.thumbnail,
      instructorName: course.instructor.name,
      totalLectures,
      completedLecturesCount,
      percent,
      isFinished,
    };
  });

  return (
    <div>
      {/* Page Header */}
      <section className={styles.pageHeader}>
        <div className="container">
          <h1 className={styles.title}>My Learning</h1>
          <p className={styles.description}>
            Track your progress, watch lectures, and gain hands-on skills.
          </p>
        </div>
      </section>

      <main className="container">
        {coursesWithProgress.length > 0 ? (
          <>
            {/* Quick Stats Block */}
            <div className={styles.statsGrid}>
              <div className={`${styles.statCard} glass-card`}>
                <div className={styles.statIcon}>
                  <BookOpen size={24} />
                </div>
                <div>
                  <div className={styles.statValue}>{coursesWithProgress.length}</div>
                  <div className={styles.statLabel}>Enrolled Courses</div>
                </div>
              </div>
              <div className={`${styles.statCard} glass-card`}>
                <div className={styles.statIconAccent}>
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <div className={styles.statValue}>
                    {totalCompletedLecturesAcrossCourses} / {totalLecturesAcrossCourses}
                  </div>
                  <div className={styles.statLabel}>Lectures Completed</div>
                </div>
              </div>
              <div className={`${styles.statCard} glass-card`}>
                <div className={styles.statIcon}>
                  <Award size={24} style={{ color: 'var(--secondary)' }} />
                </div>
                <div>
                  <div className={styles.statValue}>{completedCoursesCount}</div>
                  <div className={styles.statLabel}>Completed Courses</div>
                </div>
              </div>
            </div>

            {/* Courses Grid */}
            <div className={styles.grid}>
              {coursesWithProgress.map((course) => (
                <div key={course.id} className={`${styles.courseCard} glass-card`}>
                  <div className={styles.thumbnailWrapper}>
                    <img 
                      src={course.thumbnail} 
                      alt={course.title} 
                      className={styles.thumbnail} 
                    />
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.courseTitle}>{course.title}</h3>
                    <div className={styles.instructor}>By {course.instructorName}</div>
                    
                    <div className={styles.progressContainer}>
                      <div className={styles.progressLabel}>
                        <span>Progress</span>
                        <span>{course.percent}%</span>
                      </div>
                      <div className={styles.progressBarTrack}>
                        <div 
                          className={styles.progressBarFill} 
                          style={{ width: `${course.percent}%` }}
                        />
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {course.completedLecturesCount} of {course.totalLectures} lectures
                      </div>
                    </div>

                    <div className={styles.cardFooter}>
                      {course.isFinished ? (
                        <Link 
                          href={`/classroom/${course.id}/certificate`} 
                          target="_blank"
                          className="btn-secondary" 
                          style={{ 
                            padding: '6px 10px', 
                            fontSize: '11px', 
                            borderColor: 'var(--accent)', 
                            color: 'var(--accent)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Award size={12} /> Certificate
                        </Link>
                      ) : (
                        <div />
                      )}
                      <Link 
                        href={`/classroom/${course.id}`} 
                        className="btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        {course.percent > 0 ? 'Resume' : 'Start'} <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Empty State */
          <div className={`${styles.emptyState} glass-card`}>
            <PlayCircle size={64} style={{ color: 'var(--text-muted)' }} />
            <h2 style={{ fontSize: '20px', fontWeight: '800' }}>No Enrolled Courses</h2>
            <p style={{ maxWidth: '400px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              You haven't enrolled in any courses yet. Explore our curated library of business plans, coding tutorials, and tech workshops.
            </p>
            <Link 
              href="/courses" 
              className="btn-primary" 
              style={{ marginTop: '10px', padding: '10px 20px' }}
            >
              Browse Courses
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
