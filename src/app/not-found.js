'use client';
import Link from 'next/link';
import styles from './error-page.module.css';

export default function NotFound() {
  return (
    <div className={styles.errorPageContainer}>
      <div className={styles.errorCard}>
        <div className={styles.illustrationWrapper}>
          <div className="animate-float">
            <img 
              src="/illustrations/hero_owl.png?v=5" 
              alt="Puzzled Green Owl Mascot" 
              className={styles.mascotImage}
              draggable="false"
            />
          </div>
        </div>
        <span className={styles.errorBadge}>Error 404</span>
        <h1 className={styles.errorTitle}>Oops! Page Not Found</h1>
        <p className={styles.errorDescription}>
          The page you are looking for has taken a detour, or it never existed in this classroom. Let's get you back on track!
        </p>
        <div className={styles.buttonGroup}>
          <Link href="/" className="btn-primary">
            Go Back Home
          </Link>
          <Link href="/courses" className="btn-secondary">
            Browse Courses
          </Link>
        </div>
      </div>
    </div>
  );
}
