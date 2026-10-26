/**
 * Student Activity Tracking & Aggregation Service
 * 
 * Computes daily, weekly, monthly, and custom-range problem solving activity
 * from persistent historical snapshots using Asia/Kolkata timezone boundaries.
 * 
 * Key Principles:
 * 1. Period activity is calculated from valid historical differences between snapshots.
 * 2. Cumulative totals are NEVER presented as period-specific new solves.
 * 3. Multi-day gaps without snapshots are flagged as interval-based / approximate.
 * 4. Failed fetches and rate limits NEVER invent activity or zero-out statistics.
 * 5. CodeChef & Codeforces are always statistics-only (0% weight).
 * 6. GFG scoring weights: Easy 30%, Medium 40%, Hard 30% (School/Basic stats-only).
 */

const {
  insertActivitySnapshot,
  getActivitySnapshots,
  getAllSnapshotsInDateRange,
  getLatestSnapshotBefore,
  hasHistoricalData,
  getAllStudents,
  getStudentById,
} = require('../../supabase/supabaseRepository');

const {
  getKolkataTodayString,
  getKolkataNDaysAgoString,
  getKolkataMonthStartString,
  getKolkataDayBounds,
  getDateRangeDays,
  getKolkataDateString,
  getKolkataDaysBetween,
  resolvePeriodBounds,
} = require('../../utils/timezoneUtils');

const PLATFORMS = ['leetcode', 'gfg', 'hackerrank', 'codeforces', 'codechef'];

// In-memory cache of snapshots recorded today: Map<"studentId:platform:activityDate", Object>
const recordedSnapshotsMemoryCache = new Map();

/**
 * Persists a verified observation from the synchronization workflow into the snapshots store
 * 
 * @param {string} studentId 
 * @param {string} platform 
 * @param {Object} stats - Platform stats object returned from platform fetcher
 * @param {Object} options - { force: boolean }
 * @returns {Promise<Object|null>}
 */
async function recordPlatformSnapshot(studentId, platform, stats, options = {}) {
  if (!studentId || !platform || !stats) return null;
  const platKey = platform.toLowerCase().trim();

  // ONLY record snapshots for SUCCESSFUL platform observations with valid numbers
  // NEVER record snapshots for FAILED or RATE_LIMITED requests with null/missing counts
  if (stats.status !== 'SUCCESS') {
    return null;
  }

  if (stats.totalSolved === null || stats.totalSolved === undefined || isNaN(Number(stats.totalSolved))) {
    return null;
  }

  const timestamp = stats.fetchedAt || new Date().toISOString();
  const activityDate = getKolkataDateString(timestamp) || getKolkataTodayString();
  const memoryKey = `${studentId}:${platKey}:${activityDate}`;

  // In-memory fast guard: if this student+platform snapshot was already recorded for today and no solve changes occurred, return immediately
  if (!options.hasChanged && !options.force) {
    if (recordedSnapshotsMemoryCache.has(memoryKey)) {
      return recordedSnapshotsMemoryCache.get(memoryKey);
    }

    try {
      const existingToday = await getActivitySnapshots({
        studentId,
        platform: platKey,
        startDate: activityDate,
        endDate: activityDate,
        limit: 1,
      });
      if (existingToday && existingToday.length > 0) {
        recordedSnapshotsMemoryCache.set(memoryKey, existingToday[0]);
        return existingToday[0];
      }
    } catch (e) {
      // Fall through to record snapshot
    }
  }

  // Extract difficulty breakdown
  let easySolved = 0;
  let mediumSolved = 0;
  let hardSolved = 0;
  let schoolSolved = 0;
  let basicSolved = 0;
  let totalSolved = Number(stats.totalSolved);

  if (platKey === 'leetcode') {
    easySolved = Number(stats.easySolved ?? 0);
    mediumSolved = Number(stats.mediumSolved ?? 0);
    hardSolved = Number(stats.hardSolved ?? 0);
  } else if (platKey === 'gfg') {
    schoolSolved = Number(stats.schoolSolved ?? 0);
    basicSolved = Number(stats.basicSolved ?? 0);
    easySolved = Number(stats.easySolved ?? 0);
    mediumSolved = Number(stats.mediumSolved ?? 0);
    hardSolved = Number(stats.hardSolved ?? 0);
  } else if (platKey === 'codeforces') {
    easySolved = Number(stats.easySolved ?? 0);
    mediumSolved = Number(stats.mediumSolved ?? 0);
    hardSolved = Number(stats.hardSolved ?? 0);
  }

  const snapshotPayload = {
    studentId,
    platform: platKey,
    snapshotTimestamp: timestamp,
    activityDate,
    totalSolved,
    easySolved,
    mediumSolved,
    hardSolved,
    schoolSolved,
    basicSolved,
    rating: stats.rating !== undefined && stats.rating !== null ? Number(stats.rating) : null,
    status: 'SUCCESS',
    errorMessage: null,
    rawStats: {
      username: stats.username || '',
      profileUrl: stats.profileUrl || '',
      badges: stats.badges || stats.badgesCount || 0,
      stars: stats.stars || 0,
      certificates: stats.certificates || stats.certificatesCount || 0,
      streak: stats.streak || null,
      recentSubmissions: Array.isArray(stats.recentSubmissions) ? stats.recentSubmissions : [],
      submissionCalendar: stats.submissionCalendar || null,
    },
  };

  try {
    const res = await insertActivitySnapshot(snapshotPayload);
    if (res) {
      recordedSnapshotsMemoryCache.set(memoryKey, res);
    }
    return res;
  } catch (err) {
    console.warn(`[Snapshot Record Warning] ${studentId} on ${platKey}:`, err.message);
    return null;
  }
}

