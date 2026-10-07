const { getStudentById } = require('../supabase/supabaseRepository');
const { syncStudentPlatforms } = require('../services/syncService');
const {
  parseLeetCodeUrl,
  parseGFGUrl,
  parseCodeforcesUrl,
  parseCodeChefUrl,
  parseHackerRankUrl,
} = require('../utils/urlParsers');

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
