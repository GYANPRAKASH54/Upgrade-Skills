import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      // Secure response to prevent user enumeration, but log the event
      console.log(`[PASSWORD RESET] Request received for unregistered email: ${email}`);
      return NextResponse.json({
        success: true,
        message: 'If the email is registered on our platform, a password reset link has been dispatched to it.'
      });
    }

    // Generate time-bounded signed token
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes expiration
    const payload = JSON.stringify({ email: user.email, expiry });
    const base64Payload = Buffer.from(payload).toString('base64');
    
    const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret-for-upgradeskills-lms-platform-dev';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(base64Payload)
      .digest('hex');

    const token = `${base64Payload}.${signature}`;
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

    // Dispatch rich HTML email
    const subject = 'Reset your Upgrade Skills Password';
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Password - Upgrade Skills</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #3c3c3c; line-height: 1.6; padding: 20px; background-color: #f9f9f9; margin: 0; }
    .email-container { max-width: 500px; margin: auto; background: #ffffff; border: 2px solid #e5e5e5; border-radius: 12px; box-shadow: 0 4px 0 #e5e5e5; overflow: hidden; }
    .header { background-color: #a570ff; padding: 30px; text-align: center; color: white; }
    .logo { font-size: 26px; font-weight: 800; margin: 0; }
    .content { padding: 30px; }
    .headline { font-size: 20px; font-weight: 800; color: #3c3c3c; margin: 0 0 16px 0; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #a570ff; color: white; text-decoration: none; font-weight: 700; border-radius: 12px; text-transform: uppercase; font-size: 14px; letter-spacing: 0.08em; border-bottom: 4px solid #7c3aed; margin-top: 10px; }
    .footer { text-align: center; font-size: 12px; color: #777777; padding: 20px 30px; border-top: 2px solid #e5e5e5; background: #fafafa; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">Upgrade Skills</div>
    </div>
    <div class="content">
      <h2 class="headline">Hello ${user.name},</h2>
      <p>We received a request to reset the password for your Upgrade Skills account. Click the button below to choose a new password. This link is valid for 10 minutes.</p>
      
      <p style="text-align: center;">
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </p>

      <p style="font-size: 12px; color: #777777; margin-top: 20px; word-break: break-all;">
        If the button doesn't work, copy and paste this link in your browser:<br>
        <a href="${resetUrl}" style="color: #a570ff;">${resetUrl}</a>
      </p>
      
      <p style="font-size: 12px; color: #777777;">If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} Upgrade Skills LMS. All rights reserved.
    </div>
  </div>
</body>
</html>`;

    await sendEmail({
      to: user.email,
      subject,
      html: htmlContent,
      text: `Hello ${user.name}, reset your password by clicking here: ${resetUrl}`
    });

    return NextResponse.json({
      success: true,
      message: 'If the email is registered on our platform, a password reset link has been dispatched to it.'
    });

  } catch (error) {
    console.error('Forgot password endpoint error:', error);
    return NextResponse.json({ error: 'An error occurred processing your request.' }, { status: 500 });
  }
}
