'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, CheckCircle2, ShieldAlert } from 'lucide-react';
import styles from '../Competitions.module.css';

export default function SubmitProjectForm({ competitionId, hasSubmitted, userSession }) {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!userSession) {
      router.push(`/auth/signin?callbackUrl=/innotechxperience/${competitionId}`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitionId,
          projectTitle: title,
          description,
          projectLink: link,
          imageUrl: imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to submit project');
      } else {
        setSuccess(true);
        setTitle('');
        setDescription('');
        setLink('');
        setImageUrl('');
        router.refresh(); // Refresh gallery submissions!
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (hasSubmitted && !success) {
    return (
      <div className={styles.cardBlock} style={{ borderColor: 'var(--accent)', background: 'hsla(180, 100%, 48%, 0.02)' }}>
        <h3 className={styles.blockTitle}>Submission Received</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          You have already submitted an entry for this challenge. If you submit the form again, your previous submission will be updated.
        </p>
        <button 
          onClick={() => router.push('/innotechxperience/my-submissions')} 
          className="btn-secondary" 
          style={{ width: '100%', padding: '10px', fontSize: '13px' }}
        >
          View My Submission Status
        </button>
      </div>
    );
  }

  return (
    <div className={styles.cardBlock}>
      <h3 className={styles.blockTitle}>Submit Your Entry</h3>

      {error && (
        <div style={{ backgroundColor: 'rgba(255, 77, 77, 0.1)', border: '1px solid rgba(255, 77, 77, 0.2)', color: '#ff4d4d', padding: '10px 14px', borderRadius: '4px', fontSize: '13px' }}>
          <ShieldAlert size={14} style={{ display: 'inline', marginRight: '4px' }} />
          {error}
        </div>
      )}

      {success && (
        <div style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', color: '#4ade80', padding: '10px 14px', borderRadius: '4px', fontSize: '13px' }}>
          <CheckCircle2 size={14} style={{ display: 'inline', marginRight: '4px' }} />
          Project submitted successfully! Check gallery submissions.
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Project Title</label>
          <input 
            type="text" 
            placeholder="e.g. EcoFlow Brand Kit Design" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            className="form-input" 
            required 
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Description & Ideation</label>
          <textarea 
            placeholder="Brief explanation of your design choices..." 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            className="form-input" 
            style={{ minHeight: '80px', resize: 'vertical' }}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Project Repository / Live Link</label>
          <input 
            type="url" 
            placeholder="e.g. https://github.com/my-username/my-design" 
            value={link} 
            onChange={(e) => setLink(e.target.value)} 
            className="form-input" 
            required 
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Mockup / Screenshot Image URL (Optional)</label>
          <input 
            type="url" 
            placeholder="e.g. https://unsplash.com/... or cloudinary link" 
            value={imageUrl} 
            onChange={(e) => setImageUrl(e.target.value)} 
            className="form-input" 
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="btn-primary" 
          style={{ width: '100%', padding: '12px', marginTop: '10px' }}
        >
          <Send size={16} /> {loading ? 'Submitting...' : 'Upload Submission'}
        </button>
      </form>
    </div>
  );
}
