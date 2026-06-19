import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { sendEmail } from '@/lib/email';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { action, courseId, couponCode } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    // Fetch course details to verify existence and price
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Check if user is already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: session.user.id,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      return NextResponse.json({ error: 'You are already enrolled in this course' }, { status: 400 });
    }

    // ACTION: CREATE ORDER
    if (action === 'create') {
      let finalPrice = course.price;
      let appliedCoupon = null;

      if (couponCode) {
        const normalizedCode = couponCode.trim().toUpperCase();
        const coupon = await prisma.coupon.findUnique({
          where: { code: normalizedCode },
        });

        if (coupon && coupon.active && (!coupon.expiresAt || new Date() < new Date(coupon.expiresAt))) {
          appliedCoupon = coupon;
          let discountAmount = 0;
          if (coupon.discountType === 'PERCENTAGE') {
            discountAmount = (course.price * coupon.discountValue) / 100;
          } else if (coupon.discountType === 'FIXED') {
            discountAmount = coupon.discountValue;
          }
          discountAmount = Math.min(discountAmount, course.price);
          finalPrice = Math.max(0, course.price - discountAmount);
        } else {
          return NextResponse.json({ error: 'Invalid or expired coupon code' }, { status: 400 });
        }
      }

      // If price is reduced to 0, return free status immediately
      if (finalPrice === 0) {
        return NextResponse.json({
          success: true,
          isFree: true,
          discountedPrice: 0,
          courseTitle: course.title,
          courseThumbnail: course.thumbnail,
        });
      }

      // Create Razorpay order (amount in paisa: price * 100)
      const amountInPaisa = Math.round(finalPrice * 100);

      const options = {
        amount: amountInPaisa,
        currency: 'INR',
        receipt: `receipt_${session.user.id.substring(0, 8)}_${courseId.substring(0, 8)}`,
      };

      const order = await razorpay.orders.create(options);

      return NextResponse.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID || '',
        courseTitle: course.title,
        courseThumbnail: course.thumbnail,
        discountedPrice: finalPrice,
      });
    }

    // ACTION: ENROLL FREE (using 100% discount coupon)
    if (action === 'enroll_free') {
      if (!couponCode) {
        return NextResponse.json({ error: 'Coupon code is required for free enrollment' }, { status: 400 });
      }

      const normalizedCode = couponCode.trim().toUpperCase();
      const coupon = await prisma.coupon.findUnique({
        where: { code: normalizedCode },
      });

      if (!coupon || !coupon.active || (coupon.expiresAt && new Date() > new Date(coupon.expiresAt))) {
        return NextResponse.json({ error: 'Invalid or expired coupon code' }, { status: 400 });
      }

      let discountAmount = 0;
      if (coupon.discountType === 'PERCENTAGE') {
        discountAmount = (course.price * coupon.discountValue) / 100;
      } else if (coupon.discountType === 'FIXED') {
        discountAmount = coupon.discountValue;
      }

      discountAmount = Math.min(discountAmount, course.price);
      const finalPrice = Math.max(0, course.price - discountAmount);

      if (finalPrice > 0) {
        return NextResponse.json({ error: 'Coupon does not provide a 100% discount' }, { status: 400 });
      }

      // Create free enrollment
      const enrollment = await prisma.enrollment.create({
        data: {
          studentId: session.user.id,
          courseId,
          billingName: session.user.name || 'Student',
          billingPhone: 'N/A',
          billingAddress: 'Coupon Free Access',
          billingCity: 'N/A',
          billingState: 'N/A',
          billingZip: 'N/A',
          razorpayOrderId: `FREE_COUPON_${coupon.code}`,
          razorpayPaymentId: `PAY_FREE_${coupon.code}`,
          couponId: coupon.id,
          discountedPrice: 0,
        },
      });

      // Send invoice email (Price: 0)
      try {
        const invoiceId = enrollment.id;
        const invoiceNum = `US-${invoiceId.substring(0, 8).toUpperCase()}`;
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const invoiceUrl = `${baseUrl}/invoices/invoice_${invoiceId}.html`;

        const subject = `Your Course Invoice Bill for ${course.title} (#${invoiceNum})`;
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Enrollment Confirmation - Upgrade Skills</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #3c3c3c; line-height: 1.6; padding: 20px; background-color: #f9f9f9; margin: 0; }
    .email-container { max-width: 600px; margin: auto; background: #ffffff; border: 2px solid #e5e5e5; border-radius: 12px; box-shadow: 0 4px 0 #e5e5e5; overflow: hidden; }
    .header { background-color: #7c3aed; padding: 30px; text-align: center; color: white; }
    .logo { font-size: 26px; font-weight: 800; margin: 0 0 10px 0; }
    .badge { background: rgba(255,255,255,0.2); border-radius: 99px; padding: 4px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; }
    .content { padding: 30px; }
    .headline { font-size: 20px; font-weight: 800; color: #3c3c3c; margin: 0 0 16px 0; }
    .receipt-details { border: 2px solid #e5e5e5; border-radius: 12px; padding: 20px; background: #fafafa; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .detail-label { color: #777777; }
    .detail-value { font-weight: 700; color: #3c3c3c; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #7c3aed; color: white; text-decoration: none; font-weight: 700; border-radius: 12px; text-transform: uppercase; font-size: 14px; letter-spacing: 0.08em; border-bottom: 4px solid #5b21b6; margin-top: 10px; }
    .footer { text-align: center; font-size: 12px; color: #777777; padding: 20px 30px; border-top: 2px solid #e5e5e5; background: #fafafa; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">Upgrade Skills</div>
      <span class="badge">Payment Confirmed</span>
    </div>
    <div class="content">
      <h2 class="headline">Thank you for your purchase!</h2>
      <p>Hello ${session.user.name}, your payment for the masterclass has been verified successfully. You now have full access to your new learning materials.</p>
      
      <div class="receipt-details">
        <div class="detail-row">
          <span class="detail-label">Invoice Reference:</span>
          <span class="detail-value">#${invoiceNum}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Purchased Course:</span>
          <span class="detail-value">${course.title}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount Paid:</span>
          <span class="detail-value">₹0.00 (Coupon: ${coupon.code})</span>
        </div>
      </div>

      <p style="text-align: center; margin-top: 24px;">
        <a href="${baseUrl}/classroom" class="btn">Start Learning</a>
      </p>
    </div>
    <div class="footer">
      For query support or billing disputes, reach out to help@upgradeskills.co.in.<br>
      © ${new Date().getFullYear()} Upgrade Skills LMS. All rights reserved.
    </div>
  </div>
</body>
</html>`;

        const plainText = `Hello ${session.user.name}, your free enrollment has been successfully completed with coupon ${coupon.code}!`;

        await sendEmail({
          to: session.user.email,
          subject,
          html: htmlContent,
          text: plainText
        });
      } catch (err) {
        console.error('Invoice log failed:', err);
      }

      return NextResponse.json({
        success: true,
        message: 'Free enrollment via coupon created successfully!',
        enrollment,
      });
    }

    // ACTION: VERIFY PAYMENT & ENROLL
    if (action === 'verify') {
      const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature,
        billingName,
        billingPhone,
        billingAddress,
        billingCity,
        billingState,
        billingZip,
        couponCode
      } = body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return NextResponse.json({ error: 'Payment details are missing' }, { status: 400 });
      }

      // Verify the Razorpay signature
      const text = razorpay_order_id + '|' + razorpay_payment_id;
      const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
      
      const generated_signature = crypto
        .createHmac('sha256', keySecret)
        .update(text)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        return NextResponse.json({ error: 'Invalid payment signature. Transaction rejected.' }, { status: 400 });
      }

      let finalPrice = course.price;
      let appliedCouponId = null;

      if (couponCode) {
        const normalizedCode = couponCode.trim().toUpperCase();
        const coupon = await prisma.coupon.findUnique({
          where: { code: normalizedCode },
        });

        if (coupon && coupon.active && (!coupon.expiresAt || new Date() < new Date(coupon.expiresAt))) {
          appliedCouponId = coupon.id;
          let discountAmount = 0;
          if (coupon.discountType === 'PERCENTAGE') {
            discountAmount = (course.price * coupon.discountValue) / 100;
          } else if (coupon.discountType === 'FIXED') {
            discountAmount = coupon.discountValue;
          }
          discountAmount = Math.min(discountAmount, course.price);
          finalPrice = Math.max(0, course.price - discountAmount);
        }
      }

      // Securely enroll student in database after payment verification
      const enrollment = await prisma.enrollment.create({
        data: {
          studentId: session.user.id,
          courseId,
          billingName,
          billingPhone,
          billingAddress,
          billingCity,
          billingState,
          billingZip,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          couponId: appliedCouponId,
          discountedPrice: finalPrice,
        },
      });

      // Generate Course Bill Invoice HTML Reference (served dynamically)
      try {
        const invoiceId = enrollment.id;
        const invoiceNum = `US-${invoiceId.substring(0, 8).toUpperCase()}`;
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const invoiceUrl = `${baseUrl}/invoices/invoice_${invoiceId}.html`;

        const subject = `Your Course Invoice Bill for ${course.title} (#${invoiceNum})`;
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Enrollment Confirmation - Upgrade Skills</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #3c3c3c; line-height: 1.6; padding: 20px; background-color: #f9f9f9; margin: 0; }
    .email-container { max-width: 600px; margin: auto; background: #ffffff; border: 2px solid #e5e5e5; border-radius: 12px; box-shadow: 0 4px 0 #e5e5e5; overflow: hidden; }
    .header { background-color: #7c3aed; padding: 30px; text-align: center; color: white; }
    .logo { font-size: 26px; font-weight: 800; margin: 0 0 10px 0; }
    .badge { background: rgba(255,255,255,0.2); border-radius: 99px; padding: 4px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; }
    .content { padding: 30px; }
    .headline { font-size: 20px; font-weight: 800; color: #3c3c3c; margin: 0 0 16px 0; }
    .receipt-details { border: 2px solid #e5e5e5; border-radius: 12px; padding: 20px; background: #fafafa; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .detail-label { color: #777777; }
    .detail-value { font-weight: 700; color: #3c3c3c; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #7c3aed; color: white; text-decoration: none; font-weight: 700; border-radius: 12px; text-transform: uppercase; font-size: 14px; letter-spacing: 0.08em; border-bottom: 4px solid #5b21b6; margin-top: 10px; }
    .footer { text-align: center; font-size: 12px; color: #777777; padding: 20px 30px; border-top: 2px solid #e5e5e5; background: #fafafa; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">Upgrade Skills</div>
      <span class="badge">Payment Confirmed</span>
    </div>
    <div class="content">
      <h2 class="headline">Thank you for your purchase!</h2>
      <p>Hello ${session.user.name}, your payment for the masterclass has been verified successfully. You now have full access to your new learning materials.</p>
      
      <div class="receipt-details">
        <div class="detail-row">
          <span class="detail-label">Invoice Reference:</span>
          <span class="detail-value">#${invoiceNum}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Purchased Course:</span>
          <span class="detail-value">${course.title}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount Paid:</span>
          <span class="detail-value">₹${finalPrice.toFixed(2)}</span>
        </div>
      </div>

      <p style="text-align: center; margin-top: 24px;">
        <a href="${baseUrl}/classroom" class="btn">Start Learning</a>
        <a href="${invoiceUrl}" class="btn" style="background-color: #ffffff; color: #7c3aed; border: 2px solid #7c3aed; border-bottom: 4px solid #7c3aed; margin-left: 12px;">View Invoice</a>
      </p>
    </div>
    <div class="footer">
      For query support or billing disputes, reach out to help@upgradeskills.co.in.<br>
      © ${new Date().getFullYear()} Upgrade Skills LMS. All rights reserved.
    </div>
  </div>
</body>
</html>`;

        const plainText = `Hello ${session.user.name}, your payment of ₹${finalPrice.toFixed(2)} has been successfully verified! View your invoice at: ${invoiceUrl}`;

        await sendEmail({
          to: session.user.email,
          subject,
          html: htmlContent,
          text: plainText
        });
      } catch (err) {
        console.error('Invoice log failed:', err);
      }

      return NextResponse.json({
        success: true,
        message: 'Payment verified and enrollment created successfully!',
        enrollment,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal checkout error' }, { status: 500 });
  }
}
