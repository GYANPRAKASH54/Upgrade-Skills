import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail, sendEmailBatch } from '@/lib/email';

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

    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { name: true, email: true },
    });

    // Let's construct a batch payload
    const batchEmails = students.map((student) => {
      const subject = `🔔 Upgrade Skills - Test Batch Dispatch`;
      const htmlContent = `<p>Hello ${student.name || 'Learner'},</p>
                           <p>This is a live test dispatch using Resend's native Batch API.</p>`;
      return {
        to: student.email,
        subject,
        html: htmlContent,
      };
    });

    const batchResult = await sendEmailBatch(batchEmails);

    return NextResponse.json({
      success: true,
      studentsCount: students.length,
      batchResult,
    });
  } catch (error) {
    console.error('Send-all diagnostics error:', error);
    return NextResponse.json({ error: error.message || 'Diagnostics failed' }, { status: 500 });
  }
}
