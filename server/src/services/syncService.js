const { getStudentById, updateStudent } = require('../supabase/supabaseRepository');
const { fetchPlatformProfile } = require('./platforms');
const { evaluateStudentScores } = require('./scoring');
const { recalculateCollegeRankings } = require('./ranking/rankingEngine');
const { config } = require('../config/env');
const {
  parseLeetCodeUrl,
  parseGFGUrl,
  parseCodeforcesUrl,
  parseCodeChefUrl,
  parseHackerRankUrl,
  formatCanonicalUrl,
} = require('../utils/urlParsers');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Platform-level Rate Limit Cooldown State Tracker (In-Memory)
const platformCooldowns = {
  leetcode: 0,
  gfg: 0,
  codeforces: 0,
  codechef: 0,
  hackerrank: 0,
};

/**
 * Checks if a platform is currently in rate-limit cooldown
 * @param {string} platform 
 * @returns {boolean}
 */
const isPlatformInCooldown = (platform) => {
  const expiry = platformCooldowns[platform] || 0;
  return Date.now() < expiry;
};

/**
 * Activates a cooldown on a specific platform when rate-limited (429)
 * @param {string} platform 
 * @param {number} durationMs 
 */
const triggerPlatformCooldown = (platform, durationMs = config.SYNC_CONFIG?.RATE_LIMIT_COOLDOWN_MS || 60000) => {
  const currentExpiry = platformCooldowns[platform] || 0;
  if (Date.now() < currentExpiry) {
    return;
  }
  platformCooldowns[platform] = Date.now() + durationMs;
  console.warn(`⚠️ [Rate Limit Cooldown] Platform "${platform}" paused for ${durationMs / 1000}s due to 429/rate-limiting.`);
};

/**
 * Compares previous DB platform stats with latest fetched stats to detect REAL changes
 * 
 * @param {string} platformKey 
 * @param {Object|null} prevStats 
 * @param {Object|null} newStats 
 * @returns {{ hasChanged: boolean, diffs: Array<string> }}
 */
const detectPlatformStatChanges = (platformKey, prevStats, newStats) => {
  if (!newStats || newStats.status !== 'SUCCESS') {
    return { hasChanged: false, diffs: [] };
  }

  const prev = prevStats || {};
  const curr = newStats;
  const diffs = [];

  const checkField = (field, label) => {
    const rawPrev = prev[field];
    const rawCurr = curr[field];

    const prevNum = rawPrev !== undefined && rawPrev !== null ? Number(rawPrev) : null;
    const currNum = rawCurr !== undefined && rawCurr !== null ? Number(rawCurr) : null;

    const prevVal = prevNum !== null && !isNaN(prevNum) ? prevNum : null;
    const currVal = currNum !== null && !isNaN(currNum) ? currNum : null;

    if (currVal !== null && prevVal !== currVal) {
      diffs.push(`${label || field}: ${prevVal ?? 0} → ${currVal} (${currVal > (prevVal ?? 0) ? '+' : ''}${currVal - (prevVal ?? 0)})`);
    }
  };

  // Check common core fields (totalSolved, easy, medium, hard)
  checkField('totalSolved', 'Total Solved');
  checkField('easySolved', 'Easy');
  checkField('mediumSolved', 'Medium');
  checkField('hardSolved', 'Hard');

  // GFG specific fields
  if (platformKey === 'gfg') {
    checkField('schoolSolved', 'School');
    checkField('basicSolved', 'Basic');
    checkField('rating', 'Coding Score');
  }

  // Codeforces specific fields
  if (platformKey === 'codeforces') {
    checkField('rating', 'Rating');
  }

  // CodeChef: only totalSolved (tracked via core fields above), no stars or score needed

  // HackerRank specific fields
  if (platformKey === 'hackerrank') {
    checkField('stars', 'Stars');
    checkField('badges', 'Badges');
    checkField('certificates', 'Certificates');
    checkField('rating', 'Points');
  }

  return {
    hasChanged: diffs.length > 0,
    diffs,
  };
};

