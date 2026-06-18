const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
require('dotenv').config();

// Initialize prisma
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Resend sendEmail function matching project logic
async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'Upgrade Skills <team@upgradeskills.co.in>';

  if (apiKey && apiKey.trim() !== "") {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to,
          subject,
          html,
          text: html.replace(/<[^>]*>/g, ''), // Strip html tags
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send email via Resend API');
      }
      console.log(`[SUCCESS] Dispatched email to ${to} (ID: ${data.id})`);
      return { success: true, id: data.id };
    } catch (err) {
      console.error(`[ERROR] Failed to send to ${to}:`, err.message);
      return { success: false, error: err.message };
    }
  } else {
    console.log(`[SIMULATION] Simulated email to ${to}`);
    return { success: true, simulated: true };
  }
}

async function main() {
  // CONFIGURATION: Customize your promotion details here!
  const subject = "🚀 Level Up Your Career: 50% Off All Masterclasses!";
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Special Promotion - Upgrade Skills</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #3c3c3c; line-height: 1.6; padding: 20px; background-color: #f9f9f9; }
        .container { max-width: 600px; margin: auto; background: #ffffff; border: 2px solid #e5e5e5; border-radius: 12px; box-shadow: 0 4px 0 #e5e5e5; overflow: hidden; }
        .header { background-color: #58cc02; padding: 30px; text-align: center; color: white; }
        .content { padding: 30px; }
        .btn { display: inline-block; padding: 12px 24px; background-color: #58cc02; color: white; text-decoration: none; font-weight: 700; border-radius: 12px; text-transform: uppercase; border-bottom: 4px solid #3f8f01; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0; font-size:24px;">Upgrade Skills</h1>
        </div>
        <div class="content">
          <h2>Exclusive Student Offer!</h2>
          <p>Hi Learner,</p>
          <p>We are running a limited-time promotion for our registered students. Use code <strong>UPGRADE50</strong> at checkout to get 50% off any of our global masterclasses!</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="https://upgradeskills.co.in/courses" class="btn">Browse Courses</a>
          </p>
          <p>Happy learning,<br>The Upgrade Skills Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  console.log('Fetching all students...');
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { name: true, email: true }
  });

  console.log(`Found ${students.length} students. Starting promotional dispatch...`);

  for (const student of students) {
    // Personalize HTML content for each student
    const personalizedHtml = htmlContent.replace('Hi Learner,', `Hi ${student.name || 'Learner'},`);
    await sendEmail({
      to: student.email,
      subject,
      html: personalizedHtml,
    });
  }

  console.log('Promotional dispatch finished!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
