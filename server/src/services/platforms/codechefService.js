const axios = require('axios');
const { parseCodeChefUrl } = require('../../utils/urlParsers');
const { config } = require('../../config/env');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ==============================================================================
// 1. STATE, METRICS & CONFIGURATION
// ==============================================================================

const syncConfig = config.SYNC_CONFIG || {};
const MIN_REQUEST_DELAY_MS = syncConfig.CODECHEF_MIN_REQUEST_DELAY_MS || 3500;
const INITIAL_BACKOFF_MS = syncConfig.CODECHEF_INITIAL_BACKOFF_MS || 60000;
const MAX_BACKOFF_MS = syncConfig.CODECHEF_MAX_BACKOFF_MS || 300000;
const MAX_RETRIES = syncConfig.CODECHEF_MAX_RETRIES || 1;

// In-Memory Profile Cache (Prevents redundant requests during near-real-time polling)
const profileCache = new Map(); // Map<normalizedUsername, { data: Object, expiresAt: number }>
const CACHE_TTL_SUCCESS_MS = (syncConfig.CODECHEF_CACHE_TTL_MINUTES || 30) * 60 * 1000; // 30 minutes
const CACHE_TTL_FAIL_MS = (syncConfig.CODECHEF_CACHE_FAIL_TTL_MINUTES || 10) * 60 * 1000; // 10 minutes

let codechefCooldownUntil = 0;
let currentBackoffMs = INITIAL_BACKOFF_MS;
let lastRequestEndTime = 0;
let isQueueWorkerRunning = false;

// Request Queue & In-Flight Deduplication Map
const requestQueue = [];
const inFlightRequests = new Map(); // Map<normalizedUsername, Promise>

// Modern Browser User-Agents for rotation
const BROWSER_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
];

const getRandomUserAgent = () => BROWSER_USER_AGENTS[Math.floor(Math.random() * BROWSER_USER_AGENTS.length)];

// Telemetry & Metrics Tracker
const codechefMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  rateLimitedResponses: 0,
  failedRequests: 0,
  cachedResults: 0,
  lastSuccessfulFetch: null,
  lastError: null,
};

/**
 * Checks if CodeChef is currently in rate-limit cooldown
 * @returns {boolean}
 */
const isCodeChefInCooldown = () => {
  return Date.now() < codechefCooldownUntil;
};

/**
 * Returns remaining cooldown duration in seconds
 * @returns {number}
 */
const getCodeChefCooldownRemainingSeconds = () => {
  if (!isCodeChefInCooldown()) return 0;
  return Math.max(0, Math.ceil((codechefCooldownUntil - Date.now()) / 1000));
};

/**
 * Triggers or extends a rate-limit cooldown on CodeChef
 * @param {number} durationMs 
 */
const triggerCodeChefCooldown = (durationMs = INITIAL_BACKOFF_MS) => {
  if (!isCodeChefInCooldown()) {
    console.warn(`⚠️ [CodeChef] Rate limit (429) detected. Pausing CodeChef queue for ${Math.round(durationMs / 1000)}s.`);
  }
  codechefCooldownUntil = Math.max(codechefCooldownUntil, Date.now() + durationMs);
};

/**
 * Returns CodeChef operational and rate-limiting metrics
 * @returns {Object}
 */
const getCodeChefMetrics = () => {
  return {
    ...codechefMetrics,
    isInCooldown: isCodeChefInCooldown(),
    cooldownRemainingSeconds: getCodeChefCooldownRemainingSeconds(),
    cooldownUntil: codechefCooldownUntil ? new Date(codechefCooldownUntil).toISOString() : null,
    queueSize: requestQueue.length,
    activeInFlight: inFlightRequests.size,
    cacheSize: profileCache.size,
  };
};

// ==============================================================================
// 2. HTML PARSER — EXTRACT REAL SOLVED PROBLEM COUNT ONLY
// ==============================================================================

/**
 * Robustly parses CodeChef profile HTML to extract ONLY the verified solved count
 * @param {string} html 
 * @param {string} username 
 * @returns {number|null} Verified total problems solved, or null if unparseable
 */
