const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const assert = require('assert');
const {
  getTodayTopSolvers,
  getStudentActivityPeriod,
} = require('../src/services/activity/activityService');
const {
  getKolkataTodayString,
  getKolkataMonthStartString,
  getKolkataNDaysAgoString,
  resolvePeriodBounds,
} = require('../src/utils/timezoneUtils');

async function testMultiPeriod() {
  console.log('\n======================================================');
  console.log('🧪 VERIFYING MULTI-PERIOD ACTIVITY MONITOR & SOLVER RANKINGS');
  console.log('======================================================\n');

  const todayStr = getKolkataTodayString();
  const monthStartStr = getKolkataMonthStartString();
  console.log(`Current Kolkata Date: ${todayStr}`);
  console.log(`Kolkata Month Start: ${monthStartStr}`);

  // Test 1: Period Bounds Resolution
  console.log('\n--- 1. Testing resolvePeriodBounds ---');
  const bToday = resolvePeriodBounds({ period: 'today' });
  assert.strictEqual(bToday.startDate, todayStr);
  assert.strictEqual(bToday.endDate, todayStr);
  console.log('  ✅ today: ', bToday);

  const b2d = resolvePeriodBounds({ period: '2d' });
  assert.strictEqual(b2d.daysCount, 2);
  console.log('  ✅ 2d: ', b2d);

  const b7d = resolvePeriodBounds({ period: '7d' });
  assert.strictEqual(b7d.daysCount, 7);
  console.log('  ✅ 7d: ', b7d);

  const b30d = resolvePeriodBounds({ period: '30d' });
  assert.strictEqual(b30d.daysCount, 30);
  console.log('  ✅ 30d: ', b30d);

  const bMonth = resolvePeriodBounds({ period: 'month' });
  assert.strictEqual(bMonth.startDate, monthStartStr);
  assert.strictEqual(bMonth.endDate, todayStr);
  console.log('  ✅ month: ', bMonth);

  const bCustom = resolvePeriodBounds({ period: 'custom', startDate: '2026-10-01', endDate: '2026-10-10' });
  assert.strictEqual(bCustom.startDate, '2026-10-01');
  assert.strictEqual(bCustom.endDate, '2026-10-10');
  assert.strictEqual(bCustom.daysCount, 10);
  console.log('  ✅ custom: ', bCustom);

  // Test 2: getTodayTopSolvers across periods
  console.log('\n--- 2. Testing getTodayTopSolvers for "today" ---');
  const resToday = await getTodayTopSolvers({ period: 'today', limit: 10 });
  console.log(`Top 5 solvers today:`);
  resToday.solvers.slice(0, 5).forEach((s) => {
    console.log(`  #${s.rank} ${s.name} (+${s.todayVerifiedSolves}) [E:${s.difficultyBreakdown.easy} M:${s.difficultyBreakdown.medium} H:${s.difficultyBreakdown.hard}] [LC:+${s.leetcodeSolves} GFG:+${s.gfgSolves}] [Status: ${s.activityStatus}, Verified: ${s.hasVerifiedHistory}]`);
  });
  assert(resToday.solvers.length > 0, 'Must return solvers list');
  assert(resToday.activeSolversToday > 0, 'Must have at least one active solver today');

  console.log('\n--- 3. Testing getTodayTopSolvers for "2d" ---');
  const res2d = await getTodayTopSolvers({ period: '2d', limit: 10 });
  console.log(`Active solvers in 2d: ${res2d.activeSolversInPeriod}, Total solves: +${res2d.totalSolvesInPeriod}`);
  assert(res2d.solvers.length > 0);

  console.log('\n--- 4. Testing getTodayTopSolvers for "7d" ---');
  const res7d = await getTodayTopSolvers({ period: '7d', limit: 10 });
  console.log(`Active solvers in 7d: ${res7d.activeSolversInPeriod}, Total solves: +${res7d.totalSolvesInPeriod}`);
  assert(res7d.solvers.length > 0);

  console.log('\n--- 5. Testing getTodayTopSolvers for "month" ---');
  const resMonth = await getTodayTopSolvers({ period: 'month', limit: 10 });
  console.log(`Active solvers in month: ${resMonth.activeSolversInPeriod}, Total solves: +${resMonth.totalSolvesInPeriod}`);
  assert(resMonth.solvers.length > 0);

  // Test 6: Verify student-level activity calculations for Mekala Mallikharjuna
  console.log('\n--- 6. Testing individual student report for Mekala Mallikharjuna ---');
  const malliStudent = resToday.solvers.find(s => s.name.includes('Mekala'));
  if (malliStudent) {
    const studentReport = await getStudentActivityPeriod(malliStudent.studentId, { period: 'today' });
    console.log(`Mekala Activity Period (today):`, {
      period: studentReport.period,
      totalNewSolves: studentReport.totalNewSolvesAllPlatforms,
      easy: studentReport.platforms.leetcode.easyNew,
      medium: studentReport.platforms.leetcode.mediumNew,
      hard: studentReport.platforms.leetcode.hardNew,
      leetcodeNew: studentReport.platforms.leetcode.newSolves,
      dailyTrendCount: studentReport.platforms.leetcode.dailyTrend.length,
      dailyTrend: studentReport.platforms.leetcode.dailyTrend
    });

    assert.strictEqual(studentReport.totalNewSolvesAllPlatforms, malliStudent.todayVerifiedSolves, 'Student report totals must match top solver entry');
    assert.strictEqual(studentReport.platforms.leetcode.dailyTrend[0].count, malliStudent.todayVerifiedSolves, 'Daily trend must not be inflated');
    console.log('  ✅ Verified: Mekala dailyTrend solves match true period delta exactly!');
  }

  // Test 7: Verify sorting order
  console.log('\n--- 7. Verifying descending order of verified solves ---');
  for (let i = 0; i < resToday.solvers.length - 1; i++) {
    const curr = resToday.solvers[i].todayVerifiedSolves;
    const next = resToday.solvers[i + 1].todayVerifiedSolves;
    assert(curr >= next, `Solvers must be ordered descending (${curr} >= ${next})`);
  }
  console.log('  ✅ Solvers strictly sorted in descending order by verified new solves');

  console.log('\n======================================================');
  console.log('🎉 ALL MULTI-PERIOD TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

testMultiPeriod().catch(err => {
  console.error('❌ Multi-Period Test Failed:', err);
  process.exit(1);
});
