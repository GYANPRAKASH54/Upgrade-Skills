import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
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

    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { name: true, email: true },
    });

    const results = [];

    // Let's send a test email to each student and record the response
    const emailPromises = students.map(async (student) => {
      const subject = `🔔 Upgrade Skills - Test Parallel Dispatch`;
      const htmlContent = `<p>Hello ${student.name || 'Learner'},</p>
                           <p>This is a live test dispatch of the parallel emailing system.</p>`;
      
      try {
        const res = await sendEmail({
          to: student.email,
          subject,
          html: htmlContent,
        });
        return {
          email: student.email,
          success: res.success,
          id: res.id || null,
          simulated: res.simulated || false,
          error: res.error || null,
        };
      } catch (err) {
        return {
          email: student.email,
          success: false,
          error: err.message || err.toString(),
        };
      }
    });

    const settledResults = await Promise.all(emailPromises);

    return NextResponse.json({
      success: true,
      studentsCount: students.length,
      settledResults,
    });
  } catch (error) {
    console.error('Send-all diagnostics error:', error);
    return NextResponse.json({ error: error.message || 'Diagnostics failed' }, { status: 500 });
  }
}
