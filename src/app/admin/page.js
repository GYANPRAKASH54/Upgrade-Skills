import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import AdminDashboardClient from './AdminDashboardClient';
import styles from './Admin.module.css';

export const revalidate = 0;

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  // 1. Role Security Check
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/auth/signin?callbackUrl=/admin');
  }

  // 2. Fetch All Users in the database
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  });

  // 3. Fetch Courses with their enrollment count & instructor details
  const courses = await prisma.course.findMany({
    include: {
      instructor: {
        select: { name: true },
      },
      _count: {
        select: { enrollments: true },
      },
    },
    orderBy: { title: 'asc' },
  });

  // 4. Fetch Enrollments with student and course titles
  const enrollments = await prisma.enrollment.findMany({
    include: {
      student: {
        select: { name: true, email: true },
      },
      course: {
        select: { title: true },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  // 5. Fetch Student Q&A Questions with student, lecture, and course titles
  const questions = await prisma.question.findMany({
    include: {
      student: {
        select: { name: true, email: true },
      },
      lecture: {
        select: {
          id: true,
          title: true,
          section: {
            select: {
              course: {
                select: { 
                  id: true,
                  title: true 
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 5.5 Fetch InnoTechXperience Competitions
  const competitions = await prisma.competition.findMany({
    include: {
      _count: {
        select: { submissions: true },
      },
    },
    orderBy: { endDate: 'asc' },
  });

  // 6. Aggregate metrics
  const totalUsers = users.length;
  const totalCourses = courses.length;
  const totalEnrollments = enrollments.length;
  
  // Calculate total revenue across all course purchases
  const totalRevenue = courses.reduce((acc, course) => {
    const purchaseCount = course._count?.enrollments || 0;
    return acc + (purchaseCount * course.price);
  }, 0);

  return (
    <div>
      {/* Page Header banner */}
      <section className={styles.dashboardHeader}>
        <div className="container">
          <h1 className={styles.title}>Admin Panel</h1>
          <p className={styles.subtitle}>
            Review site analytics, manage users & roles, moderate Q&A boards, add courses, and customize database access rights.
          </p>
        </div>
      </section>

      {/* Main Panel Content */}
      <main className="container">
        <AdminDashboardClient 
          initialCourses={courses} 
          initialEnrollments={enrollments} 
          initialUsers={users}
          initialQuestions={questions}
          initialCompetitions={competitions}
          stats={{
            totalUsers,
            totalCourses,
            totalEnrollments,
            totalRevenue,
          }}
        />
      </main>
    </div>
  );
}
