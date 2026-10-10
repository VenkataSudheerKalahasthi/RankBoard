const axios = require('axios');
const { parseGFGUrl } = require('../../utils/urlParsers');
const { config } = require('../../config/env');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const syncConfig = config.SYNC_CONFIG || {};
const GFG_MIN_REQUEST_DELAY_MS = syncConfig.GFG_MIN_REQUEST_DELAY_MS || 1200;
const GFG_TIMEOUT_MS = syncConfig.GFG_TIMEOUT_MS || 10000;
const GFG_COOLDOWN_MS = 60000;

let gfgCooldownUntil = 0;
let lastGfgRequestEndTime = 0;
let isGfgQueueWorkerRunning = false;

const gfgRequestQueue = [];
const gfgInFlightRequests = new Map();

const isGFGInCooldown = () => Date.now() < gfgCooldownUntil;

const getGFGCooldownRemainingSeconds = () => {
  if (!isGFGInCooldown()) return 0;
  return Math.max(0, Math.ceil((gfgCooldownUntil - Date.now()) / 1000));
};

const triggerGFGCooldown = (durationMs = GFG_COOLDOWN_MS) => {
  gfgCooldownUntil = Date.now() + durationMs;
  console.warn(`⚠️ [GFG] Rate limit / Timeout cooldown active for ${Math.round(durationMs / 1000)}s.`);
};

/**
 * Executes authoritative GeeksforGeeks data extraction
 * Uses official GFG submissions API as source of truth for problem solving difficulty breakdown
 * @param {string} username 
 * @returns {Promise<Object>} Normalized result object
 */
