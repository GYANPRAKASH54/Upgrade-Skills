import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { createAuditLog } from '@/lib/audit';

export async function POST(request) {
  try {
    const bodyText = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'upgradeskills_webhook_secret';

    if (!signature) {
      await createAuditLog({
        action: 'WEBHOOK_SIGNATURE_MISSING',
        details: { message: 'Missing x-razorpay-signature header' }
      });
      return NextResponse.json({ error: 'Signature is missing' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyText)
      .digest('hex');

    if (expectedSignature !== signature) {
      await createAuditLog({
        action: 'WEBHOOK_SIGNATURE_INVALID',
        details: { signature, expectedSignature }
      });
      return NextResponse.json({ error: 'Signature is invalid' }, { status: 400 });
    }

    const payload = JSON.parse(bodyText);
    const event = payload.event;

    // Handle payment.captured or order.paid
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderEntity = payload.payload?.order?.entity;
      
      const notes = paymentEntity?.notes || orderEntity?.notes;
      if (!notes || !notes.courseId || !notes.studentId) {
        // Ignored if this is not a course purchase (e.g. legacy/manual link payment)
        console.log('[RAZORPAY WEBHOOK] Payment captured without integration notes:', paymentEntity?.id);
        return NextResponse.json({ status: 'ignored', message: 'No integration notes present.' });
      }

      const {
        courseId,
        studentId,
        studentEmail,
        couponCode,
        billingName,
        billingPhone,
        billingAddress,
        billingCity,
        billingState,
        billingZip
      } = notes;

      // Check if user is already enrolled
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId,
          },
        },
      });

      if (existingEnrollment) {
        console.log(`[RAZORPAY WEBHOOK] Student ${studentId} is already enrolled in ${courseId}. Ignoring callback.`);
        return NextResponse.json({ status: 'duplicate', message: 'Enrollment already exists.' });
      }

      // Fetch course details
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        console.error(`[RAZORPAY WEBHOOK] Course not found: ${courseId}`);
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }

      // Fetch student details
      const student = await prisma.user.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        console.error(`[RAZORPAY WEBHOOK] Student not found: ${studentId}`);
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      // Calculate final pricing based on coupon notes (if any)
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

      // Calculate platform fee and GST for receipt display
      const platformFee = Number((finalPrice * 0.03).toFixed(2));
      const gst = Number((finalPrice * 0.18).toFixed(2));
      const totalAmount = Number((finalPrice + platformFee + gst).toFixed(2));

      const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id || 'N/A';
      const razorpayPaymentId = paymentEntity?.id || 'N/A';

      // Create enrollment record
      const enrollment = await prisma.enrollment.create({
        data: {
          studentId,
          courseId,
          billingName: billingName || student.name,
          billingPhone: billingPhone || 'N/A',
          billingAddress: billingAddress || 'N/A',
          billingCity: billingCity || 'N/A',
          billingState: billingState || 'N/A',
          billingZip: billingZip || 'N/A',
          razorpayOrderId,
          razorpayPaymentId,
          couponId: appliedCouponId,
          discountedPrice: finalPrice,
        },
      });

      // Audit log the asynchronous Webhook Enrollment
      await createAuditLog({
        userId: studentId,
        userEmail: studentEmail || student.email,
        action: 'WEBHOOK_ENROLLMENT',
        details: { enrollmentId: enrollment.id, razorpayOrderId, razorpayPaymentId, amountPaid: totalAmount },
      });

      // Dispatch Invoice Email
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
      <p>Hello ${student.name || 'Student'}, your payment for the masterclass has been verified successfully. You now have full access to your new learning materials.</p>
      
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
          <span class="detail-label">Original Course Price:</span>
          <span class="detail-value">₹${course.price.toFixed(2)}</span>
        </div>
        ${couponCode ? `
        <div class="detail-row" style="color: #7c3aed; font-weight: bold;">
          <span class="detail-label">Coupon Discount:</span>
          <span class="detail-value">-₹${(course.price - finalPrice).toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="detail-row">
          <span class="detail-label">Platform Fee (3%):</span>
          <span class="detail-value">₹${platformFee.toFixed(2)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">GST (18%):</span>
          <span class="detail-value">₹${gst.toFixed(2)}</span>
        </div>
        <div class="detail-row" style="border-top: 1px solid #e5e5e5; padding-top: 8px; margin-top: 8px; font-size: 16px;">
          <span class="detail-label" style="font-weight: 800; color: #3c3c3c;">Total Amount Paid:</span>
          <span class="detail-value" style="font-weight: 800; color: #7c3aed;">₹${totalAmount.toFixed(2)}</span>
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

        const plainText = `Hello ${student.name || 'Student'}, your payment of ₹${totalAmount.toFixed(2)} has been successfully verified! View your invoice at: ${invoiceUrl}`;

        await sendEmail({
          to: student.email,
          subject,
          html: htmlContent,
          text: plainText
        });
      } catch (err) {
        console.error('[RAZORPAY WEBHOOK] Failed to dispatch invoice email:', err);
      }

      return NextResponse.json({ success: true, message: 'Webhook enrollment successful!' });
    }

    return NextResponse.json({ status: 'ignored', message: `Event '${event}' is not handled.` });
  } catch (error) {
    console.error('[RAZORPAY WEBHOOK ERROR]:', error);
    return NextResponse.json({ error: 'Internal webhook error' }, { status: 500 });
  }
}
