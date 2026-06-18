import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Clock, Calendar, CheckSquare, Award, ExternalLink, Trophy } from 'lucide-react';
import SubmitProjectForm from './SubmitProjectForm';
import styles from '../Competitions.module.css';

export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { id } = await params;
  const competition = await prisma.competition.findUnique({
    where: { id },
    select: { title: true }
  });
  return {
    title: competition ? competition.title : 'Competition Details'
  };
}

export default async function CompetitionDetailPage({ params }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const competition = await prisma.competition.findUnique({
    where: { id },
    include: {
      submissions: {
        include: {
          student: {
            select: { name: true },
          },
        },
        orderBy: [
          { score: 'desc' },
          { createdAt: 'desc' },
        ],
      },
    },
  });

  if (!competition) {
    notFound();
  }

  // Check if current user has already submitted an entry
  let hasSubmitted = false;
  if (session) {
    hasSubmitted = competition.submissions.some(
      (s) => s.studentId === session.user.id
    );
  }

  const isExpired = new Date(competition.endDate) <= new Date();
  const status = competition.status || (isExpired ? 'REGISTRATIONS_CLOSED' : 'REGISTRATIONS_OPEN');
  const isSubmissionClosed = status === 'REGISTRATIONS_CLOSED' || status === 'RESULT' || isExpired;

  return (
    <div className="container" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
      {/* 1. Image Banner */}
      <img src={competition.image} alt={competition.title} className={styles.imageBanner} />

      {/* 2. Content Layout Grid */}
      <div className={styles.detailGrid} style={{ marginTop: '30px' }}>
        {/* Main Details & Gallery */}
        <div className={styles.mainCol}>
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {status === 'REGISTRATIONS_OPEN' && (
                <span className="badge badge-primary">Registrations Open</span>
              )}
              {status === 'REGISTRATIONS_CLOSED' && (
                <span className="badge badge-secondary">Registrations Closed</span>
              )}
              {status === 'RESULT' && (
                <span className="badge badge-accent">Result Out</span>
              )}
              <span className="badge badge-accent">National Level</span>
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: '800' }}>{competition.title}</h1>
            <p className={styles.description} style={{ marginTop: '16px' }}>{competition.description}</p>
          </div>

          {/* Rules Card */}
          <div className={styles.cardBlock}>
            <h3 className={styles.blockTitle}>Competition Guidelines</h3>
            <ul className={styles.rulesList}>
              {competition.rules.split('. ').map((rule, idx) => (
                <li key={idx} className={styles.rulesItem}>
                  <CheckSquare size={16} style={{ color: 'var(--accent)', marginTop: '2px', flexShrink: 0 }} />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Leaderboard / Submissions Gallery */}
          <div>
            <h2 className={styles.sectionTitle}>Submissions Gallery</h2>
            {competition.submissions.length === 0 ? (
              <div className="glass-card" style={{ padding: '60px', textAlignment: 'center', textAlign: 'center' }}>
                <Trophy size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>No Submissions Yet</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Be the first to submit your project entry and win certification!</p>
              </div>
            ) : (
              <div className={styles.galleryGrid}>
                {competition.submissions.map((sub, idx) => (
                  <div key={sub.id} className={styles.galleryCard}>
                    <img 
                      src={sub.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60'} 
                      alt={sub.projectTitle} 
                      className={styles.galleryThumbnail} 
                    />
                    <div className={styles.galleryBody}>
                      <h4 className={styles.galleryTitle}>{sub.projectTitle}</h4>
                      <span className={styles.galleryUser}>By {sub.student.name}</span>
                      
                      <div className={styles.galleryFooter}>
                        <a 
                          href={sub.projectLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}
                        >
                          <ExternalLink size={12} /> View Code
                        </a>
                        {sub.score ? (
                          <span className={styles.scoreBadge}>Score: {sub.score}/100</span>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pending Review</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Form Submission & Dates */}
        <div className={styles.sidebarCol}>
          {/* Timeline details */}
          <div className={styles.cardBlock}>
            <h3 className={styles.blockTitle}>Details & Timeline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyItems: 'center', alignItems: 'center', gap: '10px' }}>
                <Calendar size={18} style={{ color: 'var(--accent)' }} />
                <div>
                  <div style={{ fontWeight: '700' }}>Starts</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(competition.startDate).toLocaleDateString()}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyItems: 'center', alignItems: 'center', gap: '10px' }}>
                <Clock size={18} style={{ color: 'var(--primary)' }} />
                <div>
                  <div style={{ fontWeight: '700' }}>Ends</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(competition.endDate).toLocaleDateString()}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyItems: 'center', alignItems: 'center', gap: '10px', borderTop: '1px solid var(--border-trans)', paddingTop: '12px' }}>
                <Award size={18} style={{ color: 'var(--accent)' }} />
                <div>
                  <div style={{ fontWeight: '700' }}>Certificate Issued</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Scores &gt; 80/100</div>
                </div>
              </div>
            </div>
          </div>

          {/* Submission Form Component */}
          {!isSubmissionClosed ? (
            <SubmitProjectForm 
              competitionId={competition.id} 
              hasSubmitted={hasSubmitted}
              userSession={session}
            />
          ) : (
            <div className={styles.cardBlock} style={{ background: 'rgba(234, 67, 53, 0.05)', borderColor: 'rgba(234, 67, 53, 0.2)' }}>
              <h3 className={styles.blockTitle} style={{ color: '#EA4335' }}>
                {status === 'RESULT' ? 'Competition Completed' : 'Registrations Closed'}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {status === 'RESULT' 
                  ? 'This competition arena is now completed. Check the submissions gallery to see scores and participant designs.' 
                  : 'Submissions are currently closed for this challenge. Keep an eye out for results or future opportunities.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
