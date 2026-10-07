const { insertAuditLog, insertNotification } = require('../supabase/supabaseRepository');

const AUDIT_ACTIONS = {
  STUDENT_ADDED: 'STUDENT_ADDED',
  STUDENT_UPDATED: 'STUDENT_UPDATED',
  STUDENT_DISABLED: 'STUDENT_DISABLED',
  STUDENT_ENABLED: 'STUDENT_ENABLED',
  STUDENT_DELETED: 'STUDENT_DELETED',
  STUDENT_IMPORTED: 'STUDENT_IMPORTED',
  STATISTICS_REFRESHED: 'STATISTICS_REFRESHED',
  BULK_SYNCHRONIZATION_STARTED: 'BULK_SYNCHRONIZATION_STARTED',
  BULK_SYNCHRONIZATION_COMPLETED: 'BULK_SYNCHRONIZATION_COMPLETED',
  SCORE_RECALCULATED: 'SCORE_RECALCULATED',
  ALL_SCORES_RECALCULATED: 'ALL_SCORES_RECALCULATED',
  MANUAL_SCORE_ADJUSTMENT: 'MANUAL_SCORE_ADJUSTMENT',
  LEADERBOARD_RECALCULATED: 'LEADERBOARD_RECALCULATED',
  SETTINGS_CHANGED: 'SETTINGS_CHANGED',
  AUDIT_LOG_EXPORTED: 'AUDIT_LOG_EXPORTED',
};

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'jwt',
  'secret',
  'clerk_secret',
  'clerk_secret_key',
  'supabase_key',
  'service_role_key',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'session',
]);

/**
 * Recursively remove sensitive keys from details/metadata
 */
const sanitizePayload = (obj, depth = 0) => {
  if (depth > 5 || obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => sanitizePayload(item, depth + 1));

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('secret') || lowerKey.includes('token') || lowerKey.includes('password')) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizePayload(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

/**
 * Logs an administrative action into the Supabase `audit_logs` table
 *
 * @param {Object} params
 * @param {Object} [params.admin] - { userId, email, name, role }
 * @param {string} params.action - Action identifier from AUDIT_ACTIONS
 * @param {string} params.target - Description or name of target (e.g. 'John Doe (21CS001)')
 * @param {string} [params.targetId] - Target document/record ID
 * @param {Object|string} [params.details] - Metadata or before/after diff
 * @param {string} [params.status] - 'SUCCESS' | 'FAILED' | 'WARNING'
 * @param {string} [params.reason] - Justification reason (mandatory for adjustments)
 * @param {Object} [params.before] - State before change
 * @param {Object} [params.after] - State after change
 * @param {Object} [params.req] - Express request object for capturing IP, User Agent, and Admin
 */
const logAudit = async ({
  admin = null,
  action = 'ADMIN_ACTION',
  target = 'SYSTEM',
  targetId = null,
  details = null,
  status = 'SUCCESS',
  reason = null,
  before = null,
  after = null,
  req = null,
}) => {
  try {
    const effectiveAdmin = admin || req?.admin || req?.user || {};
    const adminId = effectiveAdmin.userId || effectiveAdmin.id || effectiveAdmin.clerkId || 'SYSTEM';
    const adminEmail = effectiveAdmin.email || 'system@rankboard.edu';
    const adminName = effectiveAdmin.name || (effectiveAdmin.email ? effectiveAdmin.email.split('@')[0] : 'Administrator');

    let formattedDetails = {};
    if (typeof details === 'object' && details !== null) {
      formattedDetails = { ...details };
    } else if (details !== null) {
      formattedDetails = { message: String(details) };
    }

    if (status && !formattedDetails.status) formattedDetails.status = status;
    if (reason && !formattedDetails.reason) formattedDetails.reason = reason;
    if (before && !formattedDetails.before) formattedDetails.before = before;
    if (after && !formattedDetails.after) formattedDetails.after = after;

    const sanitizedDetails = sanitizePayload(formattedDetails);

    const logEntry = {
      adminId,
      adminEmail,
      adminName,
      action,
      target,
      targetId: targetId ? String(targetId) : null,
      details: sanitizedDetails,
      ip: req
        ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1')
        : '127.0.0.1',
      userAgent: req ? (req.headers['user-agent'] || 'Unknown') : 'Internal Server',
      timestamp: new Date().toISOString(),
    };

    return await insertAuditLog(logEntry);
  } catch (error) {
    console.error('[Audit Logger Error]: Failed to write audit log:', error.message);
    return null;
  }
};

/**
 * Creates a system notification in the `admin_notifications` table
 */
const createAdminNotification = async ({ type, title, message, targetId = null, severity = 'INFO' }) => {
  try {
    const notification = {
      type, // 'SYNC_FAILURE', 'IMPORT_COMPLETE', 'ANOMALY_DETECTED', 'SCORE_CHANGE', 'SYSTEM_ALERT'
      title,
      message,
      targetId,
      severity, // 'INFO', 'WARNING', 'ERROR', 'SUCCESS'
    };

    return await insertNotification(notification);
  } catch (error) {
    console.error('[Notification Logger Error]: Failed to create notification:', error.message);
    return null;
  }
};

module.exports = {
  AUDIT_ACTIONS,
  logAudit,
  createAdminNotification,
};

