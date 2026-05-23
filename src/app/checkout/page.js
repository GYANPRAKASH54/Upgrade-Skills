'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCart } from '@/components/Providers';
import { CreditCard, Shield, CheckCircle, ShieldAlert } from 'lucide-react';

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
        body: JSON.stringify({ action: 'create', courseId }),
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
        name: 'UpgradeSkills',
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

  if (loading) {
    return <div style={{ color: 'white', textAlign: 'center', padding: '60px' }}>Loading checkout portal...</div>;
  }

  if (success) {
    return (
      <div className="glass-card" style={{ maxWidth: '480px', margin: '60px auto', padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <CheckCircle size={56} style={{ color: '#4ade80' }} />
        <h2 style={{ fontSize: '24px', fontWeight: '800' }}> Enrolled Confirmed!</h2>
        <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
          You have successfully enrolled in <span style={{ fontWeight: 700, color: 'white' }}>{course?.title}</span>. Access your video classroom dashboard immediately.
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
          ✓ A professional course bill/invoice has been successfully generated and sent to your registered email: <strong>{session?.user?.email}</strong>
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

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px 80px 0', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '40px' }}>
      {/* Left pane: Details */}
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '20px' }}>Secure Checkout</h2>
        
        {error && (
          <div style={{ backgroundColor: 'rgba(255, 77, 77, 0.1)', border: '1px solid rgba(255, 77, 77, 0.2)', color: '#ff4d4d', padding: '16px', borderRadius: 'var(--radius-sm)', fontSize: '14px', marginBottom: '20px' }}>
            <ShieldAlert size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            {error}
          </div>
        )}

        <div className="glass-card" style={{ padding: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <img src={course?.thumbnail} alt={course?.title} style={{ width: '100px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{course?.title}</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Instructor: {course?.instructor?.name}</p>
          </div>
        </div>

        {/* Billing Information Form */}
        <div className="glass-card" style={{ padding: '24px', marginTop: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', borderBottom: '1px solid var(--border-trans)', paddingBottom: '8px' }}>Billing Information</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Full Name *</label>
              <input
                type="text"
                placeholder="Billing Name"
                value={billingName}
                onChange={(e) => setBillingName(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Phone Number *</label>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Street Address *</label>
            <input
              type="text"
              placeholder="e.g. Flat 101, Building Name, Street Road"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>City *</label>
              <input
                type="text"
                placeholder="City"
                value={billingCity}
                onChange={(e) => setBillingCity(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>State *</label>
              <input
                type="text"
                placeholder="State"
                value={billingState}
                onChange={(e) => setBillingState(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Zip Code *</label>
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

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
          <Shield size={16} style={{ color: 'var(--accent)' }} />
          <span>SSL Secure 256-bit encrypted checkout via Razorpay sandbox.</span>
        </div>
      </div>

      {/* Right pane: Summary & Button */}
      <div className="glass-card" style={{ padding: '24px', height: 'fit-content' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', borderBottom: '1px solid var(--border-trans)', paddingBottom: '10px' }}>Summary</h3>
        
        <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          <span>Price:</span>
          <span>₹{course?.price}</span>
        </div>
        <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '24px', fontSize: '15px', fontWeight: '700' }}>
          <span>Total:</span>
          <span className="text-gradient">₹{course?.price}</span>
        </div>

        <button 
          onClick={handlePayment}
          disabled={paymentLoading}
          className="btn-primary" 
          style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, var(--accent), var(--primary))' }}
        >
          <CreditCard size={18} /> {paymentLoading ? 'Processing...' : 'Pay with Razorpay'}
        </button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div style={{ minHeight: 'calc(100vh - 160px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <Suspense fallback={<div style={{ color: 'white' }}>Loading checkout form...</div>}>
        <CheckoutForm />
      </Suspense>
    </div>
  );
}
