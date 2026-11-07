const { getStudentById } = require('../supabase/supabaseRepository');
const { getAllStudentsCached } = require('../utils/studentCache');
const { syncStudentPlatforms } = require('../services/syncService');
const {
  parseLeetCodeUrl,
  parseGFGUrl,
  parseCodeforcesUrl,
  parseCodeChefUrl,
  parseHackerRankUrl,
} = require('../utils/urlParsers');
const { checkDuplicatePlatformIdentities } = require('../utils/platformIdentityUtils');

/**
 * Get configured platform profile links and their synchronization statuses
 */
const getPlatforms = async (req, res, next) => {
  try {
    const studentId = req.student?.id || req.auth.userId;
    let student = req.student;

    if (!student) {
      student = await getStudentById(studentId);
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found.',
      });
    }

    return res.json({
      success: true,
      platforms: student.platforms || {},
      platformStats: student.platformStats || {},
      scores: student.scores || {},
      lastDataUpdatedAt: student.lastDataUpdatedAt || null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save platform URLs and immediately trigger live stats synchronization
 * Body: { leetcodeUrl, gfgUrl, codeforcesUrl, codechefUrl, hackerrankUrl }
 */
const saveAndSyncPlatforms = async (req, res, next) => {
  try {
    const studentId = req.student?.id || req.auth.userId;
    const { leetcodeUrl, gfgUrl, codeforcesUrl, codechefUrl, hackerrankUrl, hackerRankUrl } = req.body;
    const effectiveHrUrl = hackerrankUrl !== undefined ? hackerrankUrl : hackerRankUrl;

    const validationErrors = [];

    // Validate provided URL patterns if provided
    if (leetcodeUrl && !parseLeetCodeUrl(leetcodeUrl)) {
      validationErrors.push('Invalid LeetCode URL or handle format.');
    }
    if (gfgUrl && !parseGFGUrl(gfgUrl)) {
      validationErrors.push('Invalid GeeksforGeeks URL or handle format.');
    }
    if (codeforcesUrl && !parseCodeforcesUrl(codeforcesUrl)) {
      validationErrors.push('Invalid Codeforces URL or handle format.');
    }
    if (codechefUrl && !parseCodeChefUrl(codechefUrl)) {
      validationErrors.push('Invalid CodeChef URL or handle format.');
    }
    if (effectiveHrUrl && !parseHackerRankUrl(effectiveHrUrl)) {
      validationErrors.push('Invalid HackerRank URL or handle format.');
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed for platform profile links.',
        errors: validationErrors,
      });
    }

    // FEATURE 4, 5, 6, 7: Cross-Account Global Duplicate Platform Detection
    // Check against all active students in the database before saving or syncing
    const allStudents = await getAllStudentsCached();
    const currentClerkUserId = req.auth?.userId || req.student?.clerkUserId;
    const currentEmail = req.auth?.email || req.student?.email;

    const duplicateCheck = checkDuplicatePlatformIdentities({
      currentStudentId: studentId,
      currentClerkUserId,
      currentEmail,
      submittedLinks: {
        leetcodeUrl,
        gfgUrl,
        codeforcesUrl,
        codechefUrl,
        hackerrankUrl: effectiveHrUrl,
      },
      allActiveStudents: allStudents || [],
    });

    if (duplicateCheck.hasConflict) {
      const firstConflict = duplicateCheck.conflicts[0];
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_PLATFORM_IDENTITY',
        message: `⚠️ This ${firstConflict.platformLabel} profile is already registered with another account.`,
        conflicts: duplicateCheck.conflicts,
        conflictDetails: {
          platform: firstConflict.platform,
          platformLabel: firstConflict.platformLabel,
          username: firstConflict.username,
          maskedEmail: firstConflict.existingOwnerMaskedEmail,
          instruction: 'To continue using this coding profile, please log in with the account associated with the existing registration.',
        },
      });
    }

    // Execute synchronization pipeline
    const syncResult = await syncStudentPlatforms(studentId, {
      leetcodeUrl,
      gfgUrl,
      codeforcesUrl,
      codechefUrl,
      hackerrankUrl: effectiveHrUrl,
    }, { forceSync: true });

    return res.json({
      success: true,
      message: 'Coding platform statistics synchronized successfully.',
      student: syncResult.student || syncResult,
      hasChanged: syncResult.hasChanged,
      detectedChanges: syncResult.detectedChanges || [],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlatforms,
  saveAndSyncPlatforms,
};
