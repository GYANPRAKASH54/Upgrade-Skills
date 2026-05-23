'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, ShieldAlert } from 'lucide-react';
import styles from '../Auth.module.css';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const oauthError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (oauthError) {
      if (oauthError === 'OAuthCallback' || oauthError === 'OAuthSignin' || oauthError === 'OAuthCreateAccount') {
        setError('Google sign-in failed. Please try again.');
      } else if (oauthError === 'Callback') {
        setError('Authentication failed. Please check your credentials.');
      } else if (oauthError === 'SessionRequired') {
        setError('Please sign in to access this page.');
      } else {
        setError('An error occurred during sign-in.');
      }
    }
  }, [oauthError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        if (res.error === 'CredentialsSignin') {
          setError('Invalid email or password');
        } else {
          setError(res.error);
        }
        setLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.authCard}>
      <div className={styles.titleSection}>
        <h2 className={styles.title}>Welcome Back</h2>
        <p className={styles.subtitle}>Sign in to continue your learning journey</p>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <ShieldAlert size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          {error}
        </div>
      )}

      {/* Google OAuth Option */}
      <button 
        onClick={() => signIn('google', { callbackUrl })} 
        className={styles.oauthButton}
        type="button"
      >
        {/* Simple Google SVG Icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </button>

      <div className={styles.divider}>or sign in with email</div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Email Address */}
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

        {/* Password */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '44px' }}
              required
            />
            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
          style={{ width: '100%', padding: '14px', marginTop: '10px' }}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      <p className={styles.footerText}>
        Don't have an account?{' '}
        <Link href="/auth/signup" className={styles.footerLink}>
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className={styles.pageContainer}>
      <Suspense fallback={
        <div className={styles.authCard} style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
        </div>
      }>
        <SignInForm />
      </Suspense>
    </div>
  );
}

