/**
 * Comprehensive Verification Suite for Home Page Statistics & Realtime Metrics
 */

const { getSupabase } = require('../src/supabase/supabaseClient');
const { computeBaseLeaderboardData, getLeaderboardStats } = require('../src/controllers/leaderboardController');
const { getAllStudentsCached, invalidateStudentCache, getActiveStudentsCount } = require('../src/utils/studentCache');
const { PLATFORM_REGISTRY, getActivePlatformsCount } = require('../src/config/platformRegistry');

async function runTestSuite() {
  console.log('================================================================');
  console.log('   RANKBOARD HOME PAGE REAL-TIME METRICS VERIFICATION SUITE   ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Database Connectivity and Authoritative Students
    // ------------------------------------------------------------------------
    console.log('>>> Test 1: Verifying DB Connectivity & Authoritative Students...');
    const students = await getAllStudentsCached({ forceRefresh: true });
    assert(Array.isArray(students) && students.length > 0, `Retrieved ${students.length} students from Supabase`);

    const activeCount = await getActiveStudentsCount();
    const expectedActive = students.filter(s => s.accountStatus === 'ACTIVE').length;
    assert(activeCount === expectedActive, `Active students count matches expected (${activeCount} === ${expectedActive})`);

    // ------------------------------------------------------------------------
    // TEST 2: Authoritative Base Leaderboard Calculation
    // ------------------------------------------------------------------------
    console.log('\n>>> Test 2: Verifying Base Metrics Calculation (No Hardcoded Values)...');
    const baseData = await computeBaseLeaderboardData('COLLEGE_MAIN', { forceRefresh: true });
    const { stats, platforms, rankedLeaderboard } = baseData;

    assert(typeof stats.totalRegisteredStudents === 'number', `totalRegisteredStudents is number: ${stats.totalRegisteredStudents}`);
    assert(stats.totalRegisteredStudents === activeCount, `totalRegisteredStudents matches active count (${stats.totalRegisteredStudents} === ${activeCount})`);
    assert(stats.totalRegisteredStudents > 0, `No hardcoded 500+ fallback (actual count: ${stats.totalRegisteredStudents})`);

    assert(typeof stats.totalProblemsSolved === 'number', `totalProblemsSolved is number: ${stats.totalProblemsSolved}`);
    assert(stats.totalProblemsSolved > 0, `No hardcoded 3K+ fallback (actual count: ${stats.totalProblemsSolved})`);

    // Cross-check sum of problems solved manually across eligible students
    let manualSum = 0;
    students.filter(s => s.accountStatus === 'ACTIVE').forEach(s => {
      const lc = Math.max(0, Number(s.platformStats?.leetcode?.totalSolved) || 0);
      const gfg = Math.max(0, Number(s.platformStats?.gfg?.totalSolved) || 0);
      const cf = Math.max(0, Number(s.platformStats?.codeforces?.totalSolved) || 0);
      const cc = Math.max(0, Number(s.platformStats?.codechef?.totalSolved) || 0);
      const hr = Math.max(0, Number(s.platformStats?.hackerrank?.totalSolved) || 0);
      manualSum += (lc + gfg + cf + cc + hr);
    });
    assert(stats.totalProblemsSolved === manualSum, `totalProblemsSolved exactly matches sum across platforms (${stats.totalProblemsSolved} === ${manualSum})`);

    // ------------------------------------------------------------------------
    // TEST 3: Coding Platforms Metric
    // ------------------------------------------------------------------------
    console.log('\n>>> Test 3: Verifying Coding Platforms Configuration...');
    const configuredCount = getActivePlatformsCount();
    assert(stats.codingPlatforms === configuredCount, `stats.codingPlatforms equals active platform registry count (${stats.codingPlatforms} === ${configuredCount})`);
    assert(configuredCount === 5, `Configured platforms count is exactly 5`);
    const platformKeys = PLATFORM_REGISTRY.map(p => p.key);
    assert(
      platformKeys.includes('leetcode') &&
      platformKeys.includes('gfg') &&
      platformKeys.includes('hackerrank') &&
      platformKeys.includes('codeforces') &&
      platformKeys.includes('codechef'),
      'All 5 platforms registered: LeetCode, GFG, HackerRank, Codeforces, CodeChef'
    );

    // ------------------------------------------------------------------------
    // TEST 4: Dedicated Aggregate Endpoint (getLeaderboardStats)
    // ------------------------------------------------------------------------
    console.log('\n>>> Test 4: Verifying Public Aggregate Endpoint Handler...');
    let mockResponse = null;
    const req = { query: {} };
    const res = {
      json: (data) => {
        mockResponse = data;
        return data;
      }
    };
    await getLeaderboardStats(req, res, (err) => { throw err; });

    assert(mockResponse && mockResponse.success === true, 'getLeaderboardStats returned success: true');
    assert(mockResponse.stats.totalRegisteredStudents === activeCount, `getLeaderboardStats student count: ${mockResponse.stats.totalRegisteredStudents}`);
    assert(mockResponse.stats.totalProblemsSolved === manualSum, `getLeaderboardStats problems solved: ${mockResponse.stats.totalProblemsSolved}`);
    assert(mockResponse.stats.codingPlatforms === 5, `getLeaderboardStats platforms: ${mockResponse.stats.codingPlatforms}`);
    assert(Array.isArray(mockResponse.platforms) && mockResponse.platforms.length === 5, 'getLeaderboardStats returned 5 platform statuses');

    // ------------------------------------------------------------------------
    // TEST 5: Business Rule - Exclusion of Disabled Students
    // ------------------------------------------------------------------------
    console.log('\n>>> Test 5: Verifying Exclusion of Disabled Students...');
    const disabledCount = students.filter(s => s.accountStatus === 'DISABLED').length;
    console.log(`Current disabled student count in DB: ${disabledCount}`);
    assert(students.length === activeCount + disabledCount, 'Total students in DB = active students + disabled students');

    // ------------------------------------------------------------------------
    // TEST 6: Realtime Channel Subscription Verification
    // ------------------------------------------------------------------------
    console.log('\n>>> Test 6: Verifying Supabase Realtime Subscription...');
    const supabase = getSupabase();
    assert(supabase !== null, 'Supabase client is active and configured');
    const testChannel = supabase.channel(`test-realtime-${Date.now()}`);
    let channelConnected = false;

    await new Promise((resolve) => {
      testChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {})
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channelConnected = true;
            resolve();
          } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            resolve();
          }
        });

      setTimeout(resolve, 8000);
    });

    assert(channelConnected === true, `Supabase Realtime channel successfully connected with status: SUBSCRIBED`);
    supabase.removeChannel(testChannel);

  } catch (error) {
    console.error('[Verification Suite Error]:', error);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite();
