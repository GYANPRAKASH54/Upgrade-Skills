import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Search, Star, Frown, BookOpen } from 'lucide-react';
import styles from './Courses.module.css';

export const revalidate = 0;

export default async function CoursesPage({ searchParams }) {
  const params = await searchParams;
  const search = params.search || '';
  const category = params.category || '';

  // Query database directly
  const where = { published: true };

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { subtitle: { contains: search } },
      { description: { contains: search } },
    ];
  }

  // Sample static categorizations for filtering demo
  // Let's filter by matching categories
  if (category) {
    if (category === 'business') {
      where.title = { contains: 'Business' };
    } else if (category === 'coding') {
      where.title = { contains: 'React' };
    }
  }

  const courses = await prisma.course.findMany({
    where,
    include: {
      instructor: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      {/* 1. Page Header */}
      <section className={styles.pageHeader}>
        <div className="container">
          <h1 className={styles.title}>All Courses</h1>
          <p className={styles.description}>Master high-demand business plans, photography, programming, and design.</p>
        </div>
      </section>

      {/* 2. Catalog Content */}
      <section className="container">
        <div className={styles.layout}>
          {/* Sidebar */}
          <aside className={styles.sidebar}>
            <div className={styles.filterGroup}>
              <h3 className={styles.filterTitle}>Categories</h3>
              <ul className={styles.categoryList}>
                <li>
                  <Link 
                    href="/courses" 
                    className={`${styles.categoryItem} ${!category ? styles.categoryActive : ''}`}
                  >
                    All Categories
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/courses?category=business" 
                    className={`${styles.categoryItem} ${category === 'business' ? styles.categoryActive : ''}`}
                  >
                    Business Planning
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/courses?category=coding" 
                    className={`${styles.categoryItem} ${category === 'coding' ? styles.categoryActive : ''}`}
                  >
                    Coding & Full-Stack
                  </Link>
                </li>
              </ul>
            </div>
          </aside>

          {/* Catalog grid */}
          <div>
            {search && (
              <div className={styles.searchSummary}>
                Showing results for "<span style={{ fontWeight: 700 }}>{search}</span>" ({courses.length} courses found)
              </div>
            )}

            {courses.length === 0 ? (
              <div className={styles.emptyState}>
                <Frown size={48} style={{ color: 'var(--text-muted)' }} />
                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>No Courses Found</h3>
                <p style={{ maxWidth: '400px', fontSize: '14px' }}>
                  We couldn't find any courses matching your request. Try adjusting your keywords or browse all categories.
                </p>
                <Link href="/courses" className="btn-primary" style={{ padding: '8px 16px', fontSize: '14px', marginTop: '10px' }}>
                  Reset Filters
                </Link>
              </div>
            ) : (
              <div className={styles.resultsGrid}>
                {courses.map((course) => (
                  <div key={course.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
                      <img src={course.thumbnail} alt={course.title} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ padding: '20px', display: 'flex', flex: 1, flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="badge badge-primary" style={{ fontSize: '10px' }}>Udemy Bestseller</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--accent)', fontWeight: '600' }}>
                          <Star size={12} fill="var(--accent)" /> 4.9
                        </div>
                      </div>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', lineHeight: '1.4', height: '44px', overflow: 'hidden' }}>{course.title}</h3>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>By {course.instructor.name}</div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', height: '58px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                        {course.subtitle}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-trans)' }}>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent)' }}>₹{course.price}</div>
                        <Link href={`/courses/${course.id}`} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                          Learn More
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
