import { prisma } from './db';

/**
 * Creates an audit log entry in the database.
 * 
 * @param {object} params
 * @param {string} [params.userId] - ID of the user performing the action
 * @param {string} [params.userEmail] - Email of the user performing the action
 * @param {string} params.action - Action tag (e.g. LOGIN_SUCCESS, COUPON_CREATE, etc.)
 * @param {string|object} params.details - Detailed payload or metadata
 * @param {string} [params.ipAddress] - Client IP address
 */
export async function createAuditLog({ userId, userEmail, action, details, ipAddress }) {
  try {
    const stringifiedDetails = typeof details === 'object' ? JSON.stringify(details) : String(details);
    
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        userEmail: userEmail || null,
        action,
        details: stringifiedDetails,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error('[AUDITING ERROR] Failed to write audit log to database:', error);
  }
}
