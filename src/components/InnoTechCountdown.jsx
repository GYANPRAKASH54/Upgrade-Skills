'use client';

import { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import styles from '../app/Home.module.css';

export default function InnoTechCountdown({ targetDate, label = 'Next Grand Challenge Starts In:' }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [hasEnded, setHasEnded] = useState(false);

  useEffect(() => {
    if (!targetDate) {
      setHasEnded(true);
      return;
    }

    const targetTime = new Date(targetDate).getTime();

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setHasEnded(true);
        return;
      }

      setHasEnded(false);
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const formatNumber = (num) => String(num).padStart(2, '0');

  // If there's no target date or the target time has passed, show "New Challenges Coming Soon"
  if (hasEnded || !targetDate) {
    return (
      <div className={styles.countdownContainer}>
        <div className={styles.countdownTitle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', textTransform: 'none', letterSpacing: 'normal' }}>
          <Trophy size={16} />
          <span>New Arenas and Grand Challenges Coming Soon!</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.countdownContainer}>
      <div className={styles.countdownTitle}>
        <Trophy size={14} />
        {label}
      </div>
      <div className={styles.countdownGrid}>
        <div className={styles.countdownBox}>
          <div className={styles.countdownValue}>{formatNumber(timeLeft.days)}</div>
          <div className={styles.countdownLabel}>Days</div>
        </div>
        <div className={styles.countdownBox}>
          <div className={styles.countdownValue}>{formatNumber(timeLeft.hours)}</div>
          <div className={styles.countdownLabel}>Hours</div>
        </div>
        <div className={styles.countdownBox}>
          <div className={styles.countdownValue}>{formatNumber(timeLeft.minutes)}</div>
          <div className={styles.countdownLabel}>Mins</div>
        </div>
        <div className={styles.countdownBox}>
          <div className={styles.countdownValue}>{formatNumber(timeLeft.seconds)}</div>
          <div className={styles.countdownLabel}>Secs</div>
        </div>
      </div>
    </div>
  );
}