const executeSingleGFGRequest = async (username) => {
  const profileUrl = `https://www.geeksforgeeks.org/user/${encodeURIComponent(username)}/`;
  const now = new Date().toISOString();

  console.log(`[GFG] Fetching profile: ${username}`);

  const result = {
    platform: 'gfg',
    username,
    profileUrl,
    totalSolved: 0,
    schoolSolved: 0,
    basicSolved: 0,
    easySolved: 0,
    mediumSolved: 0,
    hardSolved: 0,
    rating: null,
    contests: null,
    streak: null,
    globalRank: null,
    status: 'PENDING',
    fetchedAt: now,
    errorMessage: null,
    rawData: null,
  };

  if (isGFGInCooldown()) {
    const remainingSec = getGFGCooldownRemainingSeconds();
    return {
      ...result,
      status: 'RATE_LIMITED',
      errorMessage: `GFG platform cooldown active for ${remainingSec}s.`,
    };
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://www.geeksforgeeks.org',
    'Referer': profileUrl,
  };

  let submissionsSuccess = false;
  let profilePageSuccess = false;

  try {
    // 1. Authoritative Submissions API for problem difficulty breakdown
    try {
      const subRes = await axios.post(
        'https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/',
        { handle: username, requestType: '', year: '', month: '' },
        {
          headers: { ...headers, 'Content-Type': 'application/json' },
          timeout: GFG_TIMEOUT_MS,
        }
      );

      if (subRes.data && (subRes.data.status === 'success' || subRes.status === 200)) {
        const resData = subRes.data;
        if (resData.result && typeof resData.result === 'object') {
          const categories = resData.result;
          result.schoolSolved = Object.keys(categories.School || categories.school || {}).length;
          result.basicSolved = Object.keys(categories.Basic || categories.basic || {}).length;
          result.easySolved = Object.keys(categories.Easy || categories.easy || {}).length;
          result.mediumSolved = Object.keys(categories.Medium || categories.medium || {}).length;
          result.hardSolved = Object.keys(categories.Hard || categories.hard || {}).length;

          const sumCategories = result.schoolSolved + result.basicSolved + result.easySolved + result.mediumSolved + result.hardSolved;
          result.totalSolved = typeof resData.count === 'number' ? Math.max(resData.count, sumCategories) : sumCategories;
          submissionsSuccess = true;
        }
      }
    } catch (subErr) {
      const is429 = subErr.response?.status === 429;
      const isTimeout = subErr.code === 'ECONNABORTED' || subErr.message?.includes('timeout');
      if (is429 || isTimeout) {
        triggerGFGCooldown(GFG_COOLDOWN_MS);
        return {
          ...result,
          status: 'RATE_LIMITED',
          errorMessage: 'GFG rate limit or timeout encountered during submissions fetch.',
        };
      }
      // Non-429 error (e.g. 406 when handle does not exist) proceeds to profile page verification
    }

    // 2. Profile Page (Coding Score, Streak, Institute Rank)
    try {
      const pageRes = await axios.get(profileUrl, {
        headers: {
          'User-Agent': headers['User-Agent'],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: GFG_TIMEOUT_MS,
      });

      const html = pageRes.data;
      if (typeof html === 'string' && pageRes.status === 200) {
        // Extract Next.js RSC stream payload
        const rscMatches = html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g);
        let rscPayload = '';
        for (const m of rscMatches) {
          try {
            rscPayload += JSON.parse(`"${m[1]}"`);
          } catch (e) {
            rscPayload += m[1];
          }
        }

        if (rscPayload) {
          const scoreMatch = rscPayload.match(/"score"\s*:\s*([0-9]+)/i) || rscPayload.match(/"coding_score"\s*:\s*([0-9]+)/i);
          if (scoreMatch) {
            result.rating = parseInt(scoreMatch[1], 10);
            profilePageSuccess = true;
          }

          const streakMatch = rscPayload.match(/"pod_solved_longest_streak"\s*:\s*([0-9]+)/i);
          if (streakMatch) {
            result.streak = parseInt(streakMatch[1], 10);
            profilePageSuccess = true;
          }

          const rankMatch = rscPayload.match(/"institute_rank"\s*:\s*([0-9]+)/i);
          if (rankMatch) {
            result.rawData = { ...(result.rawData || {}), instituteRank: parseInt(rankMatch[1], 10) };
            profilePageSuccess = true;
          }

          const totalSolvedMatch = rscPayload.match(/"total_problems_solved"\s*:\s*([0-9]+)/i) || rscPayload.match(/"totalProblemsSolved"\s*:\s*([0-9]+)/i);
          if (totalSolvedMatch) {
            profilePageSuccess = true;
            if (!submissionsSuccess) {
              result.totalSolved = parseInt(totalSolvedMatch[1], 10);
            }
          }
        }

        // Legacy fallback regexes for HTML
        if (result.rating === null) {
          const htmlScoreMatch = html.match(/Coding Score[\s\S]*?<div[^>]*class="[^"]*score[^"]*"[^>]*>([0-9]+)<\/div>/i) ||
                                 html.match(/class="score_card_value"[^>]*>([0-9]+)<\/span>\s*<span>Coding Score/i) ||
                                 html.match(/Coding Score:?\s*([0-9]+)/i);
          if (htmlScoreMatch && htmlScoreMatch[1]) {
            result.rating = parseInt(htmlScoreMatch[1], 10);
            profilePageSuccess = true;
          }
        }
      }
    } catch (pageErr) {
      const is429 = pageErr.response?.status === 429;
      const isTimeout = pageErr.code === 'ECONNABORTED' || pageErr.message?.includes('timeout');
      if (is429 || isTimeout) {
        triggerGFGCooldown(GFG_COOLDOWN_MS);
        return {
          ...result,
          status: 'RATE_LIMITED',
          errorMessage: 'GFG rate limit or timeout encountered during profile fetch.',
        };
      }
    }

    // 3. Optional Rating / Contest API
    try {
      const ratingRes = await axios.get(`https://practiceapi.geeksforgeeks.org/api/v1/rating/${encodeURIComponent(username)}/info/`, {
        headers,
        timeout: 5000,
      });
      if (ratingRes.data && typeof ratingRes.data === 'object') {
        const gRank = ratingRes.data.user_global_rank;
        if (gRank && gRank !== '-' && !isNaN(Number(gRank))) {
          result.globalRank = parseInt(gRank, 10);
        }
        const contestData = ratingRes.data.user_contest_data;
        if (contestData && typeof contestData.no_of_participated_contest === 'number') {
          result.contests = contestData.no_of_participated_contest;
        }
      }
    } catch (ratingErr) {
      // Non-blocking
    }

    // Final validation and status assignment
    if (submissionsSuccess || profilePageSuccess) {
      // Validate numeric types
      result.schoolSolved = Number.isInteger(result.schoolSolved) && result.schoolSolved >= 0 ? result.schoolSolved : 0;
      result.basicSolved = Number.isInteger(result.basicSolved) && result.basicSolved >= 0 ? result.basicSolved : 0;
      result.easySolved = Number.isInteger(result.easySolved) && result.easySolved >= 0 ? result.easySolved : 0;
      result.mediumSolved = Number.isInteger(result.mediumSolved) && result.mediumSolved >= 0 ? result.mediumSolved : 0;
      result.hardSolved = Number.isInteger(result.hardSolved) && result.hardSolved >= 0 ? result.hardSolved : 0;
      result.totalSolved = Number.isInteger(result.totalSolved) && result.totalSolved >= 0 ? result.totalSolved : 0;

      result.status = 'SUCCESS';
      result.errorMessage = null;

      console.log(`[GFG] Parsed: School=${result.schoolSolved} Basic=${result.basicSolved} Easy=${result.easySolved} Medium=${result.mediumSolved} Hard=${result.hardSolved} Total=${result.totalSolved} Score=${result.rating}`);
      console.log(`[GFG] Validation passed`);
    } else {
      result.status = 'FAILED';
      result.errorMessage = `User "${username}" not found on GeeksforGeeks`;
      console.warn(`[GFG] User "${username}" not found or failed extraction.`);
    }

    return result;
  } catch (error) {
    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.message?.includes('aborted');
    const is429 = error.response?.status === 429 || error.message?.includes('429');

    if (is429 || isTimeout) {
      triggerGFGCooldown(GFG_COOLDOWN_MS);
      return {
        ...result,
        status: 'RATE_LIMITED',
        errorMessage: 'GFG rate limit or timeout encountered. Pausing GFG requests.',
      };
    }

    console.error(`[GFG Fetch Error] user: ${username}:`, error.message);
    result.status = 'FAILED';
    result.errorMessage = error.message;
    return result;
  }
};

