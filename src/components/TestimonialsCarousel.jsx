'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
import styles from '../app/Home.module.css';

const TESTIMONIALS = [
  {
    id: 1,
    name: 'Aishwarya Sharma',
    role: 'NIFT Fashion Design Graduate',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    quote: 'The Mobile Fashion Photography course and challenge gave me the exposure I needed. Landing a cash prize and being featured on the website helped me build my portfolio and stand out to Raymond Recruiters!',
    stars: 5,
  },
  {
    id: 2,
    name: 'Rohan Mehta',
    role: 'Co-Founder, SolarGrid Tech',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    quote: 'Drafting our startup business plan with mentorship from IIM alumni on Upgrade Skills was a turning point. We were able to structure our financial models correctly and raise our pre-seed funding last month.',
    stars: 5,
  },
  {
    id: 3,
    name: 'Priyanka Das',
    role: 'Front-End Engineer at Cognizant',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    quote: 'The Next.js Full Stack course is extremely practical. It does not just teach syntax; it explains how to hook up databases, security layers, and checkouts. Re-building the apps from scratch gave me immense confidence.',
    stars: 5,
  },
];

export default function TestimonialsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  const handleNext = () => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
      setAnimating(false);
    }, 300);
  };

  const handlePrev = () => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
      setAnimating(false);
    }, 300);
  };

  // Auto-play timer
  useEffect(() => {
    const timer = setInterval(() => {
      handleNext();
    }, 6000);
    return () => clearInterval(timer);
  }, [currentIndex]);

  const active = TESTIMONIALS[currentIndex];

  return (
    <div className={`${styles.testimonialsContainer} glass-card`}>
      <div className={styles.testimonialQuoteIcon}>
        <Quote size={48} style={{ color: 'var(--primary-glow)', opacity: 0.4 }} />
      </div>

      <div className={`${styles.testimonialContent} ${animating ? styles.slideOut : styles.slideIn}`}>
        <p className={styles.testimonialQuote}>"{active.quote}"</p>
        
        <div className={styles.testimonialAuthor}>
          <img src={active.image} alt={active.name} className={styles.testimonialAvatar} />
          <div>
            <h4 className={styles.testimonialName}>{active.name}</h4>
            <p className={styles.testimonialRole}>{active.role}</p>
          </div>
          <div className={styles.testimonialStars}>
            {[...Array(active.stars)].map((_, i) => (
              <Star key={i} size={16} fill="var(--accent)" style={{ color: 'var(--accent)' }} />
            ))}
          </div>
        </div>
      </div>

      {/* Nav Controls */}
      <div className={styles.testimonialControls}>
        <button onClick={handlePrev} className={styles.navBtn} aria-label="Previous testimonial">
          <ChevronLeft size={20} />
        </button>
        <div className={styles.dots}>
          {TESTIMONIALS.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (animating) return;
                setAnimating(true);
                setTimeout(() => {
                  setCurrentIndex(index);
                  setAnimating(false);
                }, 300);
              }}
              className={`${styles.dot} ${index === currentIndex ? styles.activeDot : ''}`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
        <button onClick={handleNext} className={styles.navBtn} aria-label="Next testimonial">
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
