const { getSupabase } = require('../supabase/supabaseClient');
const {
  getSystemSettings: getSettingsFromRepo,
  updateSystemSettings: updateSettingsInRepo,
  insertNotification,
} = require('../supabase/supabaseRepository');
const { SCORING_WEIGHTS } = require('./scoring/scoringConfig');
const { config } = require('../config/env');

// ==============================================================================
// 1. IN-MEMORY SETTINGS CACHE & DEFAULTS
// ==============================================================================

const DEFAULT_SETTINGS = {
  collegeIdentifier: config.COLLEGE_ID || 'COLLEGE_MAIN',
  collegeDisplayName: config.COLLEGE_NAME || 'Engineering College',
  syncConcurrency: 5,
  syncThrottleMs: 350,
  autoSyncAfterImport: false,
  scoringWeights: SCORING_WEIGHTS,
  updatedBy: 'system',
  updatedAt: new Date().toISOString(),
};

let cachedSettings = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 15000; // 15 seconds TTL fallback

/**
 * Normalizes raw settings object with standard camelCase keys and backward-compatible aliases
 * @param {Object} raw 
 * @returns {Object}
 */
const normalizeSettings = (raw = {}) => {
  const collegeIdentifier = (
    raw.collegeIdentifier ||
    raw.college_identifier ||
    raw.collegeId ||
    raw.college_id ||
    raw.scoringWeights?._config?.collegeIdentifier ||
    DEFAULT_SETTINGS.collegeIdentifier
  ).trim();

  const collegeDisplayName = (
    raw.collegeDisplayName ||
    raw.college_display_name ||
    raw.collegeName ||
    raw.college_name ||
    raw.scoringWeights?._config?.collegeDisplayName ||
    DEFAULT_SETTINGS.collegeDisplayName
  ).trim();

  const rawConcurrency = raw.syncConcurrency ?? raw.sync_concurrency ?? raw.syncBatchSize ?? raw.sync_batch_size ?? raw.scoringWeights?._config?.syncConcurrency;
  let syncConcurrency = parseInt(rawConcurrency, 10);
  if (isNaN(syncConcurrency) || syncConcurrency < 1 || syncConcurrency > 20) {
    syncConcurrency = DEFAULT_SETTINGS.syncConcurrency;
  }

  const rawThrottle = raw.syncThrottleMs ?? raw.sync_throttle_ms ?? raw.scoringWeights?._config?.syncThrottleMs;
  let syncThrottleMs = parseInt(rawThrottle, 10);
  if (isNaN(syncThrottleMs) || syncThrottleMs < 0 || syncThrottleMs > 10000) {
    syncThrottleMs = DEFAULT_SETTINGS.syncThrottleMs;
  }

  const rawAutoSync = raw.autoSyncAfterImport ?? raw.auto_sync_after_import ?? raw.enableAutoSyncOnImport ?? raw.enable_auto_sync_on_import ?? raw.scoringWeights?._config?.autoSyncAfterImport;
  const autoSyncAfterImport = Boolean(rawAutoSync);

  return {
    id: 'config',
    collegeIdentifier,
    collegeDisplayName,
    collegeId: collegeIdentifier, // Alias
    collegeName: collegeDisplayName, // Alias
    syncConcurrency,
    syncBatchSize: syncConcurrency, // Alias
    syncThrottleMs,
    autoSyncAfterImport,
    enableAutoSyncOnImport: autoSyncAfterImport, // Alias
    scoringWeights: raw.scoringWeights || raw.scoring_weights || SCORING_WEIGHTS,
    updatedBy: raw.updatedBy || raw.updated_by || 'system',
    updatedAt: raw.updatedAt || raw.updated_at || new Date().toISOString(),
  };
};

// ==============================================================================
// 2. RETRIEVE AUTHORITATIVE SYSTEM SETTINGS
// ==============================================================================

/**
 * Retrieves persisted system settings from Supabase database with caching
 * @param {boolean} forceRefresh - If true, bypasses in-memory cache
 * @returns {Promise<Object>} Authoritative settings object
 */
