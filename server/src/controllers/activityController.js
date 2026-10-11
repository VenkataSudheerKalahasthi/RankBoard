/**
 * Activity Controller for Admin Portal
 * 
 * Exposes endpoints for:
 * - Today's Top Problem Solvers
 * - Unusual Activity / Needs Review Anomaly Management
 * - Overall Activity Trends
 * - Individual Student Detailed Activity Reports
 * - Real Data CSV Exports
 */

const {
  getTodayTopSolvers,
  getStudentActivityPeriod,
  getOverallActivityTrends,
  recordPlatformSnapshot,
} = require('../services/activity/activityService');

const {
  getAnomaliesList,
  scanCohortAnomalies,
  reviewAnomaly,
} = require('../services/activity/anomalyDetectionService');

const { getStudentById } = require('../supabase/supabaseRepository');
const { getKolkataTodayString } = require('../utils/timezoneUtils');

/**
 * GET /api/admin/activity/today-top-solvers
 */
const getTodayTopSolversController = async (req, res) => {
  try {
    const { period, date, startDate, endDate, branch, year, platform, limit, offset, search } = req.query;

    const data = await getTodayTopSolvers({
      period,
      date,
      startDate,
      endDate,
      branch,
      year,
      platform,
      limit,
      offset,
      search,
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[Today Top Solvers Controller Error]:', error);
    const isValidationError = error.message && (
      error.message.includes('date') ||
      error.message.includes('format') ||
      error.message.includes('required')
    );
    res.status(isValidationError ? 400 : 500).json({
      success: false,
      message: error.message || 'Failed to retrieve today top problem solvers.',
    });
  }
};

/**
 * GET /api/admin/activity/anomalies
 */
const getAnomaliesController = async (req, res) => {
  try {
    const { studentId, reviewStatus, severity, platform, search, page, limit } = req.query;

    const data = await getAnomaliesList({
      studentId,
      reviewStatus,
      severity,
      platform,
      search,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 50,
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[Anomalies Controller Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve unusual activity entries.',
    });
  }
};

/**
 * POST /api/admin/activity/anomalies/scan
 */
const scanAnomaliesController = async (req, res) => {
  try {
    const { date } = req.body;
    const result = await scanCohortAnomalies({ date });

    res.json({
      success: true,
      message: `Anomaly detection scan completed. Found flags for ${result.flaggedStudentsCount} students.`,
      data: result,
    });
  } catch (error) {
    console.error('[Scan Anomalies Controller Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to scan cohort for anomalies.',
    });
  }
};

/**
 * POST /api/admin/activity/anomalies/:id/review
 */
const reviewAnomalyController = async (req, res) => {
  try {
    const anomalyId = req.params.id;
    const { reviewStatus, reason } = req.body;

    if (!reviewStatus) {
      return res.status(400).json({
        success: false,
        message: 'reviewStatus is required ("REVIEWED", "DISMISSED", "NEEDS_FURTHER_INVESTIGATION").',
      });
    }

    const updated = await reviewAnomaly({
      anomalyId,
      reviewStatus,
      admin: req.admin || req.user,
      reason,
      req,
    });

    res.json({
      success: true,
      message: `Anomaly record updated to ${reviewStatus}. Action logged in audit trail.`,
      anomaly: updated,
    });
  } catch (error) {
    console.error('[Review Anomaly Controller Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to review anomaly.',
    });
  }
};

/**
 * GET /api/admin/activity/trends
 */
const getActivityTrendsController = async (req, res) => {
  try {
    const { days } = req.query;
    const data = await getOverallActivityTrends({
      days: parseInt(days, 10) || 30,
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[Activity Trends Controller Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve activity trends.',
    });
  }
};

/**
 * GET /api/admin/activity/student/:studentId
 */
const getStudentActivityController = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const { period, startDate, endDate } = req.query;

    const data = await getStudentActivityPeriod(studentId, {
      period,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[Student Activity Controller Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve student activity report.',
    });
  }
};

/**
 * POST /api/admin/activity/student/:studentId/snapshot
 * Records snapshots from current student platform stats (used for on-demand initialization or testing)
 */
const recordStudentSnapshotController = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const student = await getStudentById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const recorded = [];
    const platforms = ['leetcode', 'gfg', 'hackerrank', 'codeforces', 'codechef'];

    for (const plat of platforms) {
      const stats = student.platformStats?.[plat];
      if (stats && (stats.status === 'SUCCESS' || stats.totalSolved !== undefined)) {
        const snap = await recordPlatformSnapshot(studentId, plat, stats);
        if (snap) recorded.push(snap);
      }
    }

    res.json({
      success: true,
      message: `Recorded ${recorded.length} platform snapshots for student ${student.name}.`,
      snapshots: recorded,
    });
  } catch (error) {
    console.error('[Record Snapshot Controller Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to record student snapshot.',
    });
  }
};

