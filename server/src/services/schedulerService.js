const { getAllStudents } = require('../supabase/supabaseRepository');
const { syncStudentPlatforms, isPlatformInCooldown } = require('./syncService');
const { recalculateCollegeRankings } = require('./ranking/rankingEngine');
const { config } = require('../config/env');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let isRunning = false;
let isLoopActive = false;
let syncTickerTimer = null;

// Track last sync check time per student: { [studentId]: timestamp }
const studentLastChecked = new Map();

/**
 * Checks if a student is due for a near-real-time synchronization check
 * @param {Object} student 
 * @returns {boolean}
 */
const isStudentDueForSync = (student) => {
  const platforms = student.platforms || {};
  const syncConfig = config.SYNC_CONFIG || {};

  const platformIntervals = {
    leetcode: (syncConfig.LEETCODE_INTERVAL_SECONDS || 60) * 1000,
    gfg: (syncConfig.GFG_INTERVAL_SECONDS || 120) * 1000,
    codeforces: (syncConfig.CODEFORCES_INTERVAL_SECONDS || 120) * 1000,
    codechef: (syncConfig.CODECHEF_INTERVAL_SECONDS || 300) * 1000,
    hackerrank: (syncConfig.HACKERRANK_INTERVAL_SECONDS || 120) * 1000,
  };

  const platformKeys = ['leetcode', 'gfg', 'codeforces', 'codechef', 'hackerrank'];
  const now = Date.now();

  for (const key of platformKeys) {
    const p = platforms[key];
    if (p && p.username) {
      if (isPlatformInCooldown(key)) continue;

      const lastFetchedMs = p.lastFetchedAt ? new Date(p.lastFetchedAt).getTime() : 0;
      const intervalMs = platformIntervals[key] || 60000;

      if (!p.lastFetchedAt || p.status === 'PENDING' || (now - lastFetchedMs >= intervalMs)) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Executes a single near-real-time synchronization tick across students due for checking
 */
const executeSyncTick = async () => {
  if (isRunning) return;
  isRunning = true;

  try {
    const allStudents = await getAllStudents({ accountStatus: 'ACTIVE' });
    if (!allStudents || allStudents.length === 0) {
      isRunning = false;
      return;
    }

    // Filter students due for sync
    const dueStudents = allStudents.filter(isStudentDueForSync);
    if (dueStudents.length === 0) {
      isRunning = false;
      return;
    }

    const concurrencyLimit = config.SYNC_CONFIG?.MAX_CONCURRENT_SYNCS || 2;
    const throttleMs = config.SYNC_CONFIG?.BATCH_THROTTLE_MS || 600;

    let totalChanged = 0;

    for (let i = 0; i < dueStudents.length; i += concurrencyLimit) {
      const batch = dueStudents.slice(i, i + concurrencyLimit);

      await Promise.all(
        batch.map(async (student) => {
          studentLastChecked.set(student.id, Date.now());

          try {
            const syncResult = await syncStudentPlatforms(student, null, { forceSync: false });

            if (syncResult && syncResult.hasChanged) {
              totalChanged++;
              console.log(
                `⚡ [Near-Real-Time Broadcast] ${student.name} updated: ${syncResult.detectedChanges.join(' | ')}`
              );
            }
          } catch (studentErr) {
            console.warn(`[Sync Worker Warning] Student ${student.name} (${student.id}):`, studentErr.message);
          }
        })
      );

      if (i + concurrencyLimit < dueStudents.length) {
        await sleep(throttleMs);
      }
    }

    if (totalChanged > 0) {
      // Recalculate college rankings once after batch updates if any changes occurred
      await recalculateCollegeRankings(config.COLLEGE_ID || 'COLLEGE_MAIN');
    }
  } catch (error) {
    console.error('[Near-Real-Time Scheduler Error]:', error.message);
  } finally {
    isRunning = false;
  }
};

/**
 * Starts the near-real-time polling engine loop
 */
const startBackgroundScheduler = () => {
  if (isLoopActive) return;
  isLoopActive = true;

  const tickIntervalMs = 3000; // Check the scheduler queue every 3 seconds
  console.log('🚀 Near-Real-Time Platform Sync Worker activated.');
  console.log(`   Configured Intervals: LeetCode: ${config.SYNC_CONFIG?.LEETCODE_INTERVAL_SECONDS}s, GFG: ${config.SYNC_CONFIG?.GFG_INTERVAL_SECONDS}s, HackerRank: ${config.SYNC_CONFIG?.HACKERRANK_INTERVAL_SECONDS}s, Codeforces: ${config.SYNC_CONFIG?.CODEFORCES_INTERVAL_SECONDS}s, CodeChef: ${config.SYNC_CONFIG?.CODECHEF_INTERVAL_SECONDS}s`);
  console.log(`   Max Concurrency: ${config.SYNC_CONFIG?.MAX_CONCURRENT_SYNCS}`);

  // Initial tick after 3s
  setTimeout(() => {
    executeSyncTick().catch((e) => console.warn('[Scheduler Initial Tick]:', e.message));
  }, 3000);

  syncTickerTimer = setInterval(() => {
    executeSyncTick().catch((e) => console.warn('[Scheduler Tick Error]:', e.message));
  }, tickIntervalMs);
};

/**
 * Stops the near-real-time polling engine loop
 */
const stopBackgroundScheduler = () => {
  if (syncTickerTimer) {
    clearInterval(syncTickerTimer);
    syncTickerTimer = null;
  }
  isLoopActive = false;
  console.log('🛑 Near-Real-Time Platform Sync Worker stopped.');
};

module.exports = {
  startBackgroundScheduler,
  stopBackgroundScheduler,
  executeSyncTick,
};