/**
 * Sequential queue worker for GFG requests with throttling & cooldown
 */
const processNextGFGQueueItem = async () => {
  if (isGfgQueueWorkerRunning || gfgRequestQueue.length === 0) {
    return;
  }

  isGfgQueueWorkerRunning = true;

  while (gfgRequestQueue.length > 0) {
    if (isGFGInCooldown()) {
      while (gfgRequestQueue.length > 0) {
        const item = gfgRequestQueue.shift();
        if (item) {
          const remainingSec = getGFGCooldownRemainingSeconds();
          item.resolve({
            platform: 'gfg',
            username: item.username,
            profileUrl: `https://www.geeksforgeeks.org/user/${encodeURIComponent(item.username)}/`,
            totalSolved: 0,
            schoolSolved: 0,
            basicSolved: 0,
            easySolved: 0,
            mediumSolved: 0,
            hardSolved: 0,
            rating: null,
            status: 'RATE_LIMITED',
            fetchedAt: new Date().toISOString(),
            errorMessage: `GFG in cooldown for ${remainingSec}s.`,
          });
        }
      }
      break;
    }

    const elapsed = Date.now() - lastGfgRequestEndTime;
    if (elapsed < GFG_MIN_REQUEST_DELAY_MS) {
      await sleep(GFG_MIN_REQUEST_DELAY_MS - elapsed);
    }

    const item = gfgRequestQueue.shift();
    if (!item) continue;

    try {
      const res = await executeSingleGFGRequest(item.username);
      lastGfgRequestEndTime = Date.now();
      item.resolve(res);
    } catch (err) {
      lastGfgRequestEndTime = Date.now();
      item.reject(err);
    }
  }

  isGfgQueueWorkerRunning = false;
};

/**
 * Fetches actual statistics from GeeksforGeeks public profile via throttled queue
 * @param {string} input - GFG profile URL or handle
 * @returns {Promise<Object>} Normalized statistics object
 */
const fetchGFGProfile = async (input) => {
  const username = parseGFGUrl(input);

  if (!username) {
    return {
      platform: 'gfg',
      username: input || '',
      profileUrl: input || '',
      totalSolved: 0,
      schoolSolved: 0,
      basicSolved: 0,
      easySolved: 0,
      mediumSolved: 0,
      hardSolved: 0,
      rating: null,
      status: 'FAILED',
      fetchedAt: new Date().toISOString(),
      errorMessage: 'Invalid GeeksforGeeks URL or handle format',
    };
  }

  const normalizedKey = username.toLowerCase().trim();

  // Deduplicate in-flight requests for the same username
  if (gfgInFlightRequests.has(normalizedKey)) {
    return await gfgInFlightRequests.get(normalizedKey);
  }

  const fetchPromise = new Promise((resolve, reject) => {
    gfgRequestQueue.push({ username, resolve, reject });
    processNextGFGQueueItem().catch((e) => console.warn('[GFG Queue Worker Error]:', e.message));
  }).finally(() => {
    gfgInFlightRequests.delete(normalizedKey);
  });

  gfgInFlightRequests.set(normalizedKey, fetchPromise);
  return await fetchPromise;
};

module.exports = {
  fetchGFGProfile,
  isGFGInCooldown,
};
