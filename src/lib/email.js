import fs from 'fs';
import path from 'path';
import { getBreaker } from './circuitBreaker';
import { createAuditLog } from './audit';

// Initialize a shared circuit breaker for Resend integration
const emailBreaker = getBreaker('resend-emails', {
  failureThreshold: 3,
  recoveryTimeout: 30000 // Stay open for 30s before testing in HALF_OPEN
});

// Helper for simulating single email dispatch
function executeSimulation({ to, subject, html, text }) {
  console.log('\n=============================================================');
  console.log(`[EMAIL SIMULATION] Dispatching to: ${to}`);
  console.log(`[EMAIL SIMULATION] Subject: ${subject}`);
  if (text) {
    console.log(`[EMAIL SIMULATION] Text Content:\n${text}`);
  } else {
    console.log(`[EMAIL SIMULATION] Body excerpt: ${html.replace(/<[^>]*>/g, '').substring(0, 150)}...`);
  }
  console.log('=============================================================\n');

  const logFilePath = path.resolve(process.cwd(), 'server.log');
  let logMsg = `[${new Date().toISOString()}] EMAIL SIMULATED to ${to} - Subject: "${subject}"\n`;
  if (text) {
    logMsg += `[EMAIL SIMULATION CONTENT] ${text}\n`;
  }
  try {
    fs.appendFileSync(logFilePath, logMsg);
  } catch (logErr) {
    console.error('Failed to write simulation log:', logErr);
  }
  return { success: false, simulated: true };
}

// Helper for simulating batch email dispatch
function executeSimulationBatch(emails) {
  console.log(`\n=============================================================`);
  console.log(`[EMAIL BATCH SIMULATION] Dispatching batch of ${emails.length} emails:`);
  for (const email of emails) {
    console.log(`  - to: ${email.to} | Subject: "${email.subject}"`);
  }
  console.log(`=============================================================\n`);

  const logFilePath = path.resolve(process.cwd(), 'server.log');
  let logMsg = '';
  for (const email of emails) {
    logMsg += `[${new Date().toISOString()}] EMAIL SIMULATED to ${email.to} (BATCH) - Subject: "${email.subject}"\n`;
  }
  try {
    fs.appendFileSync(logFilePath, logMsg);
  } catch (logErr) {
    console.error('Failed to write simulation log:', logErr);
  }

  return { success: false, simulated: true };
}

/**
 * Sends an email using Resend API (wrapped in a Circuit Breaker, falls back to simulation mode if failing).
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
    const sendFn = async () => {
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
          text: text || html.replace(/<[^>]*>/g, ''),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send email via Resend API');
      }
      return data;
    };

    const fallbackFn = async (err) => {
      console.warn(`[EMAIL BREAKER FALLBACK] Falling back to simulation due to: ${err.message}`);
      await createAuditLog({
        action: 'EXTERNAL_API_FAILURE',
        details: { service: 'resend', error: err.message, action: 'sendEmail', recipient: to },
      });
      return executeSimulation({ to, subject, html, text });
    };

    try {
      const data = await emailBreaker.execute(sendFn, fallbackFn);
      if (data.simulated) {
        return { success: false, simulated: true };
      }
      console.log(`[RESEND EMAIL] Successfully dispatched email to ${to} (ID: ${data.id})`);
      return { success: true, id: data.id };
    } catch (err) {
      console.error('[RESEND EMAIL ERROR] Failed after breaker execution:', err);
      return { success: false, error: err.message, simulated: false };
    }
  }

  return executeSimulation({ to, subject, html, text });
}

/**
 * Sends a batch of emails using Resend API (wrapped in a Circuit Breaker, falls back to simulation mode if failing).
 * 
 * @param {Array<object>} emails - Array of email options: { to, subject, html, text }
 */
export async function sendEmailBatch(emails) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'Upgrade Skills <team@upgradeskills.co.in>';

  if (apiKey && apiKey.trim() !== "") {
    const sendFn = async () => {
      const batchData = emails.map((email) => ({
        from: fromEmail,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text || email.html.replace(/<[^>]*>/g, ''),
      }));

      const response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(batchData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send email batch via Resend API');
      }
      return data;
    };

    const fallbackFn = async (err) => {
      console.warn(`[EMAIL BATCH BREAKER FALLBACK] Falling back to simulation due to: ${err.message}`);
      await createAuditLog({
        action: 'EXTERNAL_API_FAILURE',
        details: { service: 'resend', error: err.message, action: 'sendEmailBatch', count: emails.length },
      });
      return executeSimulationBatch(emails);
    };

    try {
      const data = await emailBreaker.execute(sendFn, fallbackFn);
      if (data.simulated) {
        return { success: false, simulated: true };
      }
      console.log(`[RESEND BATCH] Successfully dispatched ${emails.length} emails`);
      return { success: true, count: emails.length };
    } catch (err) {
      console.error('[RESEND BATCH ERROR] Failed after breaker execution:', err);
      return { success: false, error: err.message, simulated: false };
    }
  }

  return executeSimulationBatch(emails);
}
