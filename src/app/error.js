'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './error-page.module.css';

export default function Error({ error, reset }) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Log the error to console
    console.error('System error caught by boundary:', error);
  }, [error]);

  return (
    <div className={styles.errorPageContainer}>
      <div className={styles.errorCard}>
        <div className={styles.illustrationWrapper}>
          <div className="animate-float">
            <img 
              src="/illustrations/student_blob.png?v=5" 
              alt="System Malfunction Mascot" 
              className={styles.mascotImage}
              draggable="false"
            />
          </div>
        </div>
        <span className={styles.errorBadge} style={{ color: '#ff4d4d', backgroundColor: 'rgba(255, 77, 77, 0.1)', borderColor: '#ff4d4d' }}>
          Error 500
        </span>
        <h1 className={styles.errorTitle}>Something Went Wrong</h1>
        <p className={styles.errorDescription}>
          Our systems encountered an unexpected malfunction. Don't worry, your progress has been safely stored.
        </p>

        <div className={styles.buttonGroup}>
          <button 
            onClick={() => reset()} 
            className="btn-primary"
            style={{ textTransform: 'uppercase' }}
          >
            Try Again
          </button>
          <Link href="/" className="btn-secondary">
            Go Back Home
          </Link>
        </div>

        {/* Technical Debug Information Drawer */}
        <div className={styles.detailsDrawer}>
          <div 
            onClick={() => setShowDetails(!showDetails)} 
            className={styles.detailsSummary}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowDetails(!showDetails);
              }
            }}
          >
            <span>{showDetails ? '▼' : '►'}</span> Technical Details
          </div>
          {showDetails && (
            <div className={styles.detailsContent}>
              {error?.message || 'Unknown server error'}
              {error?.stack && (
                <div style={{ marginTop: '8px', fontSize: '10px', opacity: 0.8 }}>
                  {error.stack.split('\n').slice(0, 3).join('\n')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
