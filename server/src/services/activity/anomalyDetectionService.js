/**
 * Evidence-Based Anomaly Detection Service for Student Coding Activity
 * 
 * Analyzes historical snapshots to identify unusual activity patterns that
 * exceed reasonable data-supported expectations.
 * 
 * Ethical & Evidence Principles:
 * 1. Uses NEUTRAL labels: "Unusual Activity", "Needs Review", "Reviewed".
 * 2. NEVER accuses students of cheating or asserts misconduct from statistics alone.
 * 3. Never modifies scores, penalizes, or disables accounts automatically.
 * 4. Transparently displays observed values, comparison baselines, and triggered rules.
 * 5. Returns "Insufficient history for reliable comparison" when historical data is lacking.
 * 6. Audit-logs all administrative review actions.
 */

const {
  upsertActivityAnomaly,
  getActivityAnomalies,
  updateAnomalyReview,
  getActivitySnapshots,
  getAllSnapshotsInDateRange,
  getAllStudents,
  getStudentById,
  hasHistoricalData,
} = require('../../supabase/supabaseRepository');

const { logAudit, AUDIT_ACTIONS, createAdminNotification } = require('../../utils/auditLogger');
const { getKolkataTodayString, getKolkataNDaysAgoString, getKolkataDateString } = require('../../utils/timezoneUtils');

// Configurable thresholds for anomaly detection rules
const CONFIG = {
  MIN_DAYS_FOR_RELIABLE_BASELINE: 3,     // Need at least 3 snapshot observations to establish a baseline
  SUDDEN_SPIKE_MULTIPLIER: 3.5,           // 3.5x baseline average
  SUDDEN_SPIKE_MIN_ABSOLUTE_DIFF: 15,     // At least +15 solves increase
  MULTI_PLATFORM_SURGE_THRESHOLD: 12,     // At least 12 solves each on 2+ scored platforms
  INACTIVITY_BURST_THRESHOLD: 20,         // At least 20 solves after 14 days of low/no activity
  EXTREME_DAILY_VOLUME_THRESHOLD: 40,     // 40+ solves in a single day
  INTERVAL_DATA_JUMP_THRESHOLD: 30,       // 30+ solves across a multi-day snapshot gap
};

/**
 * Evaluates activity for a specific student on a given date to identify anomalies
 * 
 * @param {string} studentId 
 * @param {string} targetDate - 'YYYY-MM-DD' in Asia/Kolkata
 * @returns {Promise<Array<Object>>} List of detected anomalies
 */