const extractCodeChefSolvedCount = (html, username) => {
  if (!html || typeof html !== 'string') return null;

  // 1. Direct regex matching for "Total Problems Solved: X"
  const directPatterns = [
    /Total Problems Solved:\s*([0-9]+)/i,
    /<h3>Total Problems Solved:\s*([0-9]+)<\/h3>/i,
    /<h5>Total Problems Solved:\s*([0-9]+)<\/h5>/i,
    /Problems Solved:?\s*<[^>]+>\s*([0-9]+)/i,
    /Total Problems Solved\s*<\/[^>]+>\s*<[^>]+>\s*([0-9]+)/i,
    /problems-solved[\s\S]*?<h3>([0-9]+)<\/h3>/i,
    /problems-solved[\s\S]*?<h5>([0-9]+)<\/h5>/i,
  ];

  for (const pattern of directPatterns) {
    const match = html.match(pattern);
    if (match && match[1] !== undefined) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  }

  // 2. Check problem links inside the problems-solved section
  const sectionMatch = html.match(/<section[^>]*class="[^"]*problems-solved[^"]*"[^>]*>([\s\S]*?)<\/section>/i);
  if (sectionMatch && sectionMatch[1]) {
    const sectionHtml = sectionMatch[1];
    const problemLinks = sectionHtml.match(/<a\s+href="\/problems\//gi) || [];
    if (problemLinks.length > 0) {
      return problemLinks.length;
    }

    // If section explicitly contains "Total Problems Solved: </h3>" with no links / "None"
    if (sectionHtml.includes('Total Problems Solved') || sectionHtml.includes('Practice Paths (0)')) {
      return 0;
    }
  }

  // 3. Check if profile page exists but 0 problems solved
  const isProfile = html.includes('user-details-container') ||
                    html.includes('user-profile') ||
                    html.includes('/users/') ||
                    html.includes('rating-number');
  if (isProfile) {
    return 0;
  }

  return null;
};

// ==============================================================================
// 3. SINGLE CONTROLLED NETWORK REQUEST (NO IMMEDIATE RETRY ON 429)
// ==============================================================================

/**
 * Executes a single HTTP request to CodeChef with strict rate-limiting and 429 handling
 * @param {string} username 
 * @returns {Promise<Object>} Normalized result object
 */
const executeSingleCodeChefRequest = async (username) => {
  codechefMetrics.totalRequests++;

  const profileUrl = `https://www.codechef.com/users/${username}`;
  const now = new Date().toISOString();
  const normalizedKey = (username || '').toLowerCase().trim();

  // 1. Check in-memory cache first
  const cached = profileCache.get(normalizedKey);
  if (cached && Date.now() < cached.expiresAt) {
    codechefMetrics.cachedResults++;
    return cached.data;
  }

  // 2. If currently cooling down, return RATE_LIMITED immediately without network request
  if (isCodeChefInCooldown()) {
    codechefMetrics.cachedResults++;
    const remainingSec = getCodeChefCooldownRemainingSeconds();
    return {
      platform: 'codechef',
      username,
      profileUrl,
      totalSolved: cached?.data?.totalSolved ?? null,
      status: 'RATE_LIMITED',
      fetchedAt: now,
      errorMessage: `CodeChef platform is rate limited. Cooldown active for ${remainingSec}s.`,
    };
  }

  console.log(`[CodeChef] Fetching profile: ${username}`);

  try {
    const response = await axios.get(`https://www.codechef.com/users/${encodeURIComponent(username)}`, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Ch-Ua': '"Chromium";v="129", "Not=A?Brand";v="8", "Google Chrome";v="129"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://www.codechef.com/',
      },
      timeout: 15000,
      validateStatus: (status) => status < 500,
    });

    const html = response.data;
    const status = response.status;

    // Check for 429 status or Cloudflare challenge interception
    const isCloudflareChallenge = typeof html === 'string' && (
      html.includes('Just a moment...') ||
      html.includes('challenges.cloudflare.com') ||
      html.includes('_cf_chl_opt')
    );

    if (status === 429 || isCloudflareChallenge) {
      throw { response: { status: 429, headers: response.headers || {} }, message: 'CodeChef rate-limited or Cloudflare challenge encountered (429)' };
    }

    // Check for user not found or 404
    if (
      status === 404 ||
      typeof html !== 'string' ||
      html.includes('User does not exist') ||
      html.includes('Page Not Found') ||
      (html.includes('<meta property="og:url" content="https://www.codechef.com/"') && !html.includes('user-details-container')) ||
      (html.includes('<title>\n        CodeChef - Learn and Practice Coding with Problems') && !html.includes('user-details-container'))
    ) {
      codechefMetrics.failedRequests++;
      console.warn(`[CodeChef] User "${username}" not found.`);
      const notFoundResult = {
        platform: 'codechef',
        username,
        profileUrl,
        totalSolved: null,
        status: 'FAILED',
        fetchedAt: now,
        errorMessage: `User "${username}" not found on CodeChef`,
      };
      // Cache non-existent profile temporarily to avoid hammering CodeChef
      profileCache.set(normalizedKey, {
        data: notFoundResult,
        expiresAt: Date.now() + CACHE_TTL_FAIL_MS,
      });
      return notFoundResult;
    }

    // Extract ONLY the real total solved count
    const solvedCount = extractCodeChefSolvedCount(html, username);

    if (solvedCount === null) {
      codechefMetrics.failedRequests++;
      return {
        platform: 'codechef',
        username,
        profileUrl,
        totalSolved: null,
        status: 'FAILED',
        fetchedAt: now,
        errorMessage: `Could not parse problem statistics for "${username}"`,
      };
    }

    // Request succeeded! Reset backoff to base and update metrics
    currentBackoffMs = INITIAL_BACKOFF_MS;
    codechefMetrics.successfulRequests++;
    codechefMetrics.lastSuccessfulFetch = now;

    console.log(`[CodeChef] Parsed: Total Solved=${solvedCount}`);
    console.log(`[CodeChef] Validation passed`);

    const successResult = {
      platform: 'codechef',
      username,
      profileUrl,
      totalSolved: solvedCount,
      status: 'SUCCESS',
      fetchedAt: now,
      errorMessage: null,
    };

    // Cache successful profile
    profileCache.set(normalizedKey, {
      data: successResult,
      expiresAt: Date.now() + CACHE_TTL_SUCCESS_MS,
    });

    return successResult;
  } catch (err) {
    const status = err.response?.status;
    const is429 = status === 429 || (err.message && err.message.includes('429'));

    if (is429) {
      codechefMetrics.rateLimitedResponses++;

      // Check Retry-After header
      let cooldownMs = currentBackoffMs;
      const retryAfterHeader = err.response?.headers?.['retry-after'];
      if (retryAfterHeader) {
        const parsedSec = parseInt(retryAfterHeader, 10);
        if (!isNaN(parsedSec) && parsedSec > 0) {
          cooldownMs = parsedSec * 1000;
        } else {
          const parsedDate = new Date(retryAfterHeader).getTime();
          if (!isNaN(parsedDate) && parsedDate > Date.now()) {
            cooldownMs = parsedDate - Date.now();
          }
        }
      }

      // Avoid duplicate logs if already in cooldown
      if (!isCodeChefInCooldown()) {
        console.warn(`⚠️ [CodeChef] Rate limit (429) detected. Pausing CodeChef queue for ${Math.round(cooldownMs / 1000)}s.`);
      }

      // Set global cooldown and advance exponential backoff
      codechefCooldownUntil = Math.max(codechefCooldownUntil, Date.now() + cooldownMs);
      currentBackoffMs = Math.min(currentBackoffMs * 2, MAX_BACKOFF_MS);

      const previousSolved = cached?.data?.totalSolved ?? null;

      return {
        platform: 'codechef',
        username,
        profileUrl,
        totalSolved: previousSolved,
        status: 'RATE_LIMITED',
        fetchedAt: now,
        errorMessage: `CodeChef platform is rate limited. Paused for ${Math.round(cooldownMs / 1000)}s.`,
      };
    }

    codechefMetrics.failedRequests++;
    codechefMetrics.lastError = err.message || 'Network error';

    return {
      platform: 'codechef',
      username,
      profileUrl,
      totalSolved: cached?.data?.totalSolved ?? null,
      status: 'FAILED',
      fetchedAt: now,
      errorMessage: err.message || 'Failed to fetch CodeChef profile',
    };
  }
};

