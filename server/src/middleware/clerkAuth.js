const { createClerkClient, verifyToken } = require('@clerk/backend');
const { config } = require('../config/env');
const { getDb } = require('../firebase/firebaseAdmin');

let clerkClient = null;
if (config.CLERK_SECRET_KEY) {
  try {
    clerkClient = createClerkClient({ secretKey: config.CLERK_SECRET_KEY });
  } catch (err) {
    console.warn('[Clerk Auth Init Warning]:', err.message);
  }
}

/**
 * Clerk Authentication Middleware
 * Verifies JWT session token from Authorization: Bearer <token>
 * Resolves Clerk user ID and binds student record from Firestore
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
    let userEmail = null;
    let userName = null;
    let userPhoto = null;

    if (config.CLERK_SECRET_KEY) {
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

        // Optionally fetch user details from Clerk if available
        if (clerkClient) {
          try {
            const user = await clerkClient.users.getUser(userId);
            userEmail = user.emailAddresses?.[0]?.emailAddress || null;
            userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Student';
            userPhoto = user.imageUrl || null;
          } catch (userFetchErr) {
            // Non-fatal, use token claims
          }
        }
      } catch (verifyErr) {
        return res.status(401).json({
          success: false,
          message: 'Clerk authentication failed: ' + verifyErr.message,
        });
      }
    } else {
      return res.status(500).json({
        success: false,
        message: 'Clerk secret key is not configured on the backend server.',
      });
    }

    // Attach verified Clerk identity to request
    req.auth = {
      userId,
      email: userEmail,
      name: userName,
      photo: userPhoto,
    };

    // Ensure student record exists in Firestore
    try {
      const db = getDb();
      const studentRef = db.collection('students').doc(userId);
      const studentSnap = await studentRef.get();

      if (!studentSnap.exists) {
        // Check if student was pre-imported by email
        let existingPreImportedDoc = null;
        if (userEmail) {
          const emailQuery = await db.collection('students').where('email', '==', userEmail).limit(1).get();
          if (!emailQuery.empty) {
            existingPreImportedDoc = emailQuery.docs[0];
          }
        }

        if (existingPreImportedDoc && existingPreImportedDoc.id !== userId) {
          const existingData = existingPreImportedDoc.data();
          const mergedData = {
            ...existingData,
            clerkUserId: userId,
            name: existingData.name && existingData.name !== 'New Student' ? existingData.name : (userName || 'Student'),
            email: userEmail,
            profilePhoto: userPhoto || existingData.profilePhoto || '',
            updatedAt: new Date().toISOString(),
          };
          await studentRef.set(mergedData);
          await existingPreImportedDoc.ref.delete();
          req.student = mergedData;
        } else {
          const initialData = {
            clerkUserId: userId,
            collegeId: config.COLLEGE_ID,
            name: userName || 'New Student',
            email: userEmail || '',
            rollNumber: '',
            department: '',
            year: null,
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
              finalScore: 0,
            },
            platforms: {
              leetcode: { profileUrl: '', username: '', status: 'NOT_CONNECTED', lastFetchedAt: null, errorMessage: null },
              gfg: { profileUrl: '', username: '', status: 'NOT_CONNECTED', lastFetchedAt: null, errorMessage: null },
              codeforces: { profileUrl: '', username: '', status: 'NOT_CONNECTED', lastFetchedAt: null, errorMessage: null },
              codechef: { profileUrl: '', username: '', status: 'NOT_CONNECTED', lastFetchedAt: null, errorMessage: null },
            },
            platformStats: {
              leetcode: null,
              gfg: null,
              codeforces: null,
              codechef: null,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastDataUpdatedAt: null,
          };

          await studentRef.set(initialData);
          req.student = initialData;
        }
      } else {
        req.student = studentSnap.data();
      }
    } catch (dbErr) {
      console.error('[Firestore Student Lookup Error]:', dbErr.message);
      return res.status(500).json({
        success: false,
        message: 'Database error while retrieving student profile: ' + dbErr.message,
      });
    }

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