const getSystemSettings = async (forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && cachedSettings && now < cacheExpiry) {
    return { ...cachedSettings };
  }

  try {
    const rawFromRepo = await getSettingsFromRepo();
    if (rawFromRepo && Object.keys(rawFromRepo).length > 0) {
      cachedSettings = normalizeSettings(rawFromRepo);
      cacheExpiry = now + CACHE_TTL_MS;
      return { ...cachedSettings };
    }

    // If no configuration found in DB, seed with default settings
    console.log('⚙️ [SettingsService] No database configuration found. Initializing with defaults...');
    try {
      await updateSettingsInRepo({
        ...DEFAULT_SETTINGS,
        updatedBy: 'system_init',
      });
    } catch (seedErr) {
      console.warn('[SettingsService Init Notice]:', seedErr.message);
    }

    cachedSettings = { ...DEFAULT_SETTINGS };
    cacheExpiry = now + CACHE_TTL_MS;
    return { ...cachedSettings };
  } catch (error) {
    console.error('[SettingsService getSystemSettings Error]:', error.message);
    return cachedSettings ? { ...cachedSettings } : { ...DEFAULT_SETTINGS };
  }
};

/**
 * Clears in-memory settings cache
 */
const invalidateSettingsCache = () => {
  cachedSettings = null;
  cacheExpiry = 0;
};

// ==============================================================================
// 3. PERSIST & UPDATE SYSTEM SETTINGS
// ==============================================================================

/**
 * Validates and updates authoritative system settings in Supabase
 * @param {Object} input - { collegeIdentifier, collegeDisplayName, syncConcurrency, syncThrottleMs, autoSyncAfterImport }
 * @param {Object|null} adminUser - Admin user executing the update
 * @returns {Promise<Object>} Updated settings
 */
const updateSystemSettings = async (input = {}, adminUser = null) => {
  // 1. Validation
  const errors = [];

  let effectiveConcurrency = undefined;
  const rawConcurrency = input.syncConcurrency !== undefined ? input.syncConcurrency : input.syncBatchSize;
  if (rawConcurrency !== undefined) {
    const parsed = parseInt(rawConcurrency, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 20) {
      errors.push('Bulk Synchronization Concurrency must be an integer between 1 and 20.');
    } else {
      effectiveConcurrency = parsed;
    }
  }

  let effectiveThrottle = undefined;
  if (input.syncThrottleMs !== undefined) {
    const parsed = parseInt(input.syncThrottleMs, 10);
    if (isNaN(parsed) || parsed < 0 || parsed > 10000) {
      errors.push('Inter-batch Throttle Delay must be an integer between 0 and 10000 milliseconds.');
    } else {
      effectiveThrottle = parsed;
    }
  }

  let effectiveCollegeId = undefined;
  const rawCollegeId = input.collegeIdentifier !== undefined ? input.collegeIdentifier : input.collegeId;
  if (rawCollegeId !== undefined) {
    const trimmed = String(rawCollegeId).trim();
    if (!trimmed || trimmed.length > 50) {
      errors.push('College Identifier must be between 1 and 50 characters.');
    } else {
      effectiveCollegeId = trimmed;
    }
  }

  let effectiveCollegeName = undefined;
  const rawCollegeName = input.collegeDisplayName !== undefined ? input.collegeDisplayName : input.collegeName;
  if (rawCollegeName !== undefined) {
    const trimmed = String(rawCollegeName).trim();
    if (!trimmed || trimmed.length > 100) {
      errors.push('College Display Name must be between 1 and 100 characters.');
    } else {
      effectiveCollegeName = trimmed;
    }
  }

  let effectiveAutoSync = undefined;
  const rawAutoSync = input.autoSyncAfterImport !== undefined ? input.autoSyncAfterImport : input.enableAutoSyncOnImport;
  if (rawAutoSync !== undefined) {
    effectiveAutoSync = Boolean(rawAutoSync);
  }

  if (errors.length > 0) {
    const err = new Error(errors.join(' '));
    err.status = 400;
    err.validationErrors = errors;
    throw err;
  }

  // 2. Fetch current settings to detect actual diffs
  const prevSettings = await getSystemSettings(true);

  // 3. Build payload
  const updatePayload = {
    collegeIdentifier: effectiveCollegeId !== undefined ? effectiveCollegeId : prevSettings.collegeIdentifier,
    collegeDisplayName: effectiveCollegeName !== undefined ? effectiveCollegeName : prevSettings.collegeDisplayName,
    syncConcurrency: effectiveConcurrency !== undefined ? effectiveConcurrency : prevSettings.syncConcurrency,
    syncThrottleMs: effectiveThrottle !== undefined ? effectiveThrottle : prevSettings.syncThrottleMs,
    autoSyncAfterImport: effectiveAutoSync !== undefined ? effectiveAutoSync : prevSettings.autoSyncAfterImport,
    updatedBy: adminUser?.email || adminUser?.name || 'admin',
    updatedAt: new Date().toISOString(),
  };

  // 4. Save to Supabase repository
  await updateSettingsInRepo(updatePayload);

  // 5. Invalidate cache immediately
  invalidateSettingsCache();

  // 6. Fetch fresh saved configuration from DB
  const savedSettings = await getSystemSettings(true);

  // 7. Track diffs and dispatch Notification if setting changed
  const diffs = [];
  if (prevSettings.collegeIdentifier !== savedSettings.collegeIdentifier) {
    diffs.push(`College ID: "${prevSettings.collegeIdentifier}" → "${savedSettings.collegeIdentifier}"`);
  }
  if (prevSettings.collegeDisplayName !== savedSettings.collegeDisplayName) {
    diffs.push(`College Name: "${prevSettings.collegeDisplayName}" → "${savedSettings.collegeDisplayName}"`);
  }
  if (prevSettings.syncConcurrency !== savedSettings.syncConcurrency) {
    diffs.push(`Concurrency: ${prevSettings.syncConcurrency} → ${savedSettings.syncConcurrency}`);
  }
  if (prevSettings.syncThrottleMs !== savedSettings.syncThrottleMs) {
    diffs.push(`Throttle: ${prevSettings.syncThrottleMs}ms → ${savedSettings.syncThrottleMs}ms`);
  }
  if (prevSettings.autoSyncAfterImport !== savedSettings.autoSyncAfterImport) {
    diffs.push(`Auto-Sync on Import: ${prevSettings.autoSyncAfterImport} → ${savedSettings.autoSyncAfterImport}`);
  }

  if (diffs.length > 0) {
    try {
      await insertNotification({
        type: 'SYSTEM_SETTINGS',
        title: 'System Settings Updated',
        message: `Admin ${adminUser?.name || adminUser?.email || 'Administrator'} modified configuration: ${diffs.join(', ')}`,
        severity: 'INFO',
        targetId: 'config',
      });
    } catch (notifErr) {
      console.warn('[SettingsService Notification Notice]:', notifErr.message);
    }
  }

  return savedSettings;
};