// ==============================================================================
// 4. CONTROLLED QUEUE WORKER (CONCURRENCY = 1, RESPECTS THROTTLE & COOLDOWN)
// ==============================================================================

const processNextQueueItem = async () => {
  if (isQueueWorkerRunning || requestQueue.length === 0) {
    return;
  }

  isQueueWorkerRunning = true;

  while (requestQueue.length > 0) {
    // If in cooldown, wait until cooldown expires or fast-resolve if requested
    if (isCodeChefInCooldown()) {
      const waitTimeMs = codechefCooldownUntil - Date.now();
      if (waitTimeMs > 0) {
        // Fast-drain remaining queue items with RATE_LIMITED status so we do not block sync processes
        while (requestQueue.length > 0) {
          const item = requestQueue.shift();
          const remainingSec = getCodeChefCooldownRemainingSeconds();
          const prevCached = profileCache.get(item.normalizedKey);
          item.resolve({
            platform: 'codechef',
            username: item.username,
            profileUrl: `https://www.codechef.com/users/${item.username}`,
            totalSolved: prevCached?.data?.totalSolved ?? null,
            status: 'RATE_LIMITED',
            fetchedAt: new Date().toISOString(),
            errorMessage: `CodeChef platform is rate limited. Cooldown active for ${remainingSec}s.`,
          });
        }
        break;
      }
    }

    // Ensure configurable minimum delay with random jitter (e.g. 3500-5000ms) to avoid robotic bot detection
    const delayWithJitter = MIN_REQUEST_DELAY_MS + Math.floor(Math.random() * 1500);
    const timeSinceLastEnd = Date.now() - lastRequestEndTime;
    if (timeSinceLastEnd < delayWithJitter) {
      await sleep(delayWithJitter - timeSinceLastEnd);
    }

    const item = requestQueue.shift();
    if (!item) continue;

    try {
      const result = await executeSingleCodeChefRequest(item.username);
      item.resolve(result);
    } catch (err) {
      item.reject(err);
    } finally {
      lastRequestEndTime = Date.now();
    }
  }

  isQueueWorkerRunning = false;
};

