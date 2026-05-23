import Link from 'next/link';
import { prisma } from '@/lib/db';
import { BookOpen, Trophy, ArrowRight, Star, Clock } from 'lucide-react';
import styles from './Home.module.css';

// Interactive Components
import FeaturedCoursesClient from '@/components/FeaturedCoursesClient';
import TestimonialsCarousel from '@/components/TestimonialsCarousel';
import FAQAccordion from '@/components/FAQAccordion';
import InnoTechCountdown from '@/components/InnoTechCountdown';

// Turn off caching for dynamic home page updates
export const revalidate = 0;

export default async function Home() {
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
    orderBy: { endDate: 'asc' },
  });

  return (
    <div>
      {/* 1. Hero Section */}
      <section className={styles.hero}>
        <div className={styles.glowingBlob1} />
        <div className={styles.glowingBlob2} />
        <div className={`${styles.heroContent} container`}>
          <div className="animate-fade-in-up" style={{ alignSelf: 'center' }}>
            <div className="badge badge-primary animate-float" style={{ marginBottom: '8px' }}>
              Next-Gen Learning Platform
            </div>
          </div>
          <h1 className={`${styles.heroTagline} animate-fade-in-up delay-1`}>
            Upgrade Your Skills from <span className="text-gradient">Real-World Experts</span>
          </h1>
          <p className={`${styles.heroDescription} animate-fade-in-up delay-2`}>
            Learn practical skills from industry veterans hailing from IIT, IIM, NIFT, Raymond, ITC, and Reliance. Build your business startup plan, master modern full-stack web development, and win national design challenges.
          </p>
          <div className={`${styles.heroCtas} animate-fade-in-up delay-3`}>
            <Link href="/courses" className="btn-primary" style={{ padding: '14px 28px' }}>
              Explore Courses <ArrowRight size={18} />
            </Link>
            <Link href="/innotechxperience" className="btn-secondary" style={{ padding: '14px 28px' }}>
              InnoTechXperience <Trophy size={18} style={{ color: 'var(--accent)' }} />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Stats Section */}
      <section className={styles.statsSection}>
        <div className="container">
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={`${styles.statNumber} text-gradient`}>15k+</span>
              <span className={styles.statLabel}>Active Students</span>
            </div>
            <div className={styles.statItem}>
              <span className={`${styles.statNumber} text-gradient`}>4.8</span>
              <span className={styles.statLabel}>Course Rating</span>
            </div>
            <div className={styles.statItem}>
              <span className={`${styles.statNumber} text-gradient`}>₹10L+</span>
              <span className={styles.statLabel}>Prize Pool</span>
            </div>
            <div className={styles.statItem}>
              <span className={`${styles.statNumber} text-gradient`}>98%</span>
              <span className={styles.statLabel}>Success Ratio</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Featured Courses Section */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Featured Courses</h2>
              <p className={styles.sectionSubtitle}>Handpicked masterclasses designed to launch your professional career.</p>
            </div>
            <Link href="/courses" className={styles.heroDescription} style={{ fontSize: '15px', color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Browse all <ArrowRight size={16} />
            </Link>
          </div>

          {/* Interactive Dynamic Filtering Courses List */}
          <FeaturedCoursesClient courses={courses} />
        </div>
      </section>

      {/* 5. InnoTechXperience Highlights */}
      <section className={styles.innotechSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>
                <span className="text-gradient">InnoTechXperience</span>
              </h2>
              <p className={styles.sectionSubtitle}>National design & photography challenges. Compete, get scored, and earn verified certificates.</p>
            </div>
            <Link href="/innotechxperience" className={styles.heroDescription} style={{ fontSize: '15px', color: 'var(--accent)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View Challenges <ArrowRight size={16} />
            </Link>
          </div>

          {/* Live Challenge Countdown Clock */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
            <InnoTechCountdown />
          </div>

          <div className={styles.grid}>
            {competitions.map((comp) => (
              <div key={comp.id} className={styles.compCard}>
                <div className={styles.cardImageWrapper}>
                  <img src={comp.image} alt={comp.title} className={styles.cardImage} />
                </div>
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className={styles.compDates}>
                    <Clock size={14} /> End Date: {new Date(comp.endDate).toLocaleDateString()}
                  </div>
                  <h3 className={styles.compTitle}>{comp.title}</h3>
                  <p className={styles.cardDescription}>{comp.description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '16px', borderTop: '1px solid var(--border-trans)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Status: Active</span>
                    <Link href={`/innotechxperience/${comp.id}`} className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                      Join Challenge
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Testimonials Carousel Section */}
      <section className={styles.section} style={{ background: 'radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.03) 0%, transparent 80%)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 className={styles.sectionTitle}>What Our Students Say</h2>
          <p className={styles.sectionSubtitle} style={{ marginBottom: '40px' }}>
            Real success stories from design professionals, web developers, and startup founders.
          </p>
          <TestimonialsCarousel />
        </div>
      </section>

      {/* 7. Frequently Asked Questions Section */}
      <section className={styles.section} style={{ borderTop: '1px solid var(--border-trans)' }}>
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
      <section className={styles.section} style={{ borderTop: '1px solid var(--border-trans)' }}>
        <div className="container">
          <div className={styles.ctaBanner}>
            <h2 style={{ fontSize: '36px', fontWeight: '800' }}>Ready to Elevate Your Skillset?</h2>
            <p style={{ maxWidth: '600px', color: 'var(--text-secondary)' }}>
              Join thousands of students validating their credentials and submitting elite digital portfolio projects. Let's start learning.
            </p>
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
              <Link href="/auth/signup" className="btn-primary" style={{ padding: '14px 28px' }}>
                Get Started
              </Link>
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