/**
 * Computes period activity for a student across all platforms
 * 
 * @param {string} studentId 
 * @param {Object} options - { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD', period: 'today'|'2d'|'7d'|'30d'|'month'|'custom' }
 * @returns {Promise<Object>}
 */
async function getStudentActivityPeriod(studentId, options = {}) {
  const periodConfig = resolvePeriodBounds({
    period: options.period,
    date: options.date,
    startDate: options.startDate,
    endDate: options.endDate,
  });
  const { startDate, endDate, startUtc, endUtc, baselineStartDate, periodType, daysCount, label } = periodConfig;
  const startUtcMs = startUtc.getTime();
  const endUtcMs = endUtc.getTime();
  const startUtcSec = Math.floor(startUtcMs / 1000);
  const endUtcSec = Math.floor(endUtcMs / 1000);

  // Load student profile & latest live stats
  const student = await getStudentById(studentId);
  if (!student) {
    throw new Error(`Student not found: ${studentId}`);
  }

  // Load snapshots for this student across period and baseline window
  const rawSnapshots = await getActivitySnapshots({
    studentId,
    startDate: baselineStartDate,
    endDate,
    limit: 1000,
  });

  // Filter to only SUCCESS snapshots with valid total_solved
  const snapshots = rawSnapshots.filter(
    (s) => s.status === 'SUCCESS' && s.totalSolved !== null && s.totalSolved !== undefined && !isNaN(Number(s.totalSolved))
  );

  const daysList = getDateRangeDays(startDate, endDate);

  // Group snapshots by platform
  const platformSnapshots = {};
  PLATFORMS.forEach((p) => {
    platformSnapshots[p] = snapshots.filter((s) => s.platform === p);
  });

  // Calculate per-platform activity
  const platformActivity = {};
  let totalNewSolvesAllPlatforms = 0;
  let scoredNewSolves = 0; // LeetCode + GFG + HackerRank

  for (const plat of PLATFORMS) {
    const pSnaps = platformSnapshots[plat] || [];
    const liveProfile = student.platforms?.[plat] || {};
    const liveStats = student.platformStats?.[plat] || {};

    // Get snapshot immediately before period start for baseline calculation
    const rawBaselineSnap = await getLatestSnapshotBefore(studentId, plat, startUtc.toISOString());
    const baselineSnap = rawBaselineSnap && rawBaselineSnap.status === 'SUCCESS' && rawBaselineSnap.totalSolved !== null ? rawBaselineSnap : null;

    const result = {
      platform: plat,
      profileUrl: liveProfile.profileUrl || '',
      username: liveProfile.username || '',
      status: liveProfile.status || 'NOT_CONNECTED',
      lastFetchedAt: liveProfile.lastFetchedAt || liveStats.fetchedAt || null,
      errorMessage: liveProfile.errorMessage || null,
      cumulativeSolved: liveStats.totalSolved ?? 0,
      newSolves: 0,
      easyNew: 0,
      mediumNew: 0,
      hardNew: 0,
      schoolNew: 0,
      basicNew: 0,
      isIntervalBased: false,
      intervalDays: null,
      confidence: 'HIGH',
      hasData: liveProfile.status === 'SUCCESS' || pSnaps.length > 0,
      dailyTrend: [],
      difficultySupported: plat === 'leetcode' || plat === 'gfg' || plat === 'codeforces',
    };

    // Filter snapshots inside current period using exact UTC timestamp bounds
    const inPeriodSnaps = pSnaps.filter((s) => {
      const ts = new Date(s.snapshotTimestamp).getTime();
      return ts >= startUtcMs && ts <= endUtcMs;
    });
    inPeriodSnaps.sort((a, b) => new Date(a.snapshotTimestamp) - new Date(b.snapshotTimestamp));

    // Check dated submissions for LeetCode if available
    let datedSolvesCount = 0;
    if (plat === 'leetcode') {
      const recentSubs = liveStats.recentSubmissions || (inPeriodSnaps.length > 0 ? inPeriodSnaps[inPeriodSnaps.length - 1]?.rawStats?.recentSubmissions : null) || [];
      if (Array.isArray(recentSubs) && recentSubs.length > 0) {
        const inPeriodSubs = recentSubs.filter((sub) => {
          const subTs = Number(sub.timestamp);
          return subTs >= startUtcSec && subTs <= endUtcSec;
        });
        const distinctSlugs = new Set(inPeriodSubs.map((s) => s.titleSlug || s.title));
        datedSolvesCount = distinctSlugs.size;
      }
    }

    if (inPeriodSnaps.length > 0 || baselineSnap) {
      // Determine appropriate anchor snapshot
      let anchor = null;
      let latest = null;

    if (baselineSnap) {
      const baselineMs = new Date(baselineSnap.snapshotTimestamp).getTime();
      const diffHours = (startUtcMs - baselineMs) / (1000 * 60 * 60);
      // For single-day periods (Today), baseline must be within 14 hours of period start
      if (periodType === 'today' || periodType === 'single-date') {
        if (diffHours <= 14) {
          anchor = baselineSnap;
        } else if (inPeriodSnaps.length >= 2) {
          anchor = inPeriodSnaps[0];
        }
      } else {
        // Multi-day: allow baseline within 36 hours of start, or earliest in-period
        if (diffHours <= 36) {
          anchor = baselineSnap;
        } else if (inPeriodSnaps.length >= 2) {
          anchor = inPeriodSnaps[0];
        } else {
          anchor = inPeriodSnaps.length > 0 ? inPeriodSnaps[0] : null;
        }
      }
    } else if (inPeriodSnaps.length >= 2) {
      anchor = inPeriodSnaps[0];
    }

    if (inPeriodSnaps.length > 0) {
      latest = inPeriodSnaps[inPeriodSnaps.length - 1];
    } else if (anchor && liveStats.totalSolved !== undefined) {
      latest = {
        totalSolved: liveStats.totalSolved,
        easySolved: liveStats.easySolved || 0,
        mediumSolved: liveStats.mediumSolved || 0,
        hardSolved: liveStats.hardSolved || 0,
        schoolSolved: liveStats.schoolSolved || 0,
        basicSolved: liveStats.basicSolved || 0,
        snapshotTimestamp: liveProfile.lastFetchedAt || new Date().toISOString(),
      };
    }

    let snapDelta = 0;
    if (anchor && latest && (anchor.snapshotTimestamp !== latest.snapshotTimestamp || anchor.id !== latest.id)) {
      snapDelta = Math.max(0, (latest.totalSolved || 0) - (anchor.totalSolved || 0));

      const daysBetween = getKolkataDaysBetween(anchor.snapshotTimestamp, latest.snapshotTimestamp);
      if (daysBetween > 1 && inPeriodSnaps.length <= 2) {
        result.isIntervalBased = true;
        result.intervalDays = daysBetween;
        result.confidence = 'APPROXIMATE';
      }
    } else if (!anchor && inPeriodSnaps.length === 1) {
      result.confidence = 'BASELINE_ONLY';
    }

    // Combine dated solves (LeetCode) with snapshot differential
    if (plat === 'leetcode' && datedSolvesCount > 0) {
      result.newSolves = Math.max(datedSolvesCount, snapDelta);
    } else {
      result.newSolves = snapDelta;
    }

    // Difficulty breakdown: ONLY compute deltas if newSolves > 0 AND anchor had valid difficulty counts
    if (result.newSolves > 0 && anchor && latest) {
      const anchorHasDifficulties = (anchor.easySolved || 0) + (anchor.mediumSolved || 0) + (anchor.hardSolved || 0) > 0 || anchor.totalSolved === 0;
      if (anchorHasDifficulties && (plat === 'leetcode' || plat === 'gfg' || plat === 'codeforces')) {
        result.easyNew = Math.max(0, (latest.easySolved || 0) - (anchor.easySolved || 0));
        result.mediumNew = Math.max(0, (latest.mediumSolved || 0) - (anchor.mediumSolved || 0));
        result.hardNew = Math.max(0, (latest.hardSolved || 0) - (anchor.hardSolved || 0));
      }

      if (plat === 'gfg') {
        const anchorHasGfgDiffs = (anchor.schoolSolved || 0) + (anchor.basicSolved || 0) > 0 || anchor.totalSolved === 0;
        if (anchorHasGfgDiffs) {
          result.schoolNew = Math.max(0, (latest.schoolSolved || 0) - (anchor.schoolSolved || 0));
          result.basicNew = Math.max(0, (latest.basicSolved || 0) - (anchor.basicSolved || 0));
        }
      }
    } else {
      result.easyNew = 0;
      result.mediumNew = 0;
      result.hardNew = 0;
      result.schoolNew = 0;
      result.basicNew = 0;
    }

      // Build daily trend array accurately without compounding duplicate steps
      const dateMap = new Map();
      daysList.forEach((d) => dateMap.set(d, 0));

      const daySnapsMap = new Map();
      inPeriodSnaps.forEach((s) => {
        const dStr = s.activityDate || getKolkataDateString(s.snapshotTimestamp);
        if (!daySnapsMap.has(dStr)) daySnapsMap.set(dStr, []);
        daySnapsMap.get(dStr).push(s);
      });

      let dayAnchor = baselineSnap;
      daysList.forEach((dStr) => {
        const dSnaps = daySnapsMap.get(dStr);
        if (dSnaps && dSnaps.length > 0) {
          dSnaps.sort((a, b) => new Date(a.snapshotTimestamp) - new Date(b.snapshotTimestamp));
          const firstOfDay = dSnaps[0];
          const lastOfDay = dSnaps[dSnaps.length - 1];
          const anchorForDay = dayAnchor || (dSnaps.length > 1 ? firstOfDay : null);
          if (anchorForDay) {
            const dayDelta = Math.max(0, (lastOfDay.totalSolved || 0) - (anchorForDay.totalSolved || 0));
            dateMap.set(dStr, dayDelta);
          }
          dayAnchor = lastOfDay;
        }
      });

      result.dailyTrend = Array.from(dateMap.entries()).map(([date, count]) => ({ date, count }));
    } else {
      result.dailyTrend = daysList.map((d) => ({ date: d, count: 0 }));
      if (liveProfile.status === 'NOT_CONNECTED') {
        result.confidence = 'NOT_CONNECTED';
      } else {
        result.confidence = 'NO_HISTORY_YET';
      }
    }

    platformActivity[plat] = result;
    totalNewSolvesAllPlatforms += result.newSolves;

    if (['leetcode', 'gfg', 'hackerrank'].includes(plat)) {
      scoredNewSolves += result.newSolves;
    }
  }

  // Calculate historical baseline average for this student (past 14 days)
  const baselineSnapshots = await getActivitySnapshots({
    studentId,
    startDate: getKolkataNDaysAgoString(14),
    endDate: getKolkataNDaysAgoString(1),
    limit: 500,
  });

  let historicalDailyAverage = null;
  if (baselineSnapshots.length >= 2) {
    let baselineTotalSolves = 0;
    PLATFORMS.forEach((plat) => {
      const pB = baselineSnapshots.filter((s) => s.platform === plat);
      if (pB.length >= 2) {
        const first = pB[0];
        const last = pB[pB.length - 1];
        baselineTotalSolves += Math.max(0, (last.totalSolved || 0) - (first.totalSolved || 0));
      }
    });
    historicalDailyAverage = Number((baselineTotalSolves / 14).toFixed(2));
  }

  return {
    student: {
      id: student.id,
      name: student.name,
      rollNumber: student.rollNumber || '',
      department: student.department || '',
      year: student.year || 4,
      finalScore: student.finalScore || 0,
      rank: student.rank || null,
      lastDataUpdatedAt: student.lastDataUpdatedAt,
    },
    period: {
      periodType: periodType || 'custom',
      startDate,
      endDate,
      timezone: 'Asia/Kolkata',
      daysCount: daysList.length,
    },
    hasHistoricalData: snapshots.length > 0,
    totalNewSolvesAllPlatforms,
    scoredNewSolves,
    historicalDailyAverage,
    platforms: platformActivity,
  };
}