/**
 * Synchronizes all coding platform statistics for a student, detects real changes,
 * recalculates score & rank idempotently, and distributes via Supabase Realtime.
 * 
 * @param {string|Object} studentIdOrClerkId - Student object, Clerk User ID or Document/Student ID
 * @param {Object|null} newPlatformUrls - Optional new URLs to save before syncing { leetcodeUrl, gfgUrl, codeforcesUrl, codechefUrl, hackerrankUrl }
 * @param {Object} options - { forceSync: boolean }
 * @returns {Promise<{ student: Object, hasChanged: boolean, detectedChanges: Array<string> }>}
 */
const syncStudentPlatforms = async (studentIdOrClerkId, newPlatformUrls = null, options = { forceSync: false }) => {
  let studentData = null;
  if (studentIdOrClerkId && typeof studentIdOrClerkId === 'object' && studentIdOrClerkId.id) {
    studentData = studentIdOrClerkId;
  } else if (studentIdOrClerkId) {
    studentData = await getStudentById(studentIdOrClerkId);
    if (!studentData) {
      try {
        const { getStudentByIdCached } = require('../utils/studentCache');
        studentData = await getStudentByIdCached(studentIdOrClerkId);
      } catch (e) {}
    }
  }

  if (!studentData) {
    const requestedId = typeof studentIdOrClerkId === 'object' ? studentIdOrClerkId?.id : studentIdOrClerkId;
    throw new Error(`Student record not found for ID: ${requestedId}`);
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

    const hrUrlInput = newPlatformUrls.hackerrankUrl !== undefined ? newPlatformUrls.hackerrankUrl : newPlatformUrls.hackerRankUrl;
    if (hrUrlInput !== undefined) {
      const handle = parseHackerRankUrl(hrUrlInput);
      platforms.hackerrank = {
        profileUrl: hrUrlInput ? formatCanonicalUrl('hackerrank', handle) : '',
        username: handle || '',
        status: handle ? 'PENDING' : 'NOT_CONNECTED',
        lastFetchedAt: platforms.hackerrank?.lastFetchedAt || null,
        errorMessage: null,
      };
    }
  }

  const platformIntervals = {
    leetcode: (config.SYNC_CONFIG?.LEETCODE_INTERVAL_SECONDS || 60) * 1000,
    gfg: (config.SYNC_CONFIG?.GFG_INTERVAL_SECONDS || 120) * 1000,
    codeforces: (config.SYNC_CONFIG?.CODEFORCES_INTERVAL_SECONDS || 120) * 1000,
    codechef: (config.SYNC_CONFIG?.CODECHEF_INTERVAL_SECONDS || 300) * 1000,
    hackerrank: (config.SYNC_CONFIG?.HACKERRANK_INTERVAL_SECONDS || 120) * 1000,
  };

  // Iterate across all configured platforms (or only the specified platform) and fetch actual stats
  const allPlatformKeys = ['leetcode', 'gfg', 'codeforces', 'codechef', 'hackerrank'];
  const platformKeys = (options && options.onlyPlatform)
    ? [options.onlyPlatform.toLowerCase().trim()]
    : allPlatformKeys;
  let anyPlatformChanged = false;
  const allDetectedChanges = [];

  for (const key of platformKeys) {
    const pConfig = platforms[key];
    if (pConfig && pConfig.username) {
      // Check if platform is temporarily cooling down from a 429
      if (isPlatformInCooldown(key) && !options.forceSync) {
        platforms[key].status = 'RATE_LIMITED';
        platforms[key].errorMessage = `Platform ${key} in temporary cooldown. Using cached metrics.`;
        continue;
      }

      // Check per-platform interval to prevent aggressive re-scraping
      const intervalMs = platformIntervals[key] || 60000;
      const lastFetchedMs = pConfig.lastFetchedAt ? new Date(pConfig.lastFetchedAt).getTime() : 0;
      const isFresh = lastFetchedMs > 0 && (Date.now() - lastFetchedMs < intervalMs);

      if (isFresh && !options.forceSync && !newPlatformUrls && pConfig.status === 'SUCCESS') {
        // Platform is still fresh within its configured sync window; skip fetching
        continue;
      }

      let stats = null;
      let attempts = 0;
      const maxAttempts = key === 'codechef' || key === 'gfg' ? 1 : 2;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          stats = await fetchPlatformProfile(key, pConfig.profileUrl || pConfig.username);
          if (stats.status === 'SUCCESS') break;
          if (stats.status === 'RATE_LIMITED' || (stats.errorMessage && stats.errorMessage.includes('429'))) {
            triggerPlatformCooldown(key);
            break;
          }
          if (attempts < maxAttempts) await sleep(800);
        } catch (err) {
          if (err.message && err.message.includes('429')) {
            triggerPlatformCooldown(key);
            break;
          }
          if (attempts < maxAttempts) await sleep(800);
        }
      }

      if (stats && stats.status === 'SUCCESS') {
        const prevStats = platformStats[key];
        const changeResult = detectPlatformStatChanges(key, prevStats, stats);

        if (changeResult.hasChanged) {
          anyPlatformChanged = true;
          allDetectedChanges.push(`[${key.toUpperCase()}] ${changeResult.diffs.join(', ')}`);
          console.log(`🎯 [Real Change Detected] ${studentData.name} (${studentData.id}) on ${key}: ${changeResult.diffs.join(' | ')}`);
        }

        // Idempotently store the latest verified platform statistics
        platformStats[key] = stats;
        platforms[key].status = 'SUCCESS';
        platforms[key].lastFetchedAt = stats.fetchedAt || new Date().toISOString();
        platforms[key].errorMessage = null;
      } else if (stats && stats.status === 'RATE_LIMITED') {
        platforms[key].status = 'RATE_LIMITED';
        platforms[key].errorMessage = stats.errorMessage || 'Rate limit reached on platform';
        // PRESERVE previous valid stats - NEVER reset to zero or null
      } else {
        platforms[key].status = 'FAILED';
        platforms[key].errorMessage = stats?.errorMessage || 'Failed to fetch platform data';
        // PRESERVE previous valid stats - NEVER reset to zero or null
      }

      await sleep(100);
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

  // Check if profile is complete across all platforms
  const connectedCount = allPlatformKeys.filter((k) => platforms[k]?.username).length;
  const profileCompleted = connectedCount >= 3 && !!studentData.rollNumber && !!studentData.department;

  // Determine if database update is necessary
  const scoreChanged = Math.abs((studentData.finalScore || 0) - (scoreResults.finalScore || 0)) > 0.001;
  const shouldUpdateDb = options.forceSync || newPlatformUrls !== null || anyPlatformChanged || scoreChanged;

  let updatedStudent = null;

  if (shouldUpdateDb) {
    const updatePayload = {
      platforms,
      platformStats,
      scores: scoreResults,
      finalScore: scoreResults.finalScore,
      profileCompleted,
      lastDataUpdatedAt: new Date().toISOString(),
    };

    await updateStudent(studentData.id, updatePayload);

    // Recalculate rankings for the college if score changed or rank needs update
    await recalculateCollegeRankings(studentData.collegeId || config.COLLEGE_ID);

    try {
      updatedStudent = await getStudentById(studentData.id);
    } catch (e) {
      console.warn('[SyncService Final Fetch Warning]:', e.message);
    }
  }

  const finalRecord = updatedStudent || {
    ...studentData,
    platforms,
    platformStats,
    scores: scoreResults,
    finalScore: scoreResults.finalScore,
    profileCompleted,
  };

  return {
    student: finalRecord,
    hasChanged: anyPlatformChanged || scoreChanged,
    detectedChanges: allDetectedChanges,
  };
};

module.exports = {
  syncStudentPlatforms,
  detectPlatformStatChanges,
  isPlatformInCooldown,
  triggerPlatformCooldown,
};
