'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, Search, ShieldAlert, Award, RefreshCw } from 'lucide-react';
import styles from './Verify.module.css';

function VerifyForm() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id') || '';

  const [certId, setCertId] = useState(initialId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [certData, setCertData] = useState(null);

  // If ID is passed in the URL query string, run verification automatically
  useEffect(() => {
    if (initialId) {
      verifyCertificate(initialId);
    }
  }, [initialId]);

  const verifyCertificate = async (idToVerify) => {
    const id = idToVerify || certId;
    if (!id.trim()) {
      setError('Please enter a Certificate Verification ID.');
      return;
    }

    setError('');
    setCertData(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/verify?id=${encodeURIComponent(id.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to verify certificate.');
      } else {
        setCertData(data);
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    verifyCertificate();
  };

  const handleReset = () => {
    setCertId('');
    setError('');
    setCertData(null);
  };

  return (
    <div className={styles.card}>
      {/* Verified State */}
      {certData ? (
        <div className={styles.verifiedBlock}>
          <div className={styles.badgeWrapper}>
            <ShieldCheck size={72} className={styles.badge} />
          </div>
          <h2 className={styles.successTitle}>Verified Certificate</h2>
          
          <table className={styles.detailTable}>
            <tbody>
              <tr className={styles.detailRow}>
                <td className={styles.detailLabel}>Recipient</td>
                <td className={styles.detailValue}>{certData.studentName}</td>
              </tr>
              <tr className={styles.detailRow}>
                <td className={styles.detailLabel}>Course Title</td>
                <td className={styles.detailValue}>{certData.courseTitle}</td>
              </tr>
              <tr className={styles.detailRow}>
                <td className={styles.detailLabel}>Issue Date</td>
                <td className={styles.detailValue}>{certData.issueDate}</td>
              </tr>
              <tr className={styles.detailRow}>
                <td className={styles.detailLabel}>Serial Number</td>
                <td className={`${styles.detailValue} ${styles.detailValueHighlight}`}>
                  {certData.verificationId}
                </td>
              </tr>
              <tr className={styles.detailRow}>
                <td className={styles.detailLabel}>Status</td>
                <td className={styles.detailValue} style={{ color: certData.isPreview ? '#fbbf24' : '#4ade80', fontWeight: '700' }}>
                  {certData.isPreview ? 'TEMPORARY PREVIEW (NOT ACTIVE)' : 'ACTIVE / AUTHENTIC'}
                </td>
              </tr>
            </tbody>
          </table>

          <button onClick={handleReset} className={`btn-secondary ${styles.resetButton}`}>
            Verify Another Certificate
          </button>
        </div>
      ) : (
        /* Search Form State */
        <>
          <div className={styles.header}>
            <h1 className={styles.title}>Credential Verification</h1>
            <p className={styles.subtitle}>
              Verify the authenticity of digital certificates issued by Upgrade Skills. Enter the unique Certificate ID below.
            </p>
          </div>

          {error && (
            <div className={styles.errorBanner}>
              <ShieldAlert size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Certificate Verification ID</label>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  placeholder="e.g. US-CERT-CABA1CCE-82DF"
                  value={certId}
                  onChange={(e) => setCertId(e.target.value)}
                  className={styles.input}
                  required
                />
                <Award size={18} className={styles.searchIcon} />
              </div>
            </div>

            <button type="submit" disabled={loading} className={`btn-primary ${styles.button}`}>
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={16} /> Verifying...
                </>
              ) : (
                <>
                  <Search size={16} /> Verify Credential
                </>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className={styles.pageContainer}>
      <Suspense fallback={
        <div className={styles.card} style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-secondary)' }}>Loading verification panel...</div>
        </div>
      }>
        <VerifyForm />
      </Suspense>
    </div>
  );
}