async function evaluateStudentAnomalies(studentId, targetDate = getKolkataTodayString()) {
  const student = await getStudentById(studentId);
  if (!student) return [];

  // 1. Fetch snapshots for the target day and the prior 14 days
  const baselineStartDate = getKolkataNDaysAgoString(14);
  const snapshots = await getActivitySnapshots({
    studentId,
    startDate: baselineStartDate,
    endDate: targetDate,
    limit: 500,
  });

  if (snapshots.length < 2) {
    // Insufficient historical data
    return [];
  }

  const platforms = ['leetcode', 'gfg', 'hackerrank', 'codeforces', 'codechef'];
  const detectedAnomalies = [];

  // Group snapshots by platform
  const byPlatform = {};
  platforms.forEach((p) => {
    byPlatform[p] = snapshots.filter((s) => s.platform === p);
  });

  let multiPlatformHighCount = 0;
  const platformDeltas = {};

  for (const plat of platforms) {
    const pSnaps = byPlatform[plat];
    if (pSnaps.length < 2) continue;

    pSnaps.sort((a, b) => new Date(a.snapshotTimestamp) - new Date(b.snapshotTimestamp));

    // Target day snapshots vs baseline snapshots (prior 14 days up to yesterday)
    const targetDaySnaps = pSnaps.filter((s) => s.activityDate === targetDate);
    const priorSnaps = pSnaps.filter((s) => s.activityDate < targetDate);

    if (targetDaySnaps.length === 0) continue;

    const latestToday = targetDaySnaps[targetDaySnaps.length - 1];
    const latestPrior = priorSnaps.length > 0 ? priorSnaps[priorSnaps.length - 1] : targetDaySnaps[0];

    const observedCount = Math.max(0, (latestToday.totalSolved || 0) - (latestPrior.totalSolved || 0));
    platformDeltas[plat] = observedCount;

    if (['leetcode', 'gfg', 'hackerrank'].includes(plat) && observedCount >= CONFIG.MULTI_PLATFORM_SURGE_THRESHOLD) {
      multiPlatformHighCount++;
    }

    // Calculate baseline daily average from prior snapshots
    let baselineDailyAverage = 0;
    if (priorSnaps.length >= CONFIG.MIN_DAYS_FOR_RELIABLE_BASELINE) {
      const earliestPrior = priorSnaps[0];
      const baselineTotal = Math.max(0, (latestPrior.totalSolved || 0) - (earliestPrior.totalSolved || 0));
      baselineDailyAverage = Number((baselineTotal / 14).toFixed(2));
    }

    const diffDifficulty = {
      easy: Math.max(0, (latestToday.easySolved || 0) - (latestPrior.easySolved || 0)),
      medium: Math.max(0, (latestToday.mediumSolved || 0) - (latestPrior.mediumSolved || 0)),
      hard: Math.max(0, (latestToday.hardSolved || 0) - (latestPrior.hardSolved || 0)),
    };
    if (plat === 'gfg') {
      diffDifficulty.school = Math.max(0, (latestToday.schoolSolved || 0) - (latestPrior.schoolSolved || 0));
      diffDifficulty.basic = Math.max(0, (latestToday.basicSolved || 0) - (latestPrior.basicSolved || 0));
    }

    // Check Rule: EXTREME_DAILY_VOLUME
    if (observedCount >= CONFIG.EXTREME_DAILY_VOLUME_THRESHOLD) {
      detectedAnomalies.push({
        anomalyKey: `${studentId}_${plat}_${targetDate}_extreme_volume`,
        studentId,
        platform: plat,
        activityDate: targetDate,
        observedCount,
        baselineCount: baselineDailyAverage,
        absoluteIncrease: observedCount - baselineDailyAverage,
        relativeIncreasePct: baselineDailyAverage > 0 ? Number(((observedCount / baselineDailyAverage) * 100).toFixed(1)) : null,
        ruleTriggered: 'EXTREME_DAILY_VOLUME',
        detectionReason: `Observed ${observedCount} solves on ${plat.toUpperCase()} on ${targetDate}, exceeding the standard review threshold of ${CONFIG.EXTREME_DAILY_VOLUME_THRESHOLD} solves in 24 hours.`,
        severity: observedCount >= 70 ? 'CRITICAL' : 'HIGH',
        difficultyBreakdown: diffDifficulty,
        dataConfidence: 'HIGH',
        metadata: { studentName: student.name, rollNumber: student.rollNumber },
      });
    }

    // Check Rule: SUDDEN_SPIKE_VS_BASELINE
    if (
      priorSnaps.length >= CONFIG.MIN_DAYS_FOR_RELIABLE_BASELINE &&
      observedCount >= CONFIG.SUDDEN_SPIKE_MIN_ABSOLUTE_DIFF &&
      observedCount >= Math.max(5, baselineDailyAverage * CONFIG.SUDDEN_SPIKE_MULTIPLIER)
    ) {
      const relIncrease = baselineDailyAverage > 0 ? Number((((observedCount - baselineDailyAverage) / baselineDailyAverage) * 100).toFixed(1)) : null;
      detectedAnomalies.push({
        anomalyKey: `${studentId}_${plat}_${targetDate}_sudden_spike`,
        studentId,
        platform: plat,
        activityDate: targetDate,
        observedCount,
        baselineCount: baselineDailyAverage,
        absoluteIncrease: Math.round(observedCount - baselineDailyAverage),
        relativeIncreasePct: relIncrease,
        ruleTriggered: 'SUDDEN_SPIKE_VS_BASELINE',
        detectionReason: `Observed ${observedCount} solves on ${plat.toUpperCase()} compared to a 14-day baseline average of ${baselineDailyAverage} solves/day (${relIncrease ? `+${relIncrease}%` : 'first surge'}).`,
        severity: 'MEDIUM',
        difficultyBreakdown: diffDifficulty,
        dataConfidence: 'HIGH',
        metadata: { studentName: student.name, rollNumber: student.rollNumber },
      });
    }

    // Check Rule: INACTIVITY_WAKE_BURST
    if (priorSnaps.length >= 3 && baselineDailyAverage <= 0.5 && observedCount >= CONFIG.INACTIVITY_BURST_THRESHOLD) {
      detectedAnomalies.push({
        anomalyKey: `${studentId}_${plat}_${targetDate}_inactivity_burst`,
        studentId,
        platform: plat,
        activityDate: targetDate,
        observedCount,
        baselineCount: baselineDailyAverage,
        absoluteIncrease: observedCount,
        relativeIncreasePct: null,
        ruleTriggered: 'INACTIVITY_WAKE_BURST',
        detectionReason: `Observed sharp increase of ${observedCount} solves on ${plat.toUpperCase()} following a prolonged period (14+ days) of near-zero recorded activity.`,
        severity: 'MEDIUM',
        difficultyBreakdown: diffDifficulty,
        dataConfidence: 'HIGH',
        metadata: { studentName: student.name, rollNumber: student.rollNumber },
      });
    }
  }

  // Check Rule: MULTI_PLATFORM_SURGE (Across multiple scored platforms on same day)
  if (multiPlatformHighCount >= 2) {
    const totalMultiSolves = (platformDeltas.leetcode || 0) + (platformDeltas.gfg || 0) + (platformDeltas.hackerrank || 0);
    detectedAnomalies.push({
      anomalyKey: `${studentId}_all_${targetDate}_multi_platform_surge`,
      studentId,
      platform: 'all',
      activityDate: targetDate,
      observedCount: totalMultiSolves,
      baselineCount: 0,
      absoluteIncrease: totalMultiSolves,
      relativeIncreasePct: null,
      ruleTriggered: 'MULTI_PLATFORM_SURGE',
      detectionReason: `Observed concurrent large activity increases across multiple scored platforms on ${targetDate} (LeetCode: ${platformDeltas.leetcode || 0}, GFG: ${platformDeltas.gfg || 0}, HackerRank: ${platformDeltas.hackerrank || 0}).`,
      severity: 'HIGH',
      difficultyBreakdown: {},
      dataConfidence: 'HIGH',
      metadata: { studentName: student.name, rollNumber: student.rollNumber, breakdown: platformDeltas },
    });
  }

  // Upsert all detected anomalies (avoiding duplicate alerts)
  for (const anomaly of detectedAnomalies) {
    await upsertActivityAnomaly(anomaly);
  }

  return detectedAnomalies;
}

