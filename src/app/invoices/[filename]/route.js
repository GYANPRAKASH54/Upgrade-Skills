import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { filename } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return new Response('Unauthorized. Please sign in.', { status: 401 });
    }

    const enrollmentId = filename.replace('invoice_', '').replace('.html', '');

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
        course: {
          select: { title: true, price: true },
        },
        coupon: {
          select: { code: true },
        },
      },
    });

    if (!enrollment) {
      return new Response('Invoice not found', { status: 404 });
    }

    // Authorization: Only Admin or the student themselves can view the invoice
    if (session.user.role !== 'ADMIN' && session.user.id !== enrollment.student.id) {
      return new Response('Forbidden. You do not have permission to view this invoice.', { status: 403 });
    }

    const invoiceId = enrollment.id;
    const invoiceDate = new Date(enrollment.joinedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const invoiceNum = `US-${invoiceId.substring(0, 8).toUpperCase()}`;
    const originalPrice = enrollment.course?.price || 0;
    const discountedPrice = enrollment.discountedPrice !== null ? enrollment.discountedPrice : originalPrice;
    const discountAmount = originalPrice - discountedPrice;
    const platformFee = Number((discountedPrice * 0.03).toFixed(2));
    const gst = Number((discountedPrice * 0.18).toFixed(2));
    const totalPaid = Number((discountedPrice + platformFee + gst).toFixed(2));

    const invoiceHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - Upgrade Skills</title>
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
      <div class="logo-title">Upgrade Skills</div>
      <div class="invoice-title">INVOICE<br><span style="font-size: 14px; font-weight: 500; color: #666;">#${invoiceNum}</span></div>
    </div>
    
    <div class="details">
      <div>
        <div class="section-title">Billing To:</div>
        <div class="info">
          <strong>${enrollment.billingName || enrollment.student.name}</strong><br>
          Phone: ${enrollment.billingPhone || 'N/A'}<br>
          Address: ${enrollment.billingAddress || 'N/A'},<br>
          ${enrollment.billingCity || ''}, ${enrollment.billingState || ''} - ${enrollment.billingZip || ''}
        </div>
      </div>
      <div style="text-align: right;">
        <div class="section-title">Invoice Details:</div>
        <div class="info">
          Date: ${invoiceDate}<br>
          Email: ${enrollment.student.email}<br>
          Payment ID: ${enrollment.razorpayPaymentId || 'N/A'}<br>
          Order ID: ${enrollment.razorpayOrderId || 'N/A'}
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
            <strong>${enrollment.course?.title || 'Unknown Course'}</strong><br>
            <span style="font-size: 12px; color: #666;">LMS Online Learning Course Masterclass Access</span>
          </td>
          <td style="text-align: right; font-weight: 700;">₹${originalPrice.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
    
    <div class="totals">
      <div>Base Price: ₹${originalPrice.toFixed(2)}</div>
      ${enrollment.coupon ? `<div style="color: #7c3aed; font-weight: 700;">Coupon Discount (${enrollment.coupon.code}): -₹${discountAmount.toFixed(2)}</div>` : ''}
      <div>Subtotal: ₹${discountedPrice.toFixed(2)}</div>
      <div>Platform Fee (3%): ₹${platformFee.toFixed(2)}</div>
      <div>GST (18%): ₹${gst.toFixed(2)}</div>
      <div class="amount">Total Paid: ₹${totalPaid.toFixed(2)}</div>
    </div>
    
    <div class="footer">
      Thank you for purchasing from Upgrade Skills!<br>
      For query support, reach out to help@upgradeskills.co.in
    </div>
  </div>
</body>
</html>`;

    return new Response(invoiceHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Invoice rendering error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
