import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Regex check for basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    // Check if email already subscribed
    const existing = await prisma.newsletterSubscription.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json({ error: 'This email is already subscribed!' }, { status: 400 });
    }

    // Save subscription
    const subscription = await prisma.newsletterSubscription.create({
      data: { email: normalizedEmail },
    });

    // Send welcome email simulation
    try {
      const subject = 'Welcome to the Upgrade Skills Newsletter!';
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome - Upgrade Skills</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #3c3c3c; line-height: 1.6; padding: 20px; background-color: #f9f9f9; margin: 0; }
    .email-container { max-width: 500px; margin: auto; background: #ffffff; border: 2px solid #e5e5e5; border-radius: 12px; box-shadow: 0 4px 0 #e5e5e5; overflow: hidden; }
    .header { background-color: #7c3aed; padding: 30px; text-align: center; color: white; }
    .logo { font-size: 26px; font-weight: 800; margin: 0; }
    .content { padding: 30px; }
    .headline { font-size: 20px; font-weight: 800; color: #3c3c3c; margin: 0 0 16px 0; }
    .footer { text-align: center; font-size: 12px; color: #777777; padding: 20px 30px; border-top: 2px solid #e5e5e5; background: #fafafa; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">Upgrade Skills</div>
    </div>
    <div class="content">
      <h2 class="headline">You're on the list! 🎉</h2>
      <p>Hello,</p>
      <p>Thanks for subscribing to the Upgrade Skills newsletter! You'll be the first to know about new design contests, mobile fashion photography challenges, and course launches.</p>
      <p>In the meantime, you can explore active challenges or browse our masterclass curriculum.</p>
    </div>
    <div class="footer">
      If you did not sign up for this newsletter, you can safely ignore this email.<br>
      © ${new Date().getFullYear()} Upgrade Skills LMS. All rights reserved.
    </div>
  </div>
</body>
</html>`;

      const plainText = `Thanks for subscribing to the Upgrade Skills newsletter! You'll be the first to know about new design contests and course launches.`;

      await sendEmail({
        to: normalizedEmail,
        subject,
        html: htmlContent,
        text: plainText,
      });
    } catch (err) {
      console.error('Newsletter welcome email failed:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to the newsletter!',
      subscription,
    }, { status: 201 });

  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return NextResponse.json({ error: 'Failed to subscribe. Please try again.' }, { status: 500 });
  }
}
