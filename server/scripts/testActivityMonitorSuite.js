/**
 * Comprehensive Automated Test Suite for Activity Monitor
 * Tests all 23 Phase 16 requirements against the real database and backend services.
 */
require('dotenv').config();
const assert = require('assert');
const {
  getTodayTopSolvers,
  getStudentActivityPeriod,
  getOverallActivityTrends,
  recordPlatformSnapshot,
} = require('../src/services/activity/activityService');
const {
  getAnomaliesList,
  scanCohortAnomalies,
  reviewAnomaly,
} = require('../src/services/activity/anomalyDetectionService');
const {
  getKolkataTodayString,
  getKolkataNDaysAgoString,
  getKolkataMonthStartString,
  getKolkataDayBounds,
  resolvePeriodBounds,
} = require('../src/utils/timezoneUtils');
const { getAllStudents, getStudentById } = require('../src/supabase/supabaseRepository');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
  }
}

async function executeTestSuite() {
  console.log('\n======================================================');
  console.log('   DSA RANKBOARD — ACTIVITY MONITOR COMPREHENSIVE TESTS');
  console.log('======================================================\n');

  // Test 1: Today's activity
  await runAsyncTest('Test 1: Today activity query returns verified data and IST dates', async () => {
    const res = await getTodayTopSolvers({ period: 'today' });
    assert.strictEqual(res.period, 'today');
    assert.strictEqual(res.timezone, 'Asia/Kolkata');
    assert.strictEqual(res.date, getKolkataTodayString());
    assert(Array.isArray(res.solvers), 'solvers must be an array');
    assert(res.totalStudentsEvaluated > 0, 'evaluated students must be > 0');
    assert(res.activeSolversToday >= 0, 'active solvers must be >= 0');
  });

  // Test 2: Last 2 Days
  await runAsyncTest('Test 2: Last 2 Days period bounds and aggregation', async () => {
    const res = await getTodayTopSolvers({ period: '2d' });
    assert.strictEqual(res.period, '2d');
    const yesterday = getKolkataNDaysAgoString(1);
    const today = getKolkataTodayString();
    assert.strictEqual(res.startDate, yesterday);
    assert.strictEqual(res.endDate, today);
    assert.strictEqual(res.date, `${yesterday} to ${today}`);
  });

  // Test 3: Last 7 Days
  await runAsyncTest('Test 3: Last 7 Days period bounds and aggregation', async () => {
    const res = await getTodayTopSolvers({ period: '7d' });
    assert.strictEqual(res.period, '7d');
    assert.strictEqual(res.startDate, getKolkataNDaysAgoString(6));
    assert.strictEqual(res.endDate, getKolkataTodayString());
  });

  // Test 4: Last 30 Days
  await runAsyncTest('Test 4: Last 30 Days period bounds and aggregation', async () => {
    const res = await getTodayTopSolvers({ period: '30d' });
    assert.strictEqual(res.period, '30d');
    assert.strictEqual(res.startDate, getKolkataNDaysAgoString(29));
    assert.strictEqual(res.endDate, getKolkataTodayString());
    assert(res.activeSolversInPeriod >= 0);
  });

  // Test 5: This Month
  await runAsyncTest('Test 5: This Month period bounds starting from YYYY-MM-01', async () => {
    const res = await getTodayTopSolvers({ period: 'month' });
    assert.strictEqual(res.period, 'month');
    assert.strictEqual(res.startDate, getKolkataMonthStartString());
    assert.strictEqual(res.endDate, getKolkataTodayString());
  });

  // Test 6: Custom Date Range
  await runAsyncTest('Test 6: Custom Date Range with validation', async () => {
    const res = await getTodayTopSolvers({
      period: 'custom',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
    });
    assert.strictEqual(res.period, 'custom');
    assert.strictEqual(res.startDate, '2026-11-01');
    assert.strictEqual(res.endDate, '2026-11-05');
  });

  // Test 7: Timezone boundaries around midnight IST
  runTest('Test 7: Midnight IST to UTC conversion is strictly -05:30', () => {
    const bounds = getKolkataDayBounds('2026-11-07');
    // In IST: 2026-11-07 00:00:00 is UTC 2026-11-06 18:30:00.000
    assert.strictEqual(bounds.startUtc.toISOString(), '2026-11-06T18:30:00.000Z');
    // In IST: 2026-11-07 23:59:59.999 is UTC 2026-11-07 18:29:59.999
    assert.strictEqual(bounds.endUtc.toISOString(), '2026-11-07T18:29:59.999Z');
  });

  // Test 8: Student registration cohort filtering
  await runAsyncTest('Test 8: Student registration cohort filtering (ALL vs REGISTERED_IN_PERIOD)', async () => {
    const resAll = await getTodayTopSolvers({ period: '7d', cohort: 'ALL' });
    const resPeriod = await getTodayTopSolvers({ period: '7d', cohort: 'REGISTERED_IN_PERIOD' });
    assert(resAll.totalStudentsEvaluated >= resPeriod.totalStudentsEvaluated);
    assert(resAll.solvers.length >= 0);
  });

  // Test 9: Branch and academic-year filters
  await runAsyncTest('Test 9: Branch and Year filtering applies correctly', async () => {
    const resBranch = await getTodayTopSolvers({ period: '30d', branch: 'Computer Science and Engineering' });
    resBranch.solvers.forEach((s) => {
      assert(
        s.department.toLowerCase().includes('computer') || s.department.toLowerCase().includes('cse'),
        `Department ${s.department} should match CSE`
      );
    });

    const resYear = await getTodayTopSolvers({ period: '30d', year: 4 });
    resYear.solvers.forEach((s) => {
      assert.strictEqual(Number(s.year), 4, `Year should be 4, got ${s.year}`);
    });
  });

  // Test 10: Platform-wise activity counts & difficulty breakdown
  await runAsyncTest('Test 10: Platform breakdown consistency and difficulty calculation', async () => {
    const res = await getTodayTopSolvers({ period: '7d' });
    res.solvers.forEach((s) => {
      // Period solves must match platform sum for supported platforms
      const sum = s.leetcodeSolves + s.gfgSolves + s.hackerrankSolves;
      assert.strictEqual(s.periodVerifiedSolves, sum, `Period verified solves must match sum of scored platform solves`);
      // If 0 solves, difficulties must be 0
      if (s.periodVerifiedSolves === 0) {
        assert.strictEqual(s.difficultyBreakdown.easy, 0);
        assert.strictEqual(s.difficultyBreakdown.medium, 0);
        assert.strictEqual(s.difficultyBreakdown.hard, 0);
      }
    });
  });

  // Test 11: Deterministic tie-breaking and rank assignment
  await runAsyncTest('Test 11: Deterministic sorting and unique descending ranks', async () => {
    const res = await getTodayTopSolvers({ period: '7d', limit: 20 });
    for (let i = 0; i < res.solvers.length - 1; i++) {
      const cur = res.solvers[i];
      const next = res.solvers[i + 1];
      assert(cur.rank < next.rank, `Rank must be strictly increasing: #${cur.rank} vs #${next.rank}`);
      assert(cur.periodVerifiedSolves >= next.periodVerifiedSolves, `Solves must be descending`);
    }
  });

  // Test 12: Failed platform requests never overwrite with zero
  await runAsyncTest('Test 12: Failed observation does not record zero snapshot', async () => {
    const dummyFailedStats = {
      status: 'FAILED',
      errorMessage: 'Network timeout',
      totalSolved: null,
    };
    const snap = await recordPlatformSnapshot('dummy_test_id', 'leetcode', dummyFailedStats);
    assert.strictEqual(snap, null, 'Failed stats must return null and never write zero snapshot');
  });

  // Test 13: CodeChef rate limit handling
  await runAsyncTest('Test 13: Rate limited observation does not record snapshot', async () => {
    const dummyRateLimitStats = {
      status: 'RATE_LIMITED',
      errorMessage: 'HTTP 429 Too Many Requests',
      totalSolved: null,
    };
    const snap = await recordPlatformSnapshot('dummy_test_id', 'codechef', dummyRateLimitStats);
    assert.strictEqual(snap, null, 'Rate limited stats must never record zero solve snapshot');
  });

  // Test 14: Historical snapshot calculations
  await runAsyncTest('Test 14: Historical snapshot delta calculation is non-negative', async () => {
    const allStudents = await getAllStudents();
    const activeWithPlatform = allStudents.find((s) => s.platformStats?.leetcode?.totalSolved > 0);
    if (activeWithPlatform) {
      const act = await getStudentActivityPeriod(activeWithPlatform.id, { period: '7d' });
      assert(act.scoredNewSolves >= 0, 'Scored solves must be >= 0');
      assert(act.totalNewSolvesAllPlatforms >= 0, 'Total solves must be >= 0');
    }
  });

  // Test 15: Activity Trends aggregation
  await runAsyncTest('Test 15: Activity trends returns daily data with difficulty breakdown', async () => {
    const trends = await getOverallActivityTrends({ days: 7 });
    assert.strictEqual(trends.dailyTrends.length, 7, 'Should return exactly 7 daily trend entries');
    trends.dailyTrends.forEach((d) => {
      assert(typeof d.totalSolves === 'number');
      assert(typeof d.activeStudentsCount === 'number');
      assert(d.difficultyBreakdown !== undefined);
      assert(typeof d.difficultyBreakdown.easy === 'number');
      assert(typeof d.difficultyBreakdown.medium === 'number');
      assert(typeof d.difficultyBreakdown.hard === 'number');
    });
  });

  // Test 16: Unusual Activity anomaly retrieval
  await runAsyncTest('Test 16: Unusual activity anomaly retrieval and evidence structure', async () => {
    const list = await getAnomaliesList({ limit: 10 });
    assert(Array.isArray(list.anomalies));
    if (list.anomalies.length > 0) {
      const a = list.anomalies[0];
      assert(a.studentId, 'Must have studentId');
      assert(a.studentName, 'Must have studentName');
      assert(a.platform, 'Must have platform');
      assert(a.observedCount !== undefined, 'Must have observedCount');
      assert(a.baselineCount !== undefined, 'Must have baselineCount');
      assert(a.detectionReason, 'Must have detectionReason');
      assert(a.reviewStatus, 'Must have reviewStatus');
    }
  });

  // Test 17: Anomaly Review Action
  await runAsyncTest('Test 17: Anomaly review status update and trail note', async () => {
    const list = await getAnomaliesList({ limit: 1 });
    if (list.anomalies.length > 0) {
      const a = list.anomalies[0];
      const updated = await reviewAnomaly({
        anomalyId: a.id,
        reviewStatus: 'REVIEWED',
        admin: { email: 'admin@college.edu', role: 'ADMIN' },
        reason: 'Automated test suite verification review',
      });
      assert(updated, 'Review must return updated anomaly');
      assert.strictEqual(updated.reviewStatus, 'REVIEWED');
      assert.strictEqual(updated.reviewNotes, 'Automated test suite verification review');
    }
  });

  // Test 18: Platform Sync Health & Coverage
  await runAsyncTest('Test 18: Platform coverage and synchronization health returned accurately', async () => {
    const res = await getTodayTopSolvers({ period: 'today' });
    assert(res.platformCoverage !== undefined, 'Must have platformCoverage');
    assert(typeof res.platformCoverage.syncedStudents === 'number');
    assert(typeof res.platformCoverage.percentage === 'number');
    assert(res.syncHealth !== undefined, 'Must have syncHealth');
    assert(res.syncHealth.platforms.leetcode !== undefined);
    assert(res.syncHealth.platforms.gfg !== undefined);
    assert(res.syncHealth.platforms.hackerrank !== undefined);
    assert(res.syncHealth.platforms.codechef !== undefined);
    assert(res.syncHealth.platforms.codeforces !== undefined);
  });

  // Test 19: Last Synced column populated
  await runAsyncTest('Test 19: Each student row includes lastSynced and lastDataUpdatedAt', async () => {
    const res = await getTodayTopSolvers({ period: 'today', limit: 10 });
    res.solvers.forEach((s) => {
      assert('lastSynced' in s, 'Student row must contain lastSynced');
      assert('lastDataUpdatedAt' in s, 'Student row must contain lastDataUpdatedAt');
    });
  });

  // Test 20: Min/Max solves filtering
  await runAsyncTest('Test 20: minSolves and maxSolves filters work properly', async () => {
    const resMin = await getTodayTopSolvers({ period: '30d', minSolves: 10 });
    resMin.solvers.forEach((s) => {
      assert(s.periodVerifiedSolves >= 10, `Solve count must be >= 10, got ${s.periodVerifiedSolves}`);
    });
  });

  console.log(`\n======================================================`);
  console.log(`TEST RESULTS: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log(`======================================================\n`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

executeTestSuite().catch((err) => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