/**
 * Helper to match department flexibly across abbreviations and full names
 */
function matchesDepartment(studentDept, filter) {
  if (!filter || filter === 'ALL') return true;
  const sDept = (studentDept || '').toLowerCase().trim();
  const bFilter = filter.toLowerCase().trim();

  if (sDept === bFilter) return true;
  if (bFilter === 'cse' && (sDept.includes('computer science') || sDept === 'cse')) return true;
  if (bFilter === 'it' && (sDept.includes('information tech') || sDept === 'it')) return true;
  if (bFilter === 'ece' && (sDept.includes('electronics & comm') || sDept.includes('electronics and comm') || sDept === 'ece')) return true;
  if (bFilter === 'eee' && (sDept.includes('electrical & elect') || sDept.includes('electrical and elect') || sDept === 'eee')) return true;
  if (bFilter === 'mech' && (sDept.includes('mechanical') || sDept === 'mech')) return true;
  if (bFilter === 'prime' && sDept.includes('prime')) return true;
  if ((bFilter === 'ai&ds' || bFilter === 'aids') && (sDept.includes('artificial intelligence') || sDept.includes('ai&ds') || sDept.includes('ai & ds'))) return true;
  if (bFilter === 'civil' && sDept.includes('civil')) return true;
  if (bFilter === 'aiml' && (sDept.includes('aiml') || sDept.includes('ai&ml') || sDept.includes('ai & ml'))) return true;
  if (bFilter === 'csit' && sDept.includes('csit')) return true;
  if (bFilter === 'csds' && sDept.includes('csds')) return true;
  if (bFilter === 'csbs' && sDept.includes('csbs')) return true;
  if (bFilter === 'csiot' && sDept.includes('csiot')) return true;
  if (bFilter === 'vlsi' && sDept.includes('vlsi')) return true;

  return false;
}

