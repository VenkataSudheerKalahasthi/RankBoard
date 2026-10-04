const { getStudentById, updateStudent } = require('../supabase/supabaseRepository');
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Synchronizes all coding platform statistics for a student, evaluates scores, and recalculates rank
 * 
 * @param {string} studentIdOrClerkId - Clerk User ID or Document/Student ID
 * @param {Object|null} newPlatformUrls - Optional new URLs to save before syncing { leetcodeUrl, gfgUrl, codeforcesUrl, codechefUrl }
 * @returns {Promise<Object>} Updated student record
 */
const syncStudentPlatforms = async (studentIdOrClerkId, newPlatformUrls = null) => {
  const studentData = await getStudentById(studentIdOrClerkId);

  if (!studentData) {
    throw new Error(`Student record not found for ID: ${studentIdOrClerkId}`);
  }

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
      let stats = null;
      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          stats = await fetchPlatformProfile(key, pConfig.profileUrl || pConfig.username);
          if (stats.status === 'SUCCESS') break;
          if (stats.errorMessage && stats.errorMessage.includes('429')) {
            await sleep(1500);
          } else {
            break;
          }
        } catch (err) {
          if (err.message && err.message.includes('429')) {
            await sleep(1500);
          } else {
            break;
          }
        }
      }

      if (stats && stats.status === 'SUCCESS') {
        platformStats[key] = stats;
        platforms[key].status = 'SUCCESS';
        platforms[key].lastFetchedAt = new Date().toISOString();
        platforms[key].errorMessage = null;
      } else {
        platforms[key].status = 'FAILED';
        platforms[key].errorMessage = stats?.errorMessage || 'Failed to fetch platform data';
      }

      await sleep(250);
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

  // Check if profile is complete
  const connectedCount = platformKeys.filter((k) => platforms[k]?.username).length;
  const profileCompleted = connectedCount >= 3 && !!studentData.rollNumber && !!studentData.department;

  const updatePayload = {
    platforms,
    platformStats,
    scores: scoreResults,
    finalScore: scoreResults.finalScore,
    profileCompleted,
    lastDataUpdatedAt: new Date().toISOString(),
  };

  await updateStudent(studentData.id, updatePayload);

  // Recalculate rankings for the college
  await recalculateCollegeRankings(studentData.collegeId || 'COLLEGE_MAIN');

  // Fetch fresh record with rank
  return await getStudentById(studentData.id);
};

module.exports = {
  syncStudentPlatforms,
};
