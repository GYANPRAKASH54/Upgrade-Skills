'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/Providers';
import { Check, Play, ShoppingCart, CreditCard } from 'lucide-react';
import styles from './CourseDetail.module.css';

export default function CourseSidebarCard({ course, isEnrolled }) {
  const router = useRouter();
  const { addToCart, isInCart } = useCart();

  const handleAddToCart = () => {
    addToCart({
      id: course.id,
      title: course.title,
      price: course.price,
      thumbnail: course.thumbnail,
    });
  };

  const inCart = isInCart(course.id);

  return (
    <div className={styles.sidebarCard}>
      <img src={course.thumbnail} alt={course.title} className={styles.sidebarThumbnail} />
      
      {isEnrolled ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#4ade80', textAlign: 'center' }}>
            You are enrolled in this course
          </div>
          <Link href={`/classroom/${course.id}`} className="btn-primary" style={{ width: '100%' }}>
            <Play size={18} fill="currentColor" /> Go to Classroom
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className={styles.priceText}>₹{course.price}</div>
          
          <button 
            onClick={handleAddToCart}
            className={inCart ? 'btn-secondary' : 'btn-primary'} 
            style={{ width: '100%' }}
          >
            <ShoppingCart size={18} /> {inCart ? 'Already in Cart' : 'Add to Cart'}
          </button>
          
          <Link 
            href={`/checkout?courseId=${course.id}`} 
            className="btn-primary" 
            style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent), var(--primary))' }}
          >
            <CreditCard size={18} /> Buy Now (Razorpay)
          </Link>
        </div>
      )}

      {/* Features */}
      <ul className={styles.featuresList}>
        <li className={styles.featureItem}>
          <Check size={16} style={{ color: 'var(--accent)' }} />
          <span>Full lifetime access</span>
        </li>
        <li className={styles.featureItem}>
          <Check size={16} style={{ color: 'var(--accent)' }} />
          <span>Access on mobile and TV</span>
        </li>
        <li className={styles.featureItem}>
          <Check size={16} style={{ color: 'var(--accent)' }} />
          <span>Certificate of completion</span>
        </li>
        <li className={styles.featureItem}>
          <Check size={16} style={{ color: 'var(--accent)' }} />
          <span>Real-world case studies</span>
        </li>
      </ul>
    </div>
  );
}
