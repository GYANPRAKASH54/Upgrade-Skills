import { prisma } from '@/lib/db';
import ChallengeCard from './ChallengeCard';
import styles from './Competitions.module.css';

export const revalidate = 0;

export const metadata = {
  title: 'InnoTechXperience',
  description: 'Participate in national design & tech challenges to build your portfolio.',
};

export default async function InnoTechXperiencePage() {
  const competitions = await prisma.competition.findMany({
    include: {
      _count: {
        select: { submissions: true },
      },
    },
    orderBy: {
      endDate: 'asc',
    },
  });

  const now = new Date();
  const activeCompetitions = competitions.filter((c) => new Date(c.endDate) > now);
  const completedCompetitions = competitions.filter((c) => new Date(c.endDate) <= now);

  return (
    <div>
      {/* Page Header */}
      <section className={styles.pageHeader}>
        <div className="container">
          <h1 className={styles.title}>InnoTechXperience</h1>
          <p className={styles.description}>
            Compete in national design, layout, branding, and photography challenges. Showcase your elite projects and earn certified scores.
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <section className="container" style={{ paddingBottom: '80px' }}>
        {/* Active Challenges */}
        <div>
          <h2 className={styles.sectionTitle}>Active Challenges</h2>
          {activeCompetitions.length === 0 ? (
            <div className="glass-card" style={{ padding: '40px', textAlignment: 'center', textAlign: 'center', marginBottom: '40px' }}>
              <p style={{ color: 'var(--text-muted)' }}>No active challenges at the moment. Check back soon!</p>
            </div>
          ) : (
            <div className={styles.challengesGrid}>
              {activeCompetitions.map((comp) => (
                <ChallengeCard key={comp.id} competition={comp} />
              ))}
            </div>
          )}
        </div>

        {/* Completed/Past Challenges */}
        <div>
          <h2 className={styles.sectionTitle} style={{ marginTop: '40px' }}>Past Arenas</h2>
          {completedCompetitions.length === 0 ? (
            <div className="glass-card" style={{ padding: '40px', textAlignment: 'center', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)' }}>No completed past challenges found.</p>
            </div>
          ) : (
            <div className={styles.challengesGrid}>
              {completedCompetitions.map((comp) => (
                <ChallengeCard key={comp.id} competition={comp} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
