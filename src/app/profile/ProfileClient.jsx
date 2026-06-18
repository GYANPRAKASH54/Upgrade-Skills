'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, CheckCircle2, AlertCircle } from 'lucide-react';
import styles from './Profile.module.css';

export default function ProfileClient({ initialUser }) {
  const router = useRouter();
  const [name, setName] = useState(initialUser.name || '');
  const [headline, setHeadline] = useState(initialUser.headline || '');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const getInitials = (userName) => {
    if (!userName) return 'U';
    const parts = userName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const getRoleStyleClass = (role) => {
    switch (role) {
      case 'ADMIN': return styles.roleAdmin;
      case 'INSTRUCTOR': return styles.roleInstructor;
      case 'TESTER': return styles.roleTester;
      default: return styles.roleStudent;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Name is required.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          headline: headline.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile.' });
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        router.refresh(); // Refresh route data
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.profileCard} glass-card`}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Account Profile</h2>
          <p className={styles.subtitle}>Update your personal details and public headline bio</p>
        </div>

        {/* Profile Avatar & Info */}
        <div className={styles.avatarSection}>
          <div className={styles.avatarLarge}>
            {getInitials(name)}
          </div>
          <div className={styles.avatarInfo}>
            <div style={{ fontSize: '18px', fontWeight: '700' }}>{name || 'User'}</div>
            <span className={`${styles.roleBadge} ${getRoleStyleClass(initialUser.role)}`}>
              {initialUser.role}
            </span>
          </div>
        </div>

        {/* Alert Notifications */}
        {message.text && (
          <div className={`${styles.alert} ${message.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Email (Read-Only) */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address (Read-Only)</label>
            <div className={styles.readOnlyValue}>{initialUser.email}</div>
          </div>

          {/* Name */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="form-input"
              required
              disabled={loading}
            />
          </div>

          {/* Headline (Bio) */}
          <div className={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className={styles.label}>Professional Headline / Biography</label>
              <span className={styles.charCounter}>{headline.length} / 120 characters</span>
            </div>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value.substring(0, 120))}
              placeholder="e.g. Industry Veteran & Academic Expert"
              className="form-input"
              disabled={loading}
            />
          </div>

          {/* Submit Action */}
          <div className={styles.actions}>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '14px' }}
            >
              {loading ? 'Saving Changes...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
