const { insertAuditLog, insertNotification } = require('../supabase/supabaseRepository');

/**
 * Logs an administrative action into the Supabase `audit_logs` table
 * 
 * @param {Object} params
 * @param {Object} params.admin - { userId, email, name }
 * @param {string} params.action - Action identifier (e.g. 'STUDENT_ADDED', 'BULK_SYNCHRONIZATION')
 * @param {string} params.target - Description or name of target (e.g. 'John Doe (21CS001)')
 * @param {string} [params.targetId] - Target document/record ID
 * @param {Object|string} [params.details] - Metadata or before/after diff
 * @param {Object} [params.req] - Express request object for capturing IP and User Agent
 */
const logAudit = async ({ admin, action, target, targetId = null, details = null, req = null }) => {
  try {
    const logEntry = {
      adminId: admin?.userId || 'SYSTEM',
      adminEmail: admin?.email || 'admin@college.edu',
      adminName: admin?.name || 'Administrator',
      action: action || 'ADMIN_ACTION',
      target: target || 'SYSTEM',
      targetId: targetId || null,
      details: typeof details === 'object' ? details : { message: details || '' },
      ip: req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1') : '127.0.0.1',
      userAgent: req ? (req.headers['user-agent'] || 'Unknown') : 'Internal',
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
  logAudit,
  createAdminNotification,
};
