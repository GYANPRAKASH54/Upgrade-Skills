'use client';

import { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import styles from '../app/Home.module.css';

export default function InnoTechCountdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    // Set target date to 10 days, 4 hours, and 30 minutes from now
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 10);
    targetDate.setHours(targetDate.getHours() + 4);
    targetDate.setMinutes(targetDate.getMinutes() + 30);

    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num) => String(num).padStart(2, '0');

  return (
    <div className={styles.countdownContainer}>
      <div className={styles.countdownTitle}>
        <Trophy size={14} />
        Next Grand Challenge Starts In:
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