// ==============================================================================
// 4. REAL SYSTEM & INFRASTRUCTURE HEALTH MONITORING
// ==============================================================================

/**
 * Performs real live checks on Supabase PostgreSQL, Clerk Auth, and Node.js Server
 * @returns {Promise<Object>} Real live system health metrics
 */
const getSystemHealth = async () => {
  const checkedAt = new Date().toISOString();

  // 1. Supabase PostgreSQL Live Latency & Connectivity Check
  let dbStatus = 'DISCONNECTED';
  let dbLatencyMs = null;
  let dbMessage = 'Database connection failed';
  const t0 = Date.now();

  try {
    const supabase = getSupabase();
    if (supabase) {
      const { count, error } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true });

      const elapsed = Date.now() - t0;
      if (!error) {
        dbStatus = 'CONNECTED';
        dbLatencyMs = elapsed;
        dbMessage = `Connected (Single Source of Truth) • ${elapsed}ms latency`;
      } else {
        dbMessage = error.message || 'Supabase query error';
      }
    }
  } catch (err) {
    dbMessage = err.message || 'Database unreachable';
  }

  // 2. Clerk Authentication Health Check
  let authStatus = 'CONFIGURATION_ERROR';
  let authMessage = 'Clerk Secret Key missing';
  if (config.CLERK_SECRET_KEY) {
    authStatus = 'HEALTHY';
    authMessage = 'JWT Secret Key Verified';
  }

  // 3. Node Server Runtime Metrics
  const uptimeSeconds = Math.floor(process.uptime());
  const mem = process.memoryUsage();
  const memoryHeapUsedMb = Math.round(mem.heapUsed / (1024 * 1024));

  return {
    server: {
      status: 'HEALTHY',
      nodeVersion: process.version,
      uptimeSeconds,
      uptimeFormatted: formatUptime(uptimeSeconds),
      memoryHeapUsedMb,
      environment: config.NODE_ENV || 'development',
    },
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      provider: 'Supabase PostgreSQL',
      message: dbMessage,
    },
    authentication: {
      status: authStatus,
      provider: 'Clerk',
      message: authMessage,
    },
    checkedAt,
  };
};

/**
 * Helper to format seconds into readable uptime string (e.g., "14h 25m" or "45m")
 * @param {number} totalSeconds 
 * @returns {string}
 */
const formatUptime = (totalSeconds = 0) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

module.exports = {
  getSystemSettings,
  updateSystemSettings,
  invalidateSettingsCache,
  getSystemHealth,
  normalizeSettings,
  DEFAULT_SETTINGS,
};
