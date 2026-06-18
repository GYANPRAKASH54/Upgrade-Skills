import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { token, newPassword } = await request.json();
    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    // Split token to retrieve payload and signature
    const parts = token.split('.');
    if (parts.length !== 2) {
      return NextResponse.json({ error: 'Invalid reset token format' }, { status: 400 });
    }

    const [base64Payload, signature] = parts;
    const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret-for-upgradeskills-lms-platform-dev';
    
    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(base64Payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Reset token signature is invalid. Request rejected.' }, { status: 400 });
    }

    // Decode and verify expiry
    let payload;
    try {
      const decodedJson = Buffer.from(base64Payload, 'base64').toString('utf8');
      payload = JSON.parse(decodedJson);
    } catch (err) {
      return NextResponse.json({ error: 'Reset token payload is corrupted' }, { status: 400 });
    }

    const { email, expiry } = payload;
    if (!email || !expiry) {
      return NextResponse.json({ error: 'Invalid token structure' }, { status: 400 });
    }

    if (Date.now() > expiry) {
      return NextResponse.json({ error: 'Reset token has expired. Please request a new one.' }, { status: 400 });
    }

    // Hash new password using bcryptjs (10 rounds matching standard register)
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(newPassword, salt);

    // Update user in database
    await prisma.user.update({
      where: { email },
      data: { password: passwordHash },
    });

    console.log(`[PASSWORD RESET] User password successfully reset for: ${email}`);

    return NextResponse.json({
      success: true,
      message: 'Your password has been successfully reset! You can now log in.'
    });

  } catch (error) {
    console.error('Reset password endpoint error:', error);
    return NextResponse.json({ error: 'An error occurred during password reset.' }, { status: 500 });
  }
}
