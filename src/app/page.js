import Link from 'next/link';
import { prisma } from '@/lib/db';
import { BookOpen, Trophy, ArrowRight, Star, Clock } from 'lucide-react';
import styles from './Home.module.css';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

import dynamic from 'next/dynamic';

// Interactive Components (Dynamically loaded like React.lazy)
const FeaturedCoursesClient = dynamic(() => import('@/components/FeaturedCoursesClient'), {
  loading: () => <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading masterclasses...</div>,
});
const TestimonialsCarousel = dynamic(() => import('@/components/TestimonialsCarousel'), {
  loading: () => <div style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading testimonials...</div>,
});
const FAQAccordion = dynamic(() => import('@/components/FAQAccordion'), {
  loading: () => <div style={{ minHeight: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading FAQs...</div>,
});
const InnoTechCountdown = dynamic(() => import('@/components/InnoTechCountdown'), {
  loading: () => <div style={{ minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading timer...</div>,
});
import ChallengeCard from '@/app/innotechxperience/ChallengeCard';


// Turn off caching for dynamic home page updates
export const revalidate = 0;

export default async function Home() {
  const session = await getServerSession(authOptions);

  // Fetch all published courses from database
  const courses = await prisma.course.findMany({
    where: { published: true },
    include: {
      instructor: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const competitions = await prisma.competition.findMany({
    take: 3,
    include: {
      _count: {
        select: { submissions: true },
      },
    },
    orderBy: { endDate: 'asc' },
  });

  const now = new Date();

  // Find all active and upcoming competitions to determine countdown
  const activeOrUpcomingCompetitions = await prisma.competition.findMany({
    where: {
      endDate: { gt: now }
    },
    orderBy: {
      startDate: 'asc'
    }
  });

  let countdownTargetDate = null;
  let countdownLabel = 'Next Challenge Starts In:';

  // 1. Check if there is an upcoming challenge (starts in the future)
  const upcoming = activeOrUpcomingCompetitions.find(c => new Date(c.startDate) > now);
  if (upcoming) {
    countdownTargetDate = upcoming.startDate.toISOString();
    countdownLabel = 'Next Grand Challenge Starts In:';
  } else {
    // 2. Otherwise, check if there is an active challenge (ends in the future)
    const active = activeOrUpcomingCompetitions.find(c => new Date(c.startDate) <= now && new Date(c.endDate) > now);
    if (active) {
      countdownTargetDate = active.endDate.toISOString();
      countdownLabel = 'Current Challenge Ends In:';
    }
  }


  return (
    <div>
      {/* 1. Split-Hero Section in Duolingo light open style */}
      <section className={styles.newHeroContainer}>
        {/* Left Column (Headline, description, CTAs and Green Owl Mascot) */}
        <div className={styles.newHeroLeft}>
          <div className={styles.heroLeftContent}>
            <div style={{ flex: 1 }}>
              <div className="badge badge-primary animate-float" style={{ marginBottom: '14px', fontSize: '11px' }}>
                Next-Gen Learning Platform
              </div>
              <h1 className={styles.newHeroHeadline}>
                Upgrade your skills from<br />real-world experts
              </h1>
              <p className={styles.newHeroSubheadline}>
                Learn practical skills from industry veterans hailing from IIT, IIM, NIFT, Raymond, ITC, and Reliance. Build your startup plan, master full-stack coding, and win national design challenges.
              </p>
              <Link href="/courses" className="btn-primary" style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '700' }}>
                Explore Courses <ArrowRight size={16} />
              </Link>
            </div>
            <div className={styles.heroIllustrationWrapper}>
              <img 
                src="/illustrations/hero_owl.png?v=5" 
                alt="Duolingo Owl Study Mascot" 
                className={styles.heroIllustration} 
              />
            </div>
          </div>
        </div>

        {/* Right Column (Registration Widget / Welcome Back Card) */}
        <div className={styles.newHeroRight}>
          {session ? (
            <div className={styles.registrationPanel} style={{ alignItems: 'center', textAlign: 'center' }}>
              <span className={`badge ${
                session.user.role === 'ADMIN' ? 'badge-accent' : 
                session.user.role === 'INSTRUCTOR' ? 'badge-primary' : 
                'badge-success'
              }`} style={{ marginBottom: '4px' }}>
                {session.user.role === 'STUDENT' ? 'LEARNER' : session.user.role}
              </span>
              <h2 className={styles.registrationTitle} style={{ fontSize: '22px' }}>Welcome back, {session.user.name || 'Learner'}!</h2>
              <p className={styles.registrationSubtitle} style={{ marginBottom: '16px' }}>Ready to continue your masterclasses?</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                <Link 
                  href="/classroom" 
                  className="btn-primary" 
                  style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  Go to My Learning
                </Link>
                
                <Link 
                  href="/courses" 
                  className="btn-secondary" 
                  style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  Browse Catalog
                </Link>
              </div>
            </div>
          ) : (
            <div className={styles.registrationPanel}>
              <h2 className={styles.registrationTitle}>Enjoy 7 free days of Upgrade Skills</h2>
              <p className={styles.registrationSubtitle}>Sign up to access all premium classes</p>

              {/* Google Signup */}
              <Link 
                href="/auth/signup"
                className="btn-secondary" 
                style={{ width: '100%', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', textTransform: 'none', letterSpacing: '0.05em' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Sign up with Google
              </Link>

              {/* Email Signup */}
              <Link 
                href="/auth/signup" 
                className="btn-secondary"
                style={{ width: '100%', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}
              >
                Sign up with Email
              </Link>

              <Link 
                href="/auth/signin" 
                style={{ color: 'var(--secondary)', fontSize: '13px', fontWeight: '700', textAlign: 'center', marginTop: '4px', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                Continue with Email
              </Link>

              <p className={styles.finePrint}>
                By signing up you agree to the Terms of Service and Privacy Policy. Enjoy unlimited learning.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 2. Stats Section */}
      <section className={styles.statsSection}>
        <div className="container">
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>15k+</span>
              <span className={styles.statLabel}>Active Students</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>4.8</span>
              <span className={styles.statLabel}>Course Rating</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>₹10L+</span>
              <span className={styles.statLabel}>Prize Pool</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>98%</span>
              <span className={styles.statLabel}>Success Ratio</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Featured Courses Section with Student Blob Illustration */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeaderWrapper}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h2 className={styles.sectionTitle}>Featured Courses</h2>
              <p className={styles.sectionSubtitle} style={{ marginBottom: '24px' }}>Handpicked masterclasses designed to launch your professional career.</p>
              <Link href="/courses" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                Browse all <ArrowRight size={16} />
              </Link>
            </div>
            <div className={styles.sectionHeaderIllustration}>
              <img 
                src="/illustrations/student_blob.png?v=5" 
                alt="Student Blob Mascot" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
              />
            </div>
          </div>

          {/* Interactive Dynamic Filtering Courses List */}
          <FeaturedCoursesClient courses={courses} />
        </div>
      </section>

      {/* 5. InnoTechXperience Highlights with Challenge Trophy Illustration */}
      <section className={styles.innotechSection}>
        <div className="container">
          <div className={styles.sectionHeaderWrapper}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h2 className={styles.sectionTitle}>
                InnoTechXperience
              </h2>
              <p className={styles.sectionSubtitle} style={{ marginBottom: '24px' }}>National design & photography challenges. Compete, get scored, and earn verified certificates.</p>
              <Link href="/innotechxperience" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                View Challenges <ArrowRight size={16} />
              </Link>
            </div>
            <div className={styles.sectionHeaderIllustration}>
              <img 
                src="/illustrations/challenge_trophy.png?v=5" 
                alt="Trophy Mascot" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
              />
            </div>
          </div>

          {/* Live Challenge Countdown Clock */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
            <InnoTechCountdown targetDate={countdownTargetDate} label={countdownLabel} />
          </div>

          <div className={styles.grid}>
            {competitions.map((comp) => (
              <ChallengeCard key={comp.id} competition={comp} />
            ))}
          </div>

        </div>
      </section>

      {/* 6. Testimonials Carousel Section */}
      <section className={styles.section}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: '8px' }}>What Our Students Say</h2>
          <p className={styles.sectionSubtitle} style={{ marginBottom: '40px' }}>
            Real success stories from design professionals, web developers, and startup founders.
          </p>
          <TestimonialsCarousel />
        </div>
      </section>

      {/* 7. Frequently Asked Questions Section */}
      <section className={styles.section} style={{ borderTop: '2px solid var(--border-trans)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
            <p className={styles.sectionSubtitle}>
              Everything you need to know about our courses, certifications, and competitions.
            </p>
          </div>
          <FAQAccordion />
        </div>
      </section>

      {/* 8. Bottom Call-To-Action Banner */}
      <section className={styles.section} style={{ borderTop: '2px solid var(--border-trans)' }}>
        <div className="container">
          <div className={styles.ctaBanner}>
            <h2 style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'var(--font-display)' }}>Ready to Elevate Your Skillset?</h2>
            <p style={{ maxWidth: '600px', color: 'var(--text-secondary)' }}>
              Join thousands of students validating their credentials and submitting elite digital portfolio projects. Let's start learning.
            </p>
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
              {session ? (
                <Link href="/classroom" className="btn-primary" style={{ padding: '14px 28px' }}>
                  Go to Classroom
                </Link>
              ) : (
                <Link href="/auth/signup" className="btn-primary" style={{ padding: '14px 28px' }}>
                  Get Started
                </Link>
              )}
              <Link href="/courses" className="btn-secondary" style={{ padding: '14px 28px' }}>
                View Catalog
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
