import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return null;
  }
  return session;
}

export async function GET(request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden. Admin credentials required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const triggerSend = searchParams.get('send') === 'true';
    const testRecipient = searchParams.get('to') || 'gyanp2552@gmail.com';

    const apiKey = process.env.RESEND_API_KEY || '';
    const fromEmail = process.env.EMAIL_FROM || '';

    const diagnostics = {
      timestamp: new Date().toISOString(),
      resendApiKey: {
        configured: apiKey.trim() !== '',
        length: apiKey.length,
        prefix: apiKey.substring(0, 5),
        suffix: apiKey.substring(apiKey.length - 4),
      },
      emailFrom: {
        configured: fromEmail.trim() !== '',
        value: fromEmail,
      },
      env: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL || 'false',
      }
    };

    let sendResult = null;
    if (triggerSend) {
      console.log(`[DIAGNOSTIC] Sending test email to ${testRecipient}...`);
      try {
        const result = await sendEmail({
          to: testRecipient,
          subject: '🔔 Upgrade Skills - Diagnostic Test Email',
          html: `<p>This is a diagnostic email from the live server of Upgrade Skills.</p>
                 <p>Diagnostics: <strong>API Key Configured:</strong> ${diagnostics.resendApiKey.configured ? 'Yes' : 'No'}</p>`,
          text: `This is a diagnostic email from the live server of Upgrade Skills. API Key Configured: ${diagnostics.resendApiKey.configured ? 'Yes' : 'No'}`
        });
        sendResult = result;
      } catch (err) {
        sendResult = {
          success: false,
          error: err.message || err.toString(),
        };
      }
    }

    return NextResponse.json({
      success: true,
      diagnostics,
      sendResult,
    });
  } catch (error) {
    console.error('Email diagnostics error:', error);
    return NextResponse.json({ error: error.message || 'Diagnostics failed' }, { status: 500 });
  }
}
