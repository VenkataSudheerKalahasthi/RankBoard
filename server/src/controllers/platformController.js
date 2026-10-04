const { getStudentById } = require('../supabase/supabaseRepository');
const { syncStudentPlatforms } = require('../services/syncService');
const {
  parseLeetCodeUrl,
  parseGFGUrl,
  parseCodeforcesUrl,
  parseCodeChefUrl,
} = require('../utils/urlParsers');

/**
 * Get configured platform profile links and their synchronization statuses
 */
const getPlatforms = async (req, res, next) => {
  try {
    const clerkUserId = req.auth.userId;
    const student = await getStudentById(clerkUserId);

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
 * Body: { leetcodeUrl, gfgUrl, codeforcesUrl, codechefUrl }
 */
const saveAndSyncPlatforms = async (req, res, next) => {
  try {
    const clerkUserId = req.auth.userId;
    const { leetcodeUrl, gfgUrl, codeforcesUrl, codechefUrl } = req.body;

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

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed for platform profile links.',
        errors: validationErrors,
      });
    }

    // Execute synchronization pipeline
    const updatedStudent = await syncStudentPlatforms(clerkUserId, {
      leetcodeUrl,
      gfgUrl,
      codeforcesUrl,
      codechefUrl,
    });

    return res.json({
      success: true,
      message: 'Coding platform statistics synchronized successfully.',
      student: updatedStudent,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlatforms,
  saveAndSyncPlatforms,
};
