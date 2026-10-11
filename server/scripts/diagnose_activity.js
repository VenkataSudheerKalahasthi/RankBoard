require('dotenv').config();
const { getSupabase } = require('../src/supabase/supabaseClient');
const { getAllStudents } = require('../src/supabase/supabaseRepository');
const { getAllSnapshotsInDateRange, hasHistoricalData } = require('../src/supabase/activityRepository');
const { getTodayTopSolvers, getStudentActivityPeriod } = require('../src/services/activity/activityService');
const { getKolkataTodayString, getKolkataNDaysAgoString } = require('../src/utils/timezoneUtils');

async function run() {
  console.log('--- DIAGNOSTIC SCRIPT ---');
  console.log('Timezone Today:', getKolkataTodayString());
  console.log('Yesterday:', getKolkataNDaysAgoString(1));
  console.log('System local date:', new Date().toISOString());

  const supabase = getSupabase();

  // 1. Count students
  const students = await getAllStudents();
  console.log(`Total active students: ${students.length}`);

  // Sample student with non-zero stats
  const studentsWithStats = students.filter(s => {
    const stats = s.platformStats || {};
    return Object.values(stats).some(p => (p && p.totalSolved > 0));
  });
  console.log(`Students with platformStats.totalSolved > 0: ${studentsWithStats.length}`);

  // Check some student profiles
  console.log('\nSample 3 students with stats:');
  studentsWithStats.slice(0, 3).forEach(s => {
    console.log(`- ID: ${s.id}, Name: ${s.name}, Roll: ${s.rollNumber}`);
    console.log('  Platforms:', Object.keys(s.platforms || {}).map(p => `${p}:${s.platforms[p]?.username || 'none'}`).join(', '));
    console.log('  Stats:', Object.keys(s.platformStats || {}).map(p => `${p}:${s.platformStats[p]?.totalSolved || 0}`).join(', '));
  });

  // 2. Snapshots count and date distribution
  const { count, error: countErr } = await supabase
    .from('student_activity_snapshots')
    .select('*', { count: 'exact', head: true });
  console.log(`\nTotal student_activity_snapshots count: ${count}`);

  const { data: dateDist, error: distErr } = await supabase
    .from('student_activity_snapshots')
    .select('activity_date');
  
  if (dateDist) {
    const countsByDate = {};
    dateDist.forEach(r => {
      countsByDate[r.activity_date] = (countsByDate[r.activity_date] || 0) + 1;
    });
    console.log('Snapshots by activity_date:', countsByDate);
  }

  // 3. Test getTodayTopSolvers
  console.log('\nTesting getTodayTopSolvers()...');
  const topSolvers = await getTodayTopSolvers();
  console.log(`hasHistoricalData: ${topSolvers.hasHistoricalData}`);
  console.log(`summary:`, topSolvers.summary);
  console.log(`Total returned solvers: ${topSolvers.solvers.length}`);
  const nonZero = topSolvers.solvers.filter(s => s.todayVerifiedSolves > 0);
  console.log(`Solvers with todayVerifiedSolves > 0: ${nonZero.length}`);
  if (nonZero.length > 0) {
    console.log('Non-zero solvers sample:', nonZero.slice(0, 5).map(s => ({
      name: s.name,
      todayVerifiedSolves: s.todayVerifiedSolves,
      leetcode: s.leetcodeSolves,
      gfg: s.gfgSolves,
      diff: s.difficultyBreakdown,
      status: s.activityStatus
    })));
  }

  // Sample student activity period
  if (studentsWithStats.length > 0) {
    const sId = studentsWithStats[0].id;
    console.log(`\nTesting getStudentActivityPeriod for ${studentsWithStats[0].name} (${sId}):`);
    const act = await getStudentActivityPeriod(sId, { period: 'today' });
    console.log('Today activity summary:', act.summary);
    const act7 = await getStudentActivityPeriod(sId, { period: '7d' });
    console.log('7d activity summary:', act7.summary);
  }
}

run().catch(console.error);
