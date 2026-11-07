require('dotenv').config();
const { getTodayTopSolvers } = require('../src/services/activity/activityService');

async function testPeriods() {
  const periods = [
    { period: 'today' },
    { period: '2d' },
    { period: '7d' },
    { period: '30d' },
    { period: 'month' },
    { period: 'custom', startDate: '2026-11-01', endDate: '2026-11-06' },
  ];

  for (const p of periods) {
    console.log(`\n=== Testing Period: ${p.period} ===`);
    const res = await getTodayTopSolvers(p);
    console.log(`Period: ${res.period}, Label: ${res.periodLabel}, Date: ${res.date}`);
    console.log(`Active Solvers: ${res.activeSolversInPeriod}, Total Solves: ${res.totalSolvesInPeriod}, Total Students: ${res.totalStudentsEvaluated}`);
    console.log(`Top 3 Solvers:`);
    res.solvers.slice(0, 3).forEach(s => {
      console.log(`  #${s.rank} ${s.name} (${s.rollNumber}) -> Period Solves: ${s.periodVerifiedSolves} [LC: ${s.leetcodeSolves}, GFG: ${s.gfgSolves}, HR: ${s.hackerrankSolves}, CF: ${s.codeforcesSolves}, CC: ${s.codechefSolves}] Diff:`, s.difficultyBreakdown);
    });
  }
}

testPeriods().catch(console.error);

