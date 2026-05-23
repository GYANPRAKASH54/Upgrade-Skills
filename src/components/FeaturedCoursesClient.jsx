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
            <div key={course.id} className={styles.card}>
              <div className={styles.cardImageWrapper}>
                <img src={course.thumbnail} alt={course.title} className={styles.cardImage} />
              </div>
              <div className={styles.cardContent}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-primary" style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                    {getCourseCategory(course) === 'tech' ? 'Coding' : getCourseCategory(course) === 'business' ? 'Business' : 'Design'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--accent)', fontWeight: '600' }}>
                    <Star size={14} fill="var(--accent)" /> 4.9
                  </div>
                </div>
                <h3 className={styles.cardTitle}>{course.title}</h3>
                <div className={styles.cardInstructor}>
                  By {course.instructor?.name || 'Expert Instructor'}
                </div>
                <p className={styles.cardDescription}>{course.subtitle}</p>
                <div className={styles.cardFooter}>
                  <div className={styles.price}>₹{course.price}</div>
                  <Link href={`/courses/${course.id}`} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
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
