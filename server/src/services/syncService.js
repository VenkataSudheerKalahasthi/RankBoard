const { getDb } = require('../firebase/firebaseAdmin');
const { fetchPlatformProfile } = require('./platforms');
const { evaluateStudentScores } = require('./scoring');
const { recalculateCollegeRankings } = require('./ranking/rankingEngine');
const {
  parseLeetCodeUrl,
  parseGFGUrl,
  parseCodeforcesUrl,
  parseCodeChefUrl,
  formatCanonicalUrl,
} = require('../utils/urlParsers');

/**
 * Synchronizes all coding platform statistics for a student, evaluates scores, and recalculates rank
 * 
 * @param {string} clerkUserId - Clerk User ID
 * @param {Object|null} newPlatformUrls - Optional new URLs to save before syncing { leetcodeUrl, gfgUrl, codeforcesUrl, codechefUrl }
 * @returns {Promise<Object>} Updated student record
 */
const syncStudentPlatforms = async (clerkUserId, newPlatformUrls = null) => {
  const db = getDb();
  const studentRef = db.collection('students').doc(clerkUserId);
  const studentSnap = await studentRef.get();

  if (!studentSnap.exists) {
    throw new Error(`Student record not found for Clerk User ID: ${clerkUserId}`);
  }

  const studentData = studentSnap.data();
  const platforms = { ...(studentData.platforms || {}) };
  const platformStats = { ...(studentData.platformStats || {}) };

  // If new URLs were provided in request, update platform definitions
  if (newPlatformUrls) {
    if (newPlatformUrls.leetcodeUrl !== undefined) {
      const handle = parseLeetCodeUrl(newPlatformUrls.leetcodeUrl);
      platforms.leetcode = {
        profileUrl: newPlatformUrls.leetcodeUrl ? formatCanonicalUrl('leetcode', handle) : '',
        username: handle || '',
        status: handle ? 'PENDING' : 'NOT_CONNECTED',
        lastFetchedAt: platforms.leetcode?.lastFetchedAt || null,
        errorMessage: null,
      };
    }

    if (newPlatformUrls.gfgUrl !== undefined) {
      const handle = parseGFGUrl(newPlatformUrls.gfgUrl);
      platforms.gfg = {
        profileUrl: newPlatformUrls.gfgUrl ? formatCanonicalUrl('gfg', handle) : '',
        username: handle || '',
        status: handle ? 'PENDING' : 'NOT_CONNECTED',
        lastFetchedAt: platforms.gfg?.lastFetchedAt || null,
        errorMessage: null,
      };
    }

    if (newPlatformUrls.codeforcesUrl !== undefined) {
      const handle = parseCodeforcesUrl(newPlatformUrls.codeforcesUrl);
      platforms.codeforces = {
        profileUrl: newPlatformUrls.codeforcesUrl ? formatCanonicalUrl('codeforces', handle) : '',
        username: handle || '',
        status: handle ? 'PENDING' : 'NOT_CONNECTED',
        lastFetchedAt: platforms.codeforces?.lastFetchedAt || null,
        errorMessage: null,
      };
    }

    if (newPlatformUrls.codechefUrl !== undefined) {
      const handle = parseCodeChefUrl(newPlatformUrls.codechefUrl);
      platforms.codechef = {
        profileUrl: newPlatformUrls.codechefUrl ? formatCanonicalUrl('codechef', handle) : '',
        username: handle || '',
        status: handle ? 'PENDING' : 'NOT_CONNECTED',
        lastFetchedAt: platforms.codechef?.lastFetchedAt || null,
        errorMessage: null,
      };
    }
  }

  // Iterate across all configured platforms and fetch actual stats
  const platformKeys = ['leetcode', 'gfg', 'codeforces', 'codechef'];

  for (const key of platformKeys) {
    const pConfig = platforms[key];
    if (pConfig && pConfig.username) {
      try {
        const stats = await fetchPlatformProfile(key, pConfig.profileUrl || pConfig.username);

        if (stats.status === 'SUCCESS') {
          platformStats[key] = stats;
          platforms[key].status = 'SUCCESS';
          platforms[key].lastFetchedAt = new Date().toISOString();
          platforms[key].errorMessage = null;
        } else {
          platforms[key].status = 'FAILED';
          platforms[key].errorMessage = stats.errorMessage || 'Failed to fetch platform data';
        }
      } catch (err) {
        platforms[key].status = 'FAILED';
        platforms[key].errorMessage = err.message;
      }
    } else {
      platforms[key] = {
        profileUrl: '',
        username: '',
        status: 'NOT_CONNECTED',
        lastFetchedAt: null,
        errorMessage: null,
      };
    }
  }

  // Calculate updated platform scores and final score
  const scoreResults = evaluateStudentScores(platformStats);

  // Check if profile is complete (all 4 platforms connected)
  const connectedCount = platformKeys.filter((k) => platforms[k]?.username).length;
  const profileCompleted = connectedCount === 4 && !!studentData.rollNumber && !!studentData.department;

  // Deep sanitize to recursively convert undefined to null
  const deepSanitize = (obj) => {
    if (obj === null || typeof obj !== 'object') {
      return obj === undefined ? null : obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(deepSanitize);
    }
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        clean[key] = deepSanitize(value);
      } else {
        clean[key] = null;
      }
    }
    return clean;
  };

  const updatedData = deepSanitize({
    platforms,
    platformStats,
    scores: scoreResults,
    finalScore: scoreResults.finalScore,
    profileCompleted,
    updatedAt: new Date().toISOString(),
    lastDataUpdatedAt: new Date().toISOString(),
  });

  await studentRef.update(updatedData);

  // Recalculate rankings for the whole college dynamically
  await recalculateCollegeRankings(studentData.collegeId || 'default_college');

  // Fetch fresh snapshot with rank
  const freshSnap = await studentRef.get();
  return {
    id: freshSnap.id,
    ...freshSnap.data(),
  };
};

module.exports = {
  syncStudentPlatforms,
};