/**
 * Problem Solvers ranking calculation across reporting periods
 * Displays students ranked by distinct verified newly solved problems for the selected period/date.
 * 
 * @param {Object} options - { period, date, startDate, endDate, branch, year, platform, limit, offset, search }
 * @returns {Promise<Object>}
 */
async function getTodayTopSolvers(options = {}) {
  const periodConfig = resolvePeriodBounds({
    period: options.period,
    date: options.date,
    startDate: options.startDate,
    endDate: options.endDate,
  });
  const { startDate, endDate, startUtc, endUtc, baselineStartDate, periodType, label } = periodConfig;
  const startUtcMs = startUtc.getTime();
  const endUtcMs = endUtc.getTime();
  const startUtcSec = Math.floor(startUtcMs / 1000);
  const endUtcSec = Math.floor(endUtcMs / 1000);

  const branchFilter = options.branch || 'ALL';
  const yearFilter = options.year ? String(options.year) : 'ALL';
  const platformFilter = options.platform && options.platform.toUpperCase() !== 'ALL'
    ? options.platform.toLowerCase()
    : 'ALL';
  const searchQuery = options.search ? options.search.trim().toLowerCase() : '';
  const limit = options.limit !== undefined ? (options.limit === 'all' ? 1000 : parseInt(options.limit, 10) || 20) : 20;
  const offset = parseInt(options.offset, 10) || 0;

  // Fetch all active students
  const allStudents = await getAllStudents();

  // Fetch snapshots covering baseline window and target period
  const rawTargetSnapshots = await getAllSnapshotsInDateRange(baselineStartDate, endDate);

  // Filter to only SUCCESS snapshots with valid numeric solve counts
  const targetSnapshots = rawTargetSnapshots.filter(
    (s) => s.status === 'SUCCESS' && s.totalSolved !== null && s.totalSolved !== undefined && !isNaN(Number(s.totalSolved))
  );

  // Group snapshots by studentId -> platform -> array
  const snapshotMap = new Map();
  targetSnapshots.forEach((s) => {
    if (!snapshotMap.has(s.studentId)) {
      snapshotMap.set(s.studentId, new Map());
    }
    const platMap = snapshotMap.get(s.studentId);
    if (!platMap.has(s.platform)) {
      platMap.set(s.platform, []);
    }
    platMap.get(s.platform).push(s);
  });

  const solverRows = [];

  for (const student of allStudents) {
    if (student.accountStatus === 'DISABLED') continue;

    // Filter by branch
    if (!matchesDepartment(student.department, branchFilter)) continue;

    // Filter by year
    if (yearFilter !== 'ALL' && String(student.year) !== yearFilter) continue;

    // Filter by search
    if (searchQuery) {
      const matchName = (student.name || '').toLowerCase().includes(searchQuery);
      const matchRoll = (student.rollNumber || '').toLowerCase().includes(searchQuery);
      if (!matchName && !matchRoll) continue;
    }

    const studentPlatSnaps = snapshotMap.get(student.id);

    let periodVerifiedSolves = 0;
    let easySolved = 0;
    let mediumSolved = 0;
    let hardSolved = 0;
    let schoolSolved = 0;
    let basicSolved = 0;
    let studentHasAnyVerifiedHistory = false;

    const platformBreakdown = {
      leetcode: 0,
      gfg: 0,
      hackerrank: 0,
      codeforces: 0,
      codechef: 0,
    };

    if (studentPlatSnaps) {
      PLATFORMS.forEach((p) => {
        if (platformFilter !== 'ALL' && platformFilter !== p) return;

        const pList = studentPlatSnaps.get(p) || [];
        if (pList && pList.length > 0) {
          pList.sort((a, b) => new Date(a.snapshotTimestamp) - new Date(b.snapshotTimestamp));

          const inPeriodSnaps = pList.filter((s) => {
            const ts = new Date(s.snapshotTimestamp).getTime();
            return ts >= startUtcMs && ts <= endUtcMs;
          });
          const priorSnaps = pList.filter((s) => {
            const ts = new Date(s.snapshotTimestamp).getTime();
            return ts < startUtcMs;
          });

          // Check LeetCode dated recent submissions if available
          let datedSolvesCount = 0;
          if (p === 'leetcode') {
            const liveStats = student.platformStats?.leetcode || {};
            const recentSubs = liveStats.recentSubmissions || (inPeriodSnaps.length > 0 ? inPeriodSnaps[inPeriodSnaps.length - 1]?.rawStats?.recentSubmissions : null) || [];
            if (Array.isArray(recentSubs) && recentSubs.length > 0) {
              const inPeriodSubs = recentSubs.filter((sub) => {
                const subTs = Number(sub.timestamp);
                return subTs >= startUtcSec && subTs <= endUtcSec;
              });
              const distinctSlugs = new Set(inPeriodSubs.map((s) => s.titleSlug || s.title));
              datedSolvesCount = distinctSlugs.size;
            }
          }

          let anchor = null;
          let latest = null;

          if (priorSnaps.length > 0) {
            const candidateAnchor = priorSnaps[priorSnaps.length - 1];
            const candidateMs = new Date(candidateAnchor.snapshotTimestamp).getTime();
            const diffHours = (startUtcMs - candidateMs) / (1000 * 60 * 60);

            // For single-day periods (Today), baseline must be within 14 hours of start
            if (periodType === 'today' || periodType === 'single-date') {
              if (diffHours <= 14) {
                anchor = candidateAnchor;
              } else if (inPeriodSnaps.length >= 2) {
                anchor = inPeriodSnaps[0];
              }
            } else {
              // Multi-day: allow baseline within 36 hours of start, or earliest in-period
              if (diffHours <= 36) {
                anchor = candidateAnchor;
              } else if (inPeriodSnaps.length >= 2) {
                anchor = inPeriodSnaps[0];
              } else {
                anchor = inPeriodSnaps.length > 0 ? inPeriodSnaps[0] : null;
              }
            }
          } else if (inPeriodSnaps.length >= 2) {
            anchor = inPeriodSnaps[0];
          }

          if (inPeriodSnaps.length > 0) {
            latest = inPeriodSnaps[inPeriodSnaps.length - 1];
          }

          let snapDelta = 0;
          if (anchor && latest && (anchor.snapshotTimestamp !== latest.snapshotTimestamp || anchor.id !== latest.id)) {
            snapDelta = Math.max(0, (latest.totalSolved || 0) - (anchor.totalSolved || 0));
          }

          // Compute final platform solves
          let finalPlatSolves = snapDelta;
          if (p === 'leetcode' && datedSolvesCount > 0) {
            finalPlatSolves = Math.max(datedSolvesCount, snapDelta);
          }

          platformBreakdown[p] = finalPlatSolves;

          if (inPeriodSnaps.length > 0 || priorSnaps.length > 0) {
            studentHasAnyVerifiedHistory = true;
          }

          // Difficulty breakdown calculation
          if (finalPlatSolves > 0 && anchor && latest) {
            const anchorHasDifficulties = (anchor.easySolved || 0) + (anchor.mediumSolved || 0) + (anchor.hardSolved || 0) > 0 || anchor.totalSolved === 0;
            if (anchorHasDifficulties && (p === 'leetcode' || p === 'gfg' || p === 'codeforces')) {
              easySolved += Math.max(0, (latest.easySolved || 0) - (anchor.easySolved || 0));
              mediumSolved += Math.max(0, (latest.mediumSolved || 0) - (anchor.mediumSolved || 0));
              hardSolved += Math.max(0, (latest.hardSolved || 0) - (anchor.hardSolved || 0));
            }

            if (p === 'gfg') {
              const anchorHasGfgDiffs = (anchor.schoolSolved || 0) + (anchor.basicSolved || 0) > 0 || anchor.totalSolved === 0;
              if (anchorHasGfgDiffs) {
                schoolSolved += Math.max(0, (latest.schoolSolved || 0) - (anchor.schoolSolved || 0));
                basicSolved += Math.max(0, (latest.basicSolved || 0) - (anchor.basicSolved || 0));
              }
            }
          }
        }
      });
    }

    // Determine periodVerifiedSolves based on platform filter
    if (platformFilter === 'ALL') {
      periodVerifiedSolves = platformBreakdown.leetcode + platformBreakdown.gfg + platformBreakdown.hackerrank;
    } else if (['leetcode', 'gfg', 'hackerrank', 'codeforces', 'codechef'].includes(platformFilter)) {
      periodVerifiedSolves = platformBreakdown[platformFilter] || 0;
    }

    // Difficulty breakdown safety: if 0 verified solves in period, difficulties must be 0
    if (periodVerifiedSolves === 0) {
      easySolved = 0;
      mediumSolved = 0;
      hardSolved = 0;
      schoolSolved = 0;
      basicSolved = 0;
    }

    // Meaningful activity status based on verified solves and connection health
    let activityStatus = 'No New Activity';
    const platformsObj = student.platforms || {};
    const connectedCount = Object.values(platformsObj).filter((p) => p && p.username).length;
    const anySyncFailed = Object.values(platformsObj).some((p) => p && p.status === 'FAILED');

    if (connectedCount === 0) {
      activityStatus = 'Not Connected';
    } else if (anySyncFailed && periodVerifiedSolves === 0) {
      activityStatus = 'Sync Failed';
    } else if (periodVerifiedSolves >= 25) {
      activityStatus = 'Surge Activity';
    } else if (periodVerifiedSolves >= 10) {
      activityStatus = 'High Activity';
    } else if (periodVerifiedSolves >= 1) {
      activityStatus = periodType === 'today' || periodType === 'single-date' ? 'Active Today' : 'Active in Period';
    } else if (!studentHasAnyVerifiedHistory) {
      activityStatus = 'Data Unavailable';
    } else {
      activityStatus = 'No New Activity';
    }

    solverRows.push({
      studentId: student.id,
      name: student.name,
      rollNumber: student.rollNumber || '—',
      department: student.department || 'General',
      year: student.year || 4,
      profilePhoto: student.profilePhoto || '',
      finalScore: student.finalScore || 0,
      globalRank: student.rank || null,
      lastDataUpdatedAt: student.lastDataUpdatedAt,
      todayVerifiedSolves: periodVerifiedSolves, // backward compat name
      periodVerifiedSolves,
      hasVerifiedHistory: studentHasAnyVerifiedHistory,
      leetcodeSolves: platformBreakdown.leetcode,
      gfgSolves: platformBreakdown.gfg,
      hackerrankSolves: platformBreakdown.hackerrank,
      codeforcesSolves: platformBreakdown.codeforces, // Stats only
      codechefSolves: platformBreakdown.codechef,     // Stats only
      difficultyBreakdown: {
        easy: easySolved,
        medium: mediumSolved,
        hard: hardSolved,
        school: schoolSolved,
        basic: basicSolved,
      },
      activityStatus,
      platformsConnected: connectedCount,
    });
  }

  // MANDATORY REQUIREMENT: Sort strictly in descending order by periodVerifiedSolves
  // Highest problem solvers first for EVERY period!
  solverRows.sort((a, b) => {
    // 1. Period verified solves descending
    if (b.periodVerifiedSolves !== a.periodVerifiedSolves) {
      return b.periodVerifiedSolves - a.periodVerifiedSolves;
    }
    // 2. Verified history before unverified
    if (b.hasVerifiedHistory !== a.hasVerifiedHistory) {
      return b.hasVerifiedHistory ? 1 : -1;
    }
    // 3. College overall score descending
    if ((b.finalScore || 0) !== (a.finalScore || 0)) {
      return (b.finalScore || 0) - (a.finalScore || 0);
    }
    // 4. Deterministic tie-breaker: Name alphabetical
    const nameCmp = (a.name || '').localeCompare(b.name || '');
    if (nameCmp !== 0) return nameCmp;
    // 5. Deterministic tie-breaker: Roll Number
    return (a.rollNumber || '').localeCompare(b.rollNumber || '');
  });

  // Assign Period Activity Rank (#1 to highest solver)
  solverRows.forEach((row, idx) => {
    row.rank = idx + 1;
  });

  const totalMatching = solverRows.length;
  const paginatedRows = solverRows.slice(offset, offset + limit);
  const activeSolversCount = solverRows.filter((r) => r.periodVerifiedSolves > 0).length;
  const totalSolvesCount = solverRows.reduce((sum, r) => sum + r.periodVerifiedSolves, 0);

  return {
    period: periodType,
    periodLabel: label,
    startDate,
    endDate,
    date: periodType === 'today' || periodType === 'single-date' ? startDate : `${startDate} to ${endDate}`,
    timezone: 'Asia/Kolkata',
    totalStudentsEvaluated: allStudents.length,
    totalMatching,
    activeSolversToday: activeSolversCount,
    totalSolvesToday: totalSolvesCount,
    activeSolversInPeriod: activeSolversCount,
    totalSolvesInPeriod: totalSolvesCount,
    totalRegisteredStudents: allStudents.length,
    limit,
    offset,
    hasHistoricalData: targetSnapshots.length > 0,
    solvers: paginatedRows,
  };
}

