import fs from 'fs';
import path from 'path';

/**
 * Sends an email using Resend API (or falls back to console logging/server.log simulation if RESEND_API_KEY is not configured).
 * 
 * @param {object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email body (HTML format)
 * @param {string} [options.text] - Optional plain text fallback
 */
export async function sendEmail({ to, subject, html, text }) {
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
          text: text || html.replace(/<[^>]*>/g, ''), // Basic HTML strip for plain text fallback
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send email via Resend API');
      }

      console.log(`[RESEND EMAIL] Successfully dispatched email to ${to} (ID: ${data.id})`);
      return { success: true, id: data.id };
    } catch (err) {
      console.error('[RESEND EMAIL ERROR] Failed to send email via Resend:', err);
      // Fallback to local simulation logging on failure
    }
  }

  // Fallback / Simulation Mode
  console.log('\n=============================================================');
  console.log(`[EMAIL SIMULATION] Dispatching to: ${to}`);
  console.log(`[EMAIL SIMULATION] Subject: ${subject}`);
  console.log(`[EMAIL SIMULATION] Body excerpt: ${text || html.replace(/<[^>]*>/g, '').substring(0, 150)}...`);
  console.log('=============================================================\n');

  const logFilePath = path.resolve(process.cwd(), 'server.log');
  const logMsg = `[${new Date().toISOString()}] EMAIL SIMULATED to ${to} - Subject: "${subject}"\n`;
  try {
    fs.appendFileSync(logFilePath, logMsg);
  } catch (logErr) {
    console.error('Failed to write simulation log:', logErr);
  }

  return { success: false, simulated: true };
}
