import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Award, Trophy, Eye, ExternalLink, Calendar } from 'lucide-react';
import CertificateButton from '@/components/CertificateButton';

export const revalidate = 0;

export const metadata = {
  title: 'My Submissions | InnoTechXperience',
  description: 'Manage and view your challenge entries and scores.',
};

export default async function MySubmissionsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin?callbackUrl=/innotechxperience/my-submissions');
  }

  // Fetch student submissions
  const submissions = await prisma.submission.findMany({
    where: {
      studentId: session.user.id,
    },
    include: {
      competition: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="container" style={{ paddingTop: '60px', paddingBottom: '80px' }}>
      <div style={{ borderBottom: '1px solid var(--border-trans)', paddingBottom: '20px', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800' }}>My Competition Entries</h1>
        <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Track grades, feedback, and verified design/tech certificates from InnoTechXperience.
        </p>
      </div>

      {submissions.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px', textAlignment: 'center', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <Trophy size={48} style={{ color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '700' }}>No Submissions Found</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '400px' }}>
            You haven't participated in any challenges yet. Visit the arena to test your skills!
          </p>
          <Link href="/innotechxperience" className="btn-primary" style={{ padding: '10px 20px', fontSize: '14px', marginTop: '10px' }}>
            Explore Challenges
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {submissions.map((sub) => (
            <div key={sub.id} className="glass-card" style={{ padding: '30px', display: 'grid', gridTemplateColumns: '1fr 220px', gap: '20px' }}>
              <div>
                <span className="badge badge-primary" style={{ fontSize: '10px' }}>Submitted Entry</span>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginTop: '8px' }}>{sub.projectTitle}</h3>
                <p style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: '600', marginTop: '4px' }}>
                  Challenge: {sub.competition.title}
                </p>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '10px', lineHeight: '1.5' }}>
                  {sub.description}
                </p>
                
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} /> Submitted on: {new Date(sub.createdAt).toLocaleDateString()}
                  </span>
                  <a 
                    href={sub.projectLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: 'var(--accent)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ExternalLink size={14} /> Repository Link
                  </a>
                </div>
              </div>

              {/* Score / Certificate box */}
              <div style={{ borderLeft: '1px solid var(--border-trans)', paddingLeft: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: '12px' }}>
                {sub.score ? (
                  <>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Final Score</div>
                      <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--accent)', marginTop: '4px' }}>{sub.score}<span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>/100</span></div>
                    </div>

                    {sub.certificateIssued ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4ade80', fontSize: '12px', fontWeight: '700', justifyContent: 'center' }}>
                          <Award size={14} /> Verified Certificate
                        </div>
                        <CertificateButton />
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Score too low for certificate</span>
                    )}
                  </>
                ) : (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Review Status</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-secondary)', marginTop: '8px' }}>Pending Grading</div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Reviewers typically grade entries within 48 hours.</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