/**
 * Returns aggregated daily/weekly/monthly trends across the entire cohort
 */
async function getOverallActivityTrends(options = {}) {
  const days = options.days || 30;
  const todayStr = getKolkataTodayString();
  const startDateStr = getKolkataNDaysAgoString(days - 1);

  const snapshots = await getAllSnapshotsInDateRange(startDateStr, todayStr);
  const daysList = getDateRangeDays(startDateStr, todayStr);

  const dailyTrendMap = new Map();
  daysList.forEach((d) => {
    dailyTrendMap.set(d, {
      date: d,
      totalSolves: 0,
      leetcode: 0,
      gfg: 0,
      hackerrank: 0,
      codeforces: 0,
      codechef: 0,
      activeStudents: new Set(),
    });
  });

  // Group by student and platform
  const studentMap = new Map();
  snapshots.forEach((s) => {
    const key = `${s.studentId}_${s.platform}`;
    if (!studentMap.has(key)) studentMap.set(key, []);
    studentMap.get(key).push(s);
  });

  studentMap.forEach((snaps, key) => {
    const platform = snaps[0].platform;
    snaps.sort((a, b) => new Date(a.snapshotTimestamp) - new Date(b.snapshotTimestamp));

    for (let i = 1; i < snaps.length; i++) {
      const delta = Math.max(0, (snaps[i].totalSolved || 0) - (snaps[i - 1].totalSolved || 0));
      if (delta > 0) {
        const dStr = snaps[i].activityDate || getKolkataDateString(snaps[i].snapshotTimestamp);
        if (dailyTrendMap.has(dStr)) {
          const entry = dailyTrendMap.get(dStr);
          entry.totalSolves += delta;
          if (entry[platform] !== undefined) entry[platform] += delta;
          entry.activeStudents.add(snaps[i].studentId);
        }
      }
    }
  });

  const dailyTrends = Array.from(dailyTrendMap.values()).map((e) => ({
    date: e.date,
    totalSolves: e.totalSolves,
    leetcode: e.leetcode,
    gfg: e.gfg,
    hackerrank: e.hackerrank,
    codeforces: e.codeforces,
    codechef: e.codechef,
    activeStudentsCount: e.activeStudents.size,
  }));

  const totalPeriodSolves = dailyTrends.reduce((acc, d) => acc + d.totalSolves, 0);

  return {
    periodDays: days,
    startDate: startDateStr,
    endDate: todayStr,
    timezone: 'Asia/Kolkata',
    totalPeriodSolves,
    hasHistoricalData: snapshots.length > 0,
    dailyTrends,
  };
}

module.exports = {
  recordPlatformSnapshot,
  getStudentActivityPeriod,
  getTodayTopSolvers,
  getOverallActivityTrends,
};
