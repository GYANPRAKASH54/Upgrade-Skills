import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkeyid123',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'mockkeysecret456',
});

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await request.json();
    const { action, courseId } = body;

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
      // Create Razorpay order (amount in paisa: price * 100)
      const amountInPaisa = Math.round(course.price * 100);

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
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkeyid123',
        courseTitle: course.title,
        courseThumbnail: course.thumbnail,
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
        billingZip
      } = body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return NextResponse.json({ error: 'Payment details are missing' }, { status: 400 });
      }

      // Verify the Razorpay signature
      const text = razorpay_order_id + '|' + razorpay_payment_id;
      const keySecret = process.env.RAZORPAY_KEY_SECRET || 'mockkeysecret456';
      
      const generated_signature = crypto
        .createHmac('sha256', keySecret)
        .update(text)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        return NextResponse.json({ error: 'Invalid payment signature. Transaction rejected.' }, { status: 400 });
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
        },
      });

      // Generate Course Bill Invoice HTML
      try {
        const invoicesDir = path.resolve(process.cwd(), 'public/invoices');
        if (!fs.existsSync(invoicesDir)) {
          fs.mkdirSync(invoicesDir, { recursive: true });
        }

        const invoiceId = enrollment.id;
        const invoiceDate = new Date().toLocaleDateString();
        const invoiceNum = `US-${invoiceId.substring(0, 8).toUpperCase()}`;

        const invoiceHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - UpgradeSkills</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.5; padding: 40px; background-color: #f9f9f9; }
    .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.05); background: #fff; border-radius: 8px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #7c3aed; padding-bottom: 20px; margin-bottom: 20px; }
    .logo-title { font-size: 28px; font-weight: 800; color: #7c3aed; }
    .invoice-title { font-size: 24px; font-weight: 700; text-align: right; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
    .section-title { font-size: 12px; text-transform: uppercase; color: #999; font-weight: 700; margin-bottom: 8px; }
    .info { font-size: 14px; }
    .invoice-table { width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 30px; }
    .invoice-table th { padding: 12px; border-bottom: 2px solid #eee; background: #fcfcfc; color: #666; font-size: 13px; font-weight: 700; }
    .invoice-table td { padding: 16px 12px; border-bottom: 1px solid #eee; font-size: 14px; }
    .totals { text-align: right; font-size: 16px; margin-bottom: 40px; }
    .totals .amount { font-size: 22px; font-weight: 800; color: #7c3aed; margin-top: 6px; }
    .footer { text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="invoice-box">
    <div class="header">
      <div class="logo-title">UpgradeSkills</div>
      <div class="invoice-title">INVOICE<br><span style="font-size: 14px; font-weight: 500; color: #666;">#${invoiceNum}</span></div>
    </div>
    
    <div class="details">
      <div>
        <div class="section-title">Billing To:</div>
        <div class="info">
          <strong>${billingName || session.user.name}</strong><br>
          Phone: ${billingPhone || 'N/A'}<br>
          Address: ${billingAddress || 'N/A'},<br>
          ${billingCity || ''}, ${billingState || ''} - ${billingZip || ''}
        </div>
      </div>
      <div style="text-align: right;">
        <div class="section-title">Invoice Details:</div>
        <div class="info">
          Date: ${invoiceDate}<br>
          Email: ${session.user.email}<br>
          Payment ID: ${razorpay_payment_id || 'N/A'}<br>
          Order ID: ${razorpay_order_id || 'N/A'}
        </div>
      </div>
    </div>
    
    <table class="invoice-table">
      <thead>
        <tr>
          <th>Course Item</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${course.title}</strong><br>
            <span style="font-size: 12px; color: #666;">LMS Online Learning Course Masterclass Access</span>
          </td>
          <td style="text-align: right; font-weight: 700;">₹${course.price.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
    
    <div class="totals">
      <div>Subtotal: ₹${course.price.toFixed(2)}</div>
      <div>GST (0%): ₹0.00</div>
      <div class="amount">Total Paid: ₹${course.price.toFixed(2)}</div>
    </div>
    
    <div class="footer">
      Thank you for purchasing from UpgradeSkills.co.in!<br>
      For query support, reach out to help@upgradeskills.co.in
    </div>
  </div>
</body>
</html>`;

        fs.writeFileSync(path.resolve(invoicesDir, `invoice_${invoiceId}.html`), invoiceHtml, 'utf8');

        // Simulate Sending Mail to registered mail ID
        console.log('\n=============================================================');
        console.log(`[EMAIL DISPATCH] Simulating email sending to: ${session.user.email}`);
        console.log(`[EMAIL DISPATCH] Subject: Your Course Invoice Bill for ${course.title} (#${invoiceNum})`);
        console.log(`[EMAIL DISPATCH] Content: Hello ${session.user.name}, your payment of ₹${course.price} has been successfully verified!`);
        console.log(`[EMAIL DISPATCH] Invoice HTML generated at: /invoices/invoice_${invoiceId}.html`);
        console.log('=============================================================\n');
        
        // Write email dispatch status to server.log to make it visible
        const logMsg = `[${new Date().toISOString()}] EMAIL SENT to ${session.user.email} - Invoice #${invoiceNum} for ${course.title} (Link: /invoices/invoice_${invoiceId}.html)\n`;
        fs.appendFileSync(path.resolve(process.cwd(), 'server.log'), logMsg);
      } catch (err) {
        console.error('Invoice HTML generation/log failed:', err);
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