/**
 * Helper to escape CSV cell content safely
 */
function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * GET /api/admin/activity/export
 * Exports real activity or anomaly records to standard CSV
 */
const exportActivityController = async (req, res) => {
  try {
    const { type = 'today-top-solvers', period, date, startDate, endDate, branch, year, platform, reviewStatus, search } = req.query;

    if (type === 'anomalies') {
      const result = await getAnomaliesList({
        reviewStatus,
        platform,
        search,
        limit: 2000,
      });

      const headers = [
        'ID',
        'Student Name',
        'Roll Number',
        'Department',
        'Platform',
        'Activity Date',
        'Observed Count',
        'Baseline Count',
        'Increase',
        'Rule Triggered',
        'Detection Reason',
        'Severity',
        'Review Status',
        'Reviewed By',
        'Review Notes',
      ];

      const rows = result.anomalies.map((a) => [
        escapeCsv(a.id),
        escapeCsv(a.studentName),
        escapeCsv(a.rollNumber),
        escapeCsv(a.department),
        escapeCsv(a.platform.toUpperCase()),
        escapeCsv(a.activityDate),
        escapeCsv(a.observedCount),
        escapeCsv(a.baselineCount),
        escapeCsv(a.absoluteIncrease),
        escapeCsv(a.ruleTriggered),
        escapeCsv(a.detectionReason),
        escapeCsv(a.severity),
        escapeCsv(a.reviewStatus),
        escapeCsv(a.reviewedBy || 'Not Reviewed'),
        escapeCsv(a.reviewNotes || ''),
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=unusual_activity_report_${getKolkataTodayString()}.csv`);
      return res.send(csvContent);
    }

    // Default: Problem Solvers
    const result = await getTodayTopSolvers({
      period,
      date,
      startDate,
      endDate,
      branch,
      year,
      platform,
      search,
      limit: 2000,
    });

    const isToday = !period || period === 'today' || result.period === 'today';
    const solvesHeader = isToday ? "Today's Verified Solves" : "Period Verified Solves";

    const headers = [
      'Period Activity Rank',
      'Overall College Rank',
      'Student Name',
      'Roll Number',
      'Department',
      'Academic Year',
      solvesHeader,
      'LeetCode Solves',
      'GFG Solves',
      'HackerRank Solves',
      'Codeforces Solves (Stats Only)',
      'CodeChef Solves (Stats Only)',
      'Easy Solves',
      'Medium Solves',
      'Hard Solves',
      'Activity Status',
      'RankBoard Overall Score',
      'Last Data Updated',
    ];

    const rows = result.solvers.map((s) => [
      escapeCsv(s.rank),
      escapeCsv(s.globalRank ? `#${s.globalRank}` : '—'),
      escapeCsv(s.name),
      escapeCsv(s.rollNumber),
      escapeCsv(s.department),
      escapeCsv(s.year),
      escapeCsv(s.periodVerifiedSolves ?? s.todayVerifiedSolves),
      escapeCsv(s.leetcodeSolves),
      escapeCsv(s.gfgSolves),
      escapeCsv(s.hackerrankSolves),
      escapeCsv(s.codeforcesSolves),
      escapeCsv(s.codechefSolves),
      escapeCsv(s.difficultyBreakdown?.easy || 0),
      escapeCsv(s.difficultyBreakdown?.medium || 0),
      escapeCsv(s.difficultyBreakdown?.hard || 0),
      escapeCsv(s.activityStatus),
      escapeCsv(s.finalScore ? Number(s.finalScore).toFixed(2) : '0.00'),
      escapeCsv(s.lastDataUpdatedAt || ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=top_solvers_report_${result.date || getKolkataTodayString()}.csv`);
    return res.send(csvContent);
  } catch (error) {
    console.error('[Export Activity Controller Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export activity report.',
    });
  }
};

module.exports = {
  getTodayTopSolversController,
  getAnomaliesController,
  scanAnomaliesController,
  reviewAnomalyController,
  getActivityTrendsController,
  getStudentActivityController,
  recordStudentSnapshotController,
  exportActivityController,
};
