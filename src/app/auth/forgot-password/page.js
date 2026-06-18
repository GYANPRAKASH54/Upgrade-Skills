'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ShieldAlert, CheckCircle } from 'lucide-react';
import styles from '../Auth.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to request password reset link.');
      } else {
        setMessage(data.message || 'Password reset link sent successfully.');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.authCard}>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>Reset Password</h2>
          <p className={styles.subtitle}>Enter your email to receive a recovery link</p>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <ShieldAlert size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            {error}
          </div>
        )}

        {message && (
          <div 
            style={{
              backgroundColor: 'rgba(88, 204, 2, 0.1)',
              border: '2px solid var(--primary)',
              color: 'var(--primary)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              textAlign: 'center',
              fontWeight: '700',
            }}
          >
            <CheckCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            {message}
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '44px' }}
                  required
                />
                <Mail size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', marginTop: '10px' }}
            >
              {loading ? 'Sending Recovery Link...' : 'Send Recovery Link'}
            </button>
          </form>
        )}

        <p className={styles.footerText}>
          Remember your password?{' '}
          <Link href="/auth/signin" className={styles.footerLink}>
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
