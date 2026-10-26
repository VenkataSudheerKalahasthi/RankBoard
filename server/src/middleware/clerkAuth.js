const { createClerkClient, verifyToken } = require('@clerk/backend');
const { config } = require('../config/env');
const { getStudentById, upsertStudent, updateStudent } = require('../supabase/supabaseRepository');
const { getStudentByIdCached, invalidateStudentCache } = require('../utils/studentCache');

let clerkClient = null;
if (config.CLERK_SECRET_KEY) {
  try {
    clerkClient = createClerkClient({ secretKey: config.CLERK_SECRET_KEY });
  } catch (err) {
    console.warn('[Clerk Auth Init Warning]:', err.message);
  }
}

// In-memory cache for Clerk user profiles to avoid hitting Clerk rate limits
const clerkUserCache = new Map();
const CLERK_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

// In-flight registration locks to prevent race conditions during simultaneous initial requests
const inFlightRegistrations = new Map();

/**
 * Retrieves Clerk user profile safely with in-memory caching
 */
const getClerkUserCached = async (userId) => {
  if (!clerkClient || !userId) return null;

  const cached = clerkUserCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CLERK_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const primaryEmailObj =
      user.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId) ||
      user.emailAddresses?.[0];
    const userEmail = primaryEmailObj?.emailAddress ? primaryEmailObj.emailAddress.toLowerCase().trim() : null;
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Student';
    const userPhoto = user.imageUrl || null;

    const data = { email: userEmail, name: userName, photo: userPhoto };
    clerkUserCache.set(userId, { data, timestamp: Date.now() });
    return data;
  } catch (err) {
    // Non-fatal, return null so token claims can be used
    return null;
  }
};

/**
 * Clerk Authentication Middleware
 * Verifies JWT session token from Authorization: Bearer <token>
 * Resolves Clerk user ID and binds student record from Supabase
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No Bearer token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    let userId = null;

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
    } catch (verifyErr) {
      return res.status(401).json({
        success: false,
        message: 'Clerk authentication failed: ' + verifyErr.message,
      });
    }

    // High-performance path: check if student is ALREADY cached in memory or database
    let student = await getStudentByIdCached(userId);

    let userEmail = student?.email || null;
    let userName = student?.name || null;
    let userPhoto = student?.profilePhoto || null;

    // Only query Clerk API if student is NOT yet known in the database (e.g. brand new user)
    if (!student) {
      const clerkData = await getClerkUserCached(userId);
      if (clerkData) {
        userEmail = clerkData.email;
        userName = clerkData.name;
        userPhoto = clerkData.photo;
      }
    }

    // Attach verified Clerk identity to request
    req.auth = {
      userId,
      email: userEmail,
      name: userName,
      photo: userPhoto,
    };

    // If student record does not exist, provision or link it safely with race-condition lock
    if (!student) {
      if (inFlightRegistrations.has(userId)) {
        // Wait for parallel in-flight registration request to complete
        student = await inFlightRegistrations.get(userId);
      } else {
        const registrationPromise = (async () => {
          try {
            // Check again in database to guard against past race
            let existing = await getStudentById(userId);

            if (!existing && userEmail) {
              // Check if student was pre-imported by email
              const preImported = await getStudentById(userEmail);
              if (preImported) {
                await updateStudent(preImported.id, {
                  clerkUserId: userId,
                  ...(userName && (!preImported.name || preImported.name === 'New Student') && { name: userName }),
                  ...(userPhoto && !preImported.profilePhoto && { profilePhoto: userPhoto }),
                });
                existing = await getStudentById(preImported.id);
                invalidateStudentCache();
              }
            }

            if (!existing) {
              const initialData = {
                id: userId,
                clerkUserId: userId,
                collegeId: config.COLLEGE_ID,
                name: userName || 'New Student',
                email: userEmail || `${userId}@student.college.edu`,
                rollNumber: '',
                department: '',
                year: 4,
                profilePhoto: userPhoto || '',
                role: 'STUDENT',
                accountStatus: 'ACTIVE',
                profileCompleted: false,
                finalScore: 0,
                rank: null,
                scores: {
                  leetcodeScore: 0,
                  gfgScore: 0,
                  codeforcesScore: 0,
                  codechefScore: 0,
                  hackerrankScore: 0,
                  finalScore: 0,
                },
                platforms: {
                  leetcode: { profileUrl: '', username: '', status: 'NOT_CONNECTED', lastFetchedAt: null, errorMessage: null },
                  gfg: { profileUrl: '', username: '', status: 'NOT_CONNECTED', lastFetchedAt: null, errorMessage: null },
                  codeforces: { profileUrl: '', username: '', status: 'NOT_CONNECTED', lastFetchedAt: null, errorMessage: null },
                  codechef: { profileUrl: '', username: '', status: 'NOT_CONNECTED', lastFetchedAt: null, errorMessage: null },
                  hackerrank: { profileUrl: '', username: '', status: 'NOT_CONNECTED', lastFetchedAt: null, errorMessage: null },
                },
                platformStats: {
                  leetcode: null,
                  gfg: null,
                  codeforces: null,
                  codechef: null,
                  hackerrank: null,
                },
              };

              existing = await upsertStudent(initialData);
              invalidateStudentCache();

              // Create admin notification asynchronously without blocking response
              try {
                const { createAdminNotification } = require('../utils/auditLogger');
                createAdminNotification({
                  type: 'STUDENT_REGISTERED',
                  title: 'New Student Registered',
                  message: `${userName || 'Student'} (${userEmail || userId}) registered via Clerk.`,
                  severity: 'INFO',
                  studentId: userId,
                }).catch(() => {});
              } catch (notifErr) {
                // non-fatal
              }
            }

            return existing;
          } finally {
            inFlightRegistrations.delete(userId);
          }
        })();

        inFlightRegistrations.set(userId, registrationPromise);
        student = await registrationPromise;
      }
    }

    req.student = student || {
      id: userId,
      clerkUserId: userId,
      collegeId: config.COLLEGE_ID,
      name: userName || 'Student',
      email: userEmail || '',
      rollNumber: '',
      department: '',
      year: 4,
      role: 'STUDENT',
      accountStatus: 'ACTIVE',
      profileCompleted: true,
      finalScore: 0,
      rank: null,
      platforms: {},
      platformStats: {},
    };

    next();
  } catch (error) {
    console.error('[Clerk Auth Middleware Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication verification.',
    });
  }
};

module.exports = {
  requireAuth,
};
