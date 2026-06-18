'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, ArrowRight } from 'lucide-react';
import styles from '../app/Home.module.css';

export default function FeaturedCoursesClient({ courses }) {
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'tech', label: 'Tech & Coding' },
    { id: 'business', label: 'Business & Startups' },
    { id: 'creative', label: 'Creative Design' },
  ];

  const getCourseCategory = (course) => {
    const title = course.title.toLowerCase();
    const subtitle = course.subtitle?.toLowerCase() || '';
    const desc = course.description?.toLowerCase() || '';

    if (
      title.includes('react') || 
      title.includes('next.js') || 
      title.includes('web') || 
      title.includes('coding') || 
      title.includes('programming') || 
      title.includes('developer') || 
      title.includes('tech')
    ) {
      return 'tech';
    }
    if (
      title.includes('business') || 
      title.includes('start-up') || 
      title.includes('startup') || 
      title.includes('marketing') || 
      title.includes('finance') || 
      title.includes('product')
    ) {
      return 'business';
    }
    return 'creative'; // Default to creative design
  };

  const filteredCourses = activeCategory === 'all'
    ? courses
    : courses.filter(c => getCourseCategory(c) === activeCategory);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Dynamic Tabs */}
      <div className={styles.tabsWrapper}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`${styles.filterTab} ${activeCategory === cat.id ? styles.activeFilterTab : ''}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid with animation */}
      {filteredCourses.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No courses currently available in this category. Check back soon!
        </div>
      ) : (
        <div className={`${styles.grid} ${styles.fadeInAnimate}`}>
          {filteredCourses.map((course) => (
            <div key={course.id} className={styles.card} style={{ borderRadius: '4px', border: '1px solid var(--border-trans)', boxShadow: 'var(--shadow-sm)', backgroundColor: 'var(--bg-card)' }}>
              <div className={styles.cardImageWrapper} style={{ overflow: 'hidden' }}>
                <img 
                  src={course.thumbnail} 
                  alt={course.title} 
                  className={styles.cardImage} 
                  style={{ borderTopLeftRadius: '4px', borderTopRightRadius: '4px' }}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60';
                  }}
                />
              </div>

              <div className={styles.cardContent} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-primary" style={{ textTransform: 'uppercase', fontSize: '10px', backgroundColor: 'var(--color-charcoal-surface)', color: 'var(--color-skill-green)', border: '1px solid var(--border-trans)' }}>
                    {getCourseCategory(course) === 'tech' ? 'Coding' : getCourseCategory(course) === 'business' ? 'Business' : 'Design'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--color-warning-amber)', fontWeight: '600' }}>
                    <Star size={14} fill="var(--color-warning-amber)" stroke="var(--color-warning-amber)" /> 4.9
                  </div>
                </div>
                <h3 className={styles.cardTitle} style={{ fontSize: '16px', fontWeight: '700', lineHeight: '1.3' }}>{course.title}</h3>
                <div className={styles.cardInstructor} style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  By {course.instructor?.name || 'Expert Instructor'}
                </div>
                <p className={styles.cardDescription} style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{course.subtitle}</p>
                <div className={styles.cardFooter} style={{ borderTop: '1px solid var(--border-trans)', paddingTop: '12px' }}>
                  <div className={styles.price} style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>₹{course.price}</div>
                  <Link href={`/courses/${course.id}`} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
