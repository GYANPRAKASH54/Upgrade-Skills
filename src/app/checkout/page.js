'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCart } from '@/components/Providers';
import { CreditCard, Shield, CheckCircle, ShieldAlert } from 'lucide-react';
import styles from './Checkout.module.css';

function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId');
  const { data: session } = useSession();
  const { removeFromCart } = useCart();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Billing form states
  const [billingName, setBillingName] = useState('');
  const [billingPhone, setBillingPhone] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('');
  const [billingZip, setBillingZip] = useState('');

  // Coupon states
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMsg, setCouponMsg] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountedPrice, setDiscountedPrice] = useState(0);

  // Prefill billing name from session
  useEffect(() => {
    if (session?.user?.name) {
      setBillingName((prev) => prev || session.user.name);
    }
  }, [session]);

  // Load course details
  useEffect(() => {
    if (!courseId) {
      setError('No course specified for checkout.');
      setLoading(false);
      return;
    }

    async function fetchCourseDetails() {
      try {
        const res = await fetch(`/api/courses/${courseId}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to load course details.');
        } else {
          setCourse(data.course);
          setDiscountedPrice(data.course.price);
          if (data.isEnrolled) {
            setSuccess(true);
          }
        }
      } catch (err) {
        console.error(err);
        setError('Error fetching course data.');
      } finally {
        setLoading(false);
      }
    }

    fetchCourseDetails();
  }, [courseId]);

  // Load Razorpay script dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!session) {
      router.push(`/auth/signin?callbackUrl=/checkout?courseId=${courseId}`);
      return;
    }

    if (!billingName.trim() || !billingPhone.trim() || !billingAddress.trim() || !billingCity.trim() || !billingState.trim() || !billingZip.trim()) {
      setError('Please fill in all billing information fields before proceeding to payment.');
      setPaymentLoading(false);
      return;
    }

    setError('');
    setPaymentLoading(true);

    try {
      // 1. Create Razorpay order on server
      const orderRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', courseId, couponCode: appliedCoupon?.code }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        setError(orderData.error || 'Failed to initiate checkout.');
        setPaymentLoading(false);
        return;
      }

      // 2. Load script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError('Razorpay SDK failed to load. Are you offline?');
        setPaymentLoading(false);
        return;
      }

      // 3. Open Razorpay checkout options
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Upgrade Skills',
        description: orderData.courseTitle,
        image: orderData.courseThumbnail,
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            // Verify payment on server
             const verifyRes = await fetch('/api/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'verify',
                courseId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                billingName,
                billingPhone,
                billingAddress,
                billingCity,
                billingState,
                billingZip,
                couponCode: appliedCoupon?.code,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok) {
              setSuccess(true);
              removeFromCart(courseId); // Clean cart item
            } else {
              setError(verifyData.error || 'Payment verification failed.');
            }
          } catch (err) {
            console.error(err);
            setError('Error verifying payment.');
          } finally {
            setPaymentLoading(false);
          }
        },
        prefill: {
          name: session.user.name,
          email: session.user.email,
        },
        theme: {
          color: '#7c3aed', // Purple primary theme matching design
        },
        modal: {
          ondismiss: function () {
            setPaymentLoading(false);
          },
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      console.error(err);
      setError('Checkout failed. Please try again.');
      setPaymentLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setCouponLoading(true);
    setCouponMsg(null);

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCodeInput, courseId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCouponMsg({ type: 'error', text: data.error || 'Failed to apply coupon.' });
      } else {
        setAppliedCoupon(data.coupon);
        setDiscountAmount(data.discountAmount);
        setDiscountedPrice(data.discountedPrice);
        setCouponMsg({ type: 'success', text: `Coupon applied: ${data.coupon.code} (Saved ₹${data.discountAmount})` });
      }
    } catch (err) {
      console.error(err);
      setCouponMsg({ type: 'error', text: 'Error applying coupon code.' });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setDiscountedPrice(course?.price || 0);
    setCouponCodeInput('');
    setCouponMsg(null);
  };

  const handleFreeEnrollment = async () => {
    if (!session) {
      router.push(`/auth/signin?callbackUrl=/checkout?courseId=${courseId}`);
      return;
    }

    setError('');
    setPaymentLoading(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enroll_free',
          courseId,
          couponCode: appliedCoupon?.code,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to complete free enrollment.');
      } else {
        setSuccess(true);
        removeFromCart(courseId);
      }
    } catch (err) {
      console.error(err);
      setError('Error enrolling in course.');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-primary)', textAlign: 'center', padding: '60px' }}>Loading checkout portal...</div>;
  }

  if (success) {
    return (
      <div className="glass-card" style={{ maxWidth: '480px', margin: '60px auto', padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <CheckCircle size={56} style={{ color: '#4ade80' }} />
        <h2 style={{ fontSize: '24px', fontWeight: '800' }}> Enrolled Confirmed!</h2>
        <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
          You have successfully enrolled in <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{course?.title}</span>. Access your video classroom dashboard immediately.
        </p>
        <div style={{ 
          padding: '12px 16px', 
          backgroundColor: 'rgba(74, 222, 128, 0.1)', 
          border: '1px solid rgba(74, 222, 128, 0.2)', 
          borderRadius: 'var(--radius-sm)', 
          color: '#4ade80', 
          fontSize: '13px', 
          fontWeight: '600',
          textAlign: 'left',
          width: '100%'
        }}>
          ✓ Enrollment is successful! A confirmation receipt has been sent to your registered email: <strong>{session?.user?.email}</strong>
        </div>
        <button 
          onClick={() => router.push(`/classroom/${courseId}`)}
          className="btn-primary" 
          style={{ width: '100%', padding: '12px' }}
        >
          Enter Classroom
        </button>
      </div>
    );
  }

  const basePrice = course?.price || 0;
  const currentPostCouponPrice = discountedPrice;
  const platformFee = Number((currentPostCouponPrice * 0.03).toFixed(2));
  const gst = Number((currentPostCouponPrice * 0.18).toFixed(2));
  const finalTotal = Number((currentPostCouponPrice + platformFee + gst).toFixed(2));

  return (
    <div className={styles.container}>
      {/* Left pane: Details */}
      <div className={styles.leftPane}>
        <h2 className={styles.title}>Secure Checkout</h2>
        
        {error && (
          <div className={styles.errorBanner}>
            <ShieldAlert size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            {error}
          </div>
        )}

        <div className={`glass-card ${styles.courseCard}`}>
          <img src={course?.thumbnail} alt={course?.title} className={styles.courseThumbnail} />
          <div className={styles.courseDetails}>
            <h3 className={styles.courseTitle}>{course?.title}</h3>
            <p className={styles.courseInstructor}>Instructor: {course?.instructor?.name}</p>
          </div>
        </div>

        {/* Billing Information Form */}
        <div className={`glass-card ${styles.billingCard}`}>
          <h3 className={styles.billingTitle}>Billing Information</h3>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Full Name *</label>
              <input
                type="text"
                placeholder="Billing Name"
                value={billingName}
                onChange={(e) => setBillingName(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Phone Number *</label>
              <input
                type="text"
                placeholder="Phone Number"
                value={billingPhone}
                onChange={(e) => setBillingPhone(e.target.value)}
                className="form-input"
                required
              />
            </div>
          </div>

          <div className={styles.formRowSingle}>
            <label className={styles.label}>Street Address *</label>
            <input
              type="text"
              placeholder="e.g. Flat 101, Building Name, Street Road"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div className={styles.formRow3}>
            <div className={styles.formGroup}>
              <label className={styles.label}>City *</label>
              <input
                type="text"
                placeholder="City"
                value={billingCity}
                onChange={(e) => setBillingCity(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>State *</label>
              <input
                type="text"
                placeholder="State"
                value={billingState}
                onChange={(e) => setBillingState(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Zip Code *</label>
              <input
                type="text"
                placeholder="e.g. 110001"
                value={billingZip}
                onChange={(e) => setBillingZip(e.target.value)}
                className="form-input"
                required
              />
            </div>
          </div>
        </div>

        <div className={styles.securityNote}>
          <Shield size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span>SSL Secure 256-bit encrypted checkout via Razorpay.</span>
        </div>
      </div>

      {/* Right pane: Summary & Button */}
      <div className={`glass-card ${styles.summaryCard}`}>
        <h3 className={styles.summaryTitle}>Summary</h3>
        
        <div className={styles.summaryRow}>
          <span>Course Price:</span>
          <span>₹{basePrice.toFixed(2)}</span>
        </div>
        {appliedCoupon && (
          <>
            <div className={styles.summaryRow} style={{ color: 'var(--primary)', fontWeight: '700' }}>
              <span>Coupon Discount ({appliedCoupon.code}):</span>
              <span>-₹{discountAmount.toFixed(2)}</span>
            </div>
            <div className={styles.summaryRow} style={{ borderTop: '1px dashed var(--border-trans)', paddingTop: '8px', marginTop: '8px' }}>
              <span>Discounted Price:</span>
              <span>₹{currentPostCouponPrice.toFixed(2)}</span>
            </div>
          </>
        )}
        <div className={styles.summaryRow}>
          <span>Platform Fee (3%):</span>
          <span>₹{platformFee.toFixed(2)}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>GST (18%):</span>
          <span>₹{gst.toFixed(2)}</span>
        </div>
        <div className={styles.summaryTotalRow} style={{ borderTop: '2px solid var(--border-trans)', paddingTop: '12px', marginTop: '12px' }}>
          <span>Total to Pay:</span>
          <span className="text-gradient">₹{finalTotal.toFixed(2)}</span>
        </div>

        {/* Coupon Section */}
        <div style={{ marginTop: '16px', marginBottom: '24px', borderTop: '2px solid var(--border-trans)', paddingTop: '16px' }}>
          <label className={styles.label} style={{ marginBottom: '8px', display: 'block' }}>Promo/Coupon Code</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="e.g. SAVE10"
              value={couponCodeInput}
              onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
              className="form-input"
              style={{ flexGrow: 1, padding: '8px 12px', fontSize: '14px', textTransform: 'uppercase' }}
              disabled={appliedCoupon}
            />
            {appliedCoupon ? (
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="btn-primary"
                style={{ padding: '8px 12px', fontSize: '13px', whiteSpace: 'nowrap', backgroundColor: '#ef4444', boxShadow: '0 4px 0 #b91c1c' }}
              >
                Remove
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="btn-primary"
                style={{ padding: '8px 12px', fontSize: '13px', whiteSpace: 'nowrap' }}
                disabled={!couponCodeInput.trim() || couponLoading}
              >
                {couponLoading ? '...' : 'Apply'}
              </button>
            )}
          </div>
          {couponMsg && (
            <div style={{ 
              fontSize: '12px', 
              marginTop: '6px', 
              color: couponMsg.type === 'success' ? '#10b981' : '#ef4444',
              fontWeight: '700'
            }}>
              {couponMsg.text}
            </div>
          )}
        </div>

        {finalTotal === 0 ? (
          <button 
            onClick={handleFreeEnrollment}
            disabled={paymentLoading}
            className={`btn-primary ${styles.payButton}`}
            style={{ backgroundColor: '#10b981', boxShadow: '0 4px 0 #059669' }}
          >
            {paymentLoading ? 'Enrolling...' : 'Claim Free Access'}
          </button>
        ) : (
          <button 
            onClick={handlePayment}
            disabled={paymentLoading}
            className={`btn-primary ${styles.payButton}`}
          >
            <CreditCard size={18} /> {paymentLoading ? 'Processing...' : 'Pay with Razorpay'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div style={{ minHeight: 'calc(100vh - 160px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <Suspense fallback={<div style={{ color: 'var(--text-primary)' }}>Loading checkout form...</div>}>
        <CheckoutForm />
      </Suspense>
    </div>
  );
}
