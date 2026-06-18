'use client';

export default function CertificateButton() {
  return (
    <button 
      onClick={(e) => { 
        e.preventDefault(); 
        alert('Certificate viewer simulated! Certified by Upgrade Skills.'); 
      }}
      className="btn-primary" 
      style={{ padding: '8px 12px', fontSize: '12px', width: '100%', background: 'linear-gradient(135deg, #4ade80, var(--accent))' }}
    >
      View Certificate
    </button>
  );
}
