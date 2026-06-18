'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Brand details */}
          <div className={styles.about}>
            <div className={styles.logo}>
              <img 
                src="/logo.png" 
                alt="Upgrade Skills Logo" 
                style={{ height: '36px', objectFit: 'contain' }} 
                draggable="false"
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
            <p className={styles.description}>
              Upgrade your skills from real-world experts from around the globe. Rebuilt with React & Next.js for superior speed, payment integration, and production-level security.
            </p>
            <div className={styles.socials}>
              <a 
                href="https://www.instagram.com/upgradeskills.official" 
                target="_blank" 
                rel="noopener noreferrer" 
                className={styles.socialLink}
                aria-label="Instagram"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a 
                href="https://www.facebook.com/share/18tveJmpcy/?mibextid=wwXIfr" 
                target="_blank" 
                rel="noopener noreferrer" 
                className={styles.socialLink}
                aria-label="Facebook"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className={styles.title}>LMS Platform</h4>
            <ul className={styles.links}>
              <li>
                <Link href="/courses" className={styles.link}>
                  Browse Courses
                </Link>
              </li>
              <li>
                <Link href="/classroom" className={styles.link}>
                  Student Classroom
                </Link>
              </li>
              <li>
                <Link href="/instructor" className={styles.link}>
                  Teach / Instruct
                </Link>
              </li>
            </ul>
          </div>

          {/* Competitions */}
          <div>
            <h4 className={styles.title}>InnoTechXperience</h4>
            <ul className={styles.links}>
              <li>
                <Link href="/innotechxperience" className={styles.link}>
                  Active Challenges
                </Link>
              </li>
              <li>
                <Link href="/innotechxperience" className={styles.link}>
                  Submissions Gallery
                </Link>
              </li>
              <li>
                <Link href="/innotechxperience" className={styles.link}>
                  Leaderboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Subscribe */}
          <div className={styles.newsletter}>
            <h4 className={styles.title}>Stay Updated</h4>
            <p className={styles.description} style={{ marginBottom: '8px' }}>
              Subscribe to get notified of new design competitions and course launches.
            </p>
            {subscribed ? (
              <div style={{ 
                padding: '10px 14px', 
                backgroundColor: 'rgba(74, 222, 128, 0.1)', 
                border: '1px solid rgba(74, 222, 128, 0.2)', 
                borderRadius: 'var(--radius-sm)', 
                color: '#4ade80', 
                fontSize: '13px', 
                fontWeight: '600', 
                marginTop: '12px' 
              }}>
                ✓ Thanks for subscribing!
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.newsletterForm}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.newsletterInput}
                  required
                />
                <button type="submit" className="btn-primary" style={{ padding: '10px 16px' }}>
                  Join
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom copyright */}
        <div className={styles.copyrightSection}>
          <div>
            © {new Date().getFullYear()} Upgrade Skills. All rights reserved.
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Website created by <span style={{ fontWeight: '700', color: 'var(--accent)' }}>GYAN PRAKASH</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
