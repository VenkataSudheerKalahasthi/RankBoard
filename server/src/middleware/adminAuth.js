const { createClerkClient, verifyToken } = require('@clerk/backend');
const { config } = require('../config/env');
const { getAdminById, getAdminByEmail, getAdminsCount, upsertAdmin, getStudentById } = require('../supabase/supabaseRepository');

let clerkClient = null;
if (config.CLERK_SECRET_KEY) {
  try {
    clerkClient = createClerkClient({ secretKey: config.CLERK_SECRET_KEY });
  } catch (err) {
    console.warn('[Admin Auth Clerk Init Warning]:', err.message);
  }
}

// In-memory cache for Clerk admin lookups
const adminClerkCache = new Map();
const ADMIN_CACHE_TTL = 15 * 60 * 1000;

/**
 * Admin Authorization Middleware
 * Verifies Clerk JWT session token from Authorization: Bearer <token>
 * Enforces strict server-side Admin privilege verification via Supabase
 */
const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Admin authorization required. No Bearer token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    let userId = null;
    let userEmail = null;
    let userName = null;
    let userPhoto = null;

    if (!config.CLERK_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Clerk secret key is not configured on the backend server.',
      });
    }

    try {
      const decoded = await verifyToken(token, {
        secretKey: config.CLERK_SECRET_KEY,
      });

      if (!decoded || !decoded.sub) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired session token.',
        });
      }
      userId = decoded.sub;

      if (clerkClient) {
        const cachedAdmin = adminClerkCache.get(userId);
        if (cachedAdmin && Date.now() - cachedAdmin.timestamp < ADMIN_CACHE_TTL) {
          userEmail = cachedAdmin.email;
          userName = cachedAdmin.name;
          userPhoto = cachedAdmin.photo;
        } else {
          try {
            const user = await clerkClient.users.getUser(userId);
            userEmail = user.emailAddresses?.[0]?.emailAddress ? user.emailAddresses[0].emailAddress.toLowerCase().trim() : null;
            userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Administrator';
            userPhoto = user.imageUrl || null;
            adminClerkCache.set(userId, { email: userEmail, name: userName, photo: userPhoto, timestamp: Date.now() });
          } catch (fetchErr) {
            // Fallback to token claims
          }
        }
      }
    } catch (verifyErr) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication failed: ' + verifyErr.message,
      });
    }

    // Server-side Admin Verification against Supabase & Environment
    let isAuthorizedAdmin = false;
    let adminRole = 'ADMIN';

    // 1. Check configured admin emails list (if specified in env)
    const adminEmailsEnv = process.env.ADMIN_EMAILS
      ? process.env.ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase())
      : [];

    if (userEmail && adminEmailsEnv.includes(userEmail.toLowerCase())) {
      isAuthorizedAdmin = true;
      adminRole = 'SUPER_ADMIN';
    }

    // 2. Check Supabase `admins` table
    let matchedAdminDoc = null;
    if (!isAuthorizedAdmin) {
      const adminDoc = await getAdminById(userId);
      if (adminDoc && adminDoc.status !== 'DISABLED') {
        isAuthorizedAdmin = true;
        adminRole = adminDoc.role || 'ADMIN';
        matchedAdminDoc = adminDoc;
      } else if (userEmail) {
        const emailAdminDoc = await getAdminByEmail(userEmail);
        if (emailAdminDoc && emailAdminDoc.status !== 'DISABLED') {
          isAuthorizedAdmin = true;
          adminRole = emailAdminDoc.role || 'ADMIN';
          matchedAdminDoc = emailAdminDoc;
        }
      }
    }

    // 3. Check student document role in Supabase
    if (!isAuthorizedAdmin) {
      const studentDoc = await getStudentById(userId);
      if (studentDoc && studentDoc.role === 'ADMIN') {
        isAuthorizedAdmin = true;
        adminRole = 'ADMIN';
      }
    }

    // 4. Initial College Admin bootstrap:
    // If no admins are recorded yet in the database, allow the first authenticated Clerk user to bootstrap
    if (!isAuthorizedAdmin) {
      const adminCount = await getAdminsCount();
      if (adminCount === 0) {
        isAuthorizedAdmin = true;
        adminRole = 'SUPER_ADMIN';
        // Auto-register first admin in admins table
        await upsertAdmin({
          id: userId,
          userId,
          email: userEmail || 'admin@college.edu',
          name: userName || 'Lead Administrator',
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          photo: userPhoto || '',
          lastLoginAt: new Date().toISOString(),
        });
      }
    }

    if (!isAuthorizedAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not possess administrator privileges for this portal.',
      });
    }

    // Attach admin identity to request
    const effectiveName =
      (userName && userName !== 'Administrator')
        ? userName
        : (matchedAdminDoc?.name || userName || 'Administrator');

    req.admin = {
      userId,
      email: userEmail,
      name: effectiveName,
      photo: userPhoto || matchedAdminDoc?.photo || null,
      role: adminRole,
    };
    req.auth = {
      userId,
      email: userEmail,
      name: effectiveName,
    };

    next();
  } catch (error) {
    console.error('[Admin Auth Middleware Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during admin privilege verification.',
    });
  }
};

module.exports = {
  requireAdmin,
};
