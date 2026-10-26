/**
 * Dynamic State Change & Metric Reaction Verification
 */

const { formatMetricNumber } = require('../../client/src/hooks/useCountUp');

async function testDynamicMetricReactions() {
  console.log('================================================================');
  console.log('   DYNAMIC METRIC REACTION & NUMBER FORMATTING TESTS            ');
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

  // 1. Format Metric Number Unit Tests
  console.log('>>> Test A: Number Formatting Precision & Consistency...');
  assert(formatMetricNumber(0) === '0', 'formatMetricNumber(0) returns "0" (never blanks or skips zero)');
  assert(formatMetricNumber(93) === '93', 'formatMetricNumber(93) returns "93" (exact count)');
  assert(formatMetricNumber(1250) === '1,250', 'formatMetricNumber(1250) returns "1,250" with comma');
  assert(formatMetricNumber(28077, true) === '28.1K', 'formatMetricNumber(28077, true) returns "28.1K"');
  assert(formatMetricNumber(28077, false) === '28,077', 'formatMetricNumber(28077, false) returns "28,077" with comma');
  assert(formatMetricNumber(1000000, true) === '1M', 'formatMetricNumber(1000000, true) returns "1M"');
  assert(formatMetricNumber(null) === null, 'formatMetricNumber(null) returns null (no fabricated fallback)');
  assert(formatMetricNumber(undefined) === null, 'formatMetricNumber(undefined) returns null (no fabricated fallback)');

  // 2. Dynamic Metric Calculation Simulation
  console.log('\n>>> Test B: Simulating Student Ingestion & Problem Updates...');

  const mockStudents = [
    {
      id: 'student_1',
      accountStatus: 'ACTIVE',
      collegeId: 'COLLEGE_MAIN',
      platformStats: {
        leetcode: { totalSolved: 100 },
        gfg: { totalSolved: 50 },
        codeforces: { totalSolved: 20 },
        codechef: { totalSolved: 10 },
        hackerrank: { totalSolved: 5 },
      }
    },
    {
      id: 'student_2',
      accountStatus: 'ACTIVE',
      collegeId: 'COLLEGE_MAIN',
      platformStats: {
        leetcode: { totalSolved: 80 },
        gfg: { totalSolved: 40 },
        codeforces: { totalSolved: 0 },
        codechef: { totalSolved: 0 },
        hackerrank: { totalSolved: 10 },
      }
    },
    {
      id: 'student_3_disabled',
      accountStatus: 'DISABLED',
      collegeId: 'COLLEGE_MAIN',
      platformStats: {
        leetcode: { totalSolved: 500 },
      }
    }
  ];

  function calculateStats(roster) {
    const active = roster.filter(s => s.accountStatus === 'ACTIVE');
    let totalSolved = 0;
    active.forEach(s => {
      const lc = Math.max(0, Number(s.platformStats?.leetcode?.totalSolved) || 0);
      const gfg = Math.max(0, Number(s.platformStats?.gfg?.totalSolved) || 0);
      const cf = Math.max(0, Number(s.platformStats?.codeforces?.totalSolved) || 0);
      const cc = Math.max(0, Number(s.platformStats?.codechef?.totalSolved) || 0);
      const hr = Math.max(0, Number(s.platformStats?.hackerrank?.totalSolved) || 0);
      totalSolved += (lc + gfg + cf + cc + hr);
    });
    return {
      totalRegisteredStudents: active.length,
      totalProblemsSolved: totalSolved,
      codingPlatforms: 5,
    };
  }

  // Base state
  const state1 = calculateStats(mockStudents);
  assert(state1.totalRegisteredStudents === 2, 'Initial active students: 2 (student_3_disabled correctly excluded)');
  assert(state1.totalProblemsSolved === (185 + 130), `Initial problems: 315 (disabled 500 excluded)`);

  // State 2: Student 2 solves 15 more LeetCode problems
  mockStudents[1].platformStats.leetcode.totalSolved += 15;
  const state2 = calculateStats(mockStudents);
  assert(state2.totalProblemsSolved === 330, 'After solving 15 LC problems: 330 problems tracked (updated dynamically)');

  // State 3: Student 1 account gets DISABLED
  mockStudents[0].accountStatus = 'DISABLED';
  const state3 = calculateStats(mockStudents);
  assert(state3.totalRegisteredStudents === 1, 'After disabling Student 1: registered students drops from 2 to 1');
  assert(state3.totalProblemsSolved === 145, 'After disabling Student 1: problems solved drops to 145');

  // State 4: Student 1 account RE-ACTIVATED
  mockStudents[0].accountStatus = 'ACTIVE';
  const state4 = calculateStats(mockStudents);
  assert(state4.totalRegisteredStudents === 2, 'After re-activating Student 1: registered students restored to 2');
  assert(state4.totalProblemsSolved === 330, 'After re-activating Student 1: problems solved restored to 330');

  // State 5: Completely empty roster
  const emptyState = calculateStats([]);
  assert(emptyState.totalRegisteredStudents === 0, 'Empty roster confirms 0 registered students (not 500+ or 1)');
  assert(emptyState.totalProblemsSolved === 0, 'Empty roster confirms 0 problems solved (not 3K+)');

  console.log('\n================================================================');
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');
  process.exit(failed > 0 ? 1 : 0);
}

testDynamicMetricReactions();
