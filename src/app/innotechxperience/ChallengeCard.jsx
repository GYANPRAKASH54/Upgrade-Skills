'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Trophy, Calendar, Users } from 'lucide-react';

export default function ChallengeCard({ competition }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(competition.endDate) - +new Date();
      
      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft('Expired');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [competition.endDate]);

  const status = competition.status || (isExpired ? 'REGISTRATIONS_CLOSED' : 'REGISTRATIONS_OPEN');

  let badgeElement = (
    <span className="badge badge-success" style={{ fontSize: '10px' }}>
      Registrations Open
    </span>
  );
  let buttonText = 'Join Arena';

  if (status === 'REGISTRATIONS_CLOSED') {
    badgeElement = (
      <span className="badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-trans)', fontSize: '10px', textTransform: 'uppercase' }}>
        Registrations Closed
      </span>
    );
    buttonText = 'View Details';
  } else if (status === 'RESULT') {
    badgeElement = (
      <span className="badge badge-accent" style={{ fontSize: '10px' }}>
        Result Out
      </span>
    );
    buttonText = 'View Results';
  }

  const showCountdown = !isExpired && status === 'REGISTRATIONS_OPEN';

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <div style={{ position: 'relative', width: '100%', paddingTop: '50%' }}>
        <img 
          src={competition.image} 
          alt={competition.title} 
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
        />
        {showCountdown && (
          <div style={{ position: 'absolute', bottom: '12px', right: '12px', backgroundColor: 'rgba(0,0,0,0.85)', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', color: 'var(--accent)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--accent)' }}>
            <Clock size={12} /> {timeLeft}
          </div>
        )}
      </div>

      <div style={{ padding: '24px', display: 'flex', flex: 1, flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {badgeElement}
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Users size={12} /> {competition._count?.submissions || 0} entries
          </span>
        </div>

        <h3 style={{ fontSize: '18px', fontWeight: '800', lineHeight: '1.3' }}>{competition.title}</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '63px' }}>
          {competition.description}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-trans)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <Calendar size={14} /> Ends: {new Date(competition.endDate).toLocaleDateString()}
          </div>
          <Link href={`/innotechxperience/${competition.id}`} className="btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }}>
            {buttonText}
          </Link>
        </div>
      </div>
    </div>
  );
}