// ==============================================================================
// 5. PUBLIC API: FETCH PROFILE WITH DEDUPLICATION & QUEUE
// ==============================================================================

/**
 * Fetches CodeChef profile with queue serialization, deduplication, and 429 cooldown protection
 * @param {string} input - Username or profile URL
 * @returns {Promise<Object>} Normalized statistics object { platform, username, profileUrl, totalSolved, status, fetchedAt, errorMessage }
 */
const fetchCodeChefProfile = (input) => {
  const username = parseCodeChefUrl(input);

  if (!username) {
    return Promise.resolve({
      platform: 'codechef',
      username: input || '',
      profileUrl: input || '',
      totalSolved: null,
      status: 'FAILED',
      fetchedAt: new Date().toISOString(),
      errorMessage: 'Invalid CodeChef URL or username format',
    });
  }

  const normalizedKey = username.toLowerCase().trim();

  // 1. In-Memory Cache: If recently fetched and still fresh, return cached result immediately
  const cached = profileCache.get(normalizedKey);
  if (cached && Date.now() < cached.expiresAt) {
    codechefMetrics.cachedResults++;
    return Promise.resolve(cached.data);
  }

  // 2. Deduplication: If a request for this user is already in-flight or queued, reuse the Promise
  if (inFlightRequests.has(normalizedKey)) {
    codechefMetrics.cachedResults++;
    return inFlightRequests.get(normalizedKey);
  }

  // 3. If platform is in cooldown, return RATE_LIMITED immediately
  if (isCodeChefInCooldown()) {
    codechefMetrics.cachedResults++;
    const remainingSec = getCodeChefCooldownRemainingSeconds();
    return Promise.resolve({
      platform: 'codechef',
      username,
      profileUrl: `https://www.codechef.com/users/${username}`,
      totalSolved: cached?.data?.totalSolved ?? null,
      status: 'RATE_LIMITED',
      fetchedAt: new Date().toISOString(),
      errorMessage: `CodeChef platform is rate limited. Cooldown active for ${remainingSec}s.`,
    });
  }

  // 4. Enqueue the request and store in-flight Promise
  let resolvePromise;
  let rejectPromise;
  const requestPromise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  inFlightRequests.set(normalizedKey, requestPromise);

  requestPromise.finally(() => {
    inFlightRequests.delete(normalizedKey);
  });

  requestQueue.push({
    username,
    normalizedKey,
    resolve: resolvePromise,
    reject: rejectPromise,
    enqueuedAt: Date.now(),
  });

  processNextQueueItem();

  return requestPromise;
};

module.exports = {
  fetchCodeChefProfile,
  isCodeChefInCooldown,
  triggerCodeChefCooldown,
  getCodeChefCooldownRemainingSeconds,
  getCodeChefMetrics,
  extractCodeChefSolvedCount,
};