/**
 * Scans all students for anomalies on a given date or recent window
 */
async function scanCohortAnomalies(options = {}) {
  const targetDate = options.date || getKolkataTodayString();
  const students = await getAllStudents();
  let flaggedCount = 0;

  for (const student of students) {
    if (student.accountStatus === 'DISABLED') continue;
    try {
      const anomalies = await evaluateStudentAnomalies(student.id, targetDate);
      if (anomalies.length > 0) flaggedCount++;
    } catch (e) {
      console.warn(`[Anomaly Scan Warning] student ${student.id}:`, e.message);
    }
  }

  return {
    scannedDate: targetDate,
    totalStudents: students.length,
    flaggedStudentsCount: flaggedCount,
  };
}

/**
 * Fetches anomalies with student details enriched for Admin UI
 */
async function getAnomaliesList(options = {}) {
  const result = await getActivityAnomalies(options);
  const students = await getAllStudents();
  const studentMap = new Map(students.map((s) => [s.id, s]));

  const enrichedAnomalies = result.anomalies.map((a) => {
    const s = studentMap.get(a.studentId) || {};
    return {
      ...a,
      studentName: s.name || a.metadata?.studentName || 'Student',
      rollNumber: s.rollNumber || a.metadata?.rollNumber || '—',
      department: s.department || 'General',
      year: s.year || 4,
      finalScore: s.finalScore || 0,
      profilePhoto: s.profilePhoto || '',
    };
  });

  const hasHistory = await hasHistoricalData();

  return {
    anomalies: enrichedAnomalies,
    total: result.total,
    page: result.page,
    limit: result.limit,
    hasHistoricalData: hasHistory,
    message: !hasHistory ? 'Insufficient history for reliable comparison' : null,
  };
}

/**
 * Admin action: reviews an anomaly (REVIEWED, DISMISSED, NEEDS_FURTHER_INVESTIGATION)
 * Enforces audit logging.
 */
async function reviewAnomaly({ anomalyId, reviewStatus, admin, reason = '', req = null }) {
  if (!['REVIEWED', 'DISMISSED', 'NEEDS_FURTHER_INVESTIGATION'].includes(reviewStatus)) {
    throw new Error(`Invalid review status: ${reviewStatus}`);
  }

  const adminName = admin?.name || admin?.email?.split('@')[0] || 'Administrator';
  const updated = await updateAnomalyReview({
    id: anomalyId,
    reviewStatus,
    reviewedBy: adminName,
    reviewNotes: reason,
  });

  if (!updated) {
    throw new Error(`Anomaly record not found: ${anomalyId}`);
  }

  // Audit Log Entry
  await logAudit({
    admin,
    action: 'ANOMALY_REVIEWED',
    target: `Activity Anomaly (${anomalyId})`,
    targetId: String(anomalyId),
    details: {
      reviewStatus,
      reason,
      anomalyKey: updated.anomalyKey,
      studentId: updated.studentId,
      platform: updated.platform,
      ruleTriggered: updated.ruleTriggered,
      observedCount: updated.observedCount,
    },
    req,
  });

  return updated;
}

module.exports = {
  evaluateStudentAnomalies,
  scanCohortAnomalies,
  getAnomaliesList,
  reviewAnomaly,
  CONFIG,
};
