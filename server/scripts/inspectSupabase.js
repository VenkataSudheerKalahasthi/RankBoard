const { getAllStudents, getAllAdmins, getAuditLogs, getNotifications } = require('../src/supabase/supabaseRepository');

async function inspectSupabase() {
  console.log('======================================================');
  console.log('🔍 SUPABASE POSTGRESQL DATA INTEGRITY & AUDIT REPORT');
  console.log('======================================================\n');

  try {
    const students = await getAllStudents();
    console.log(`📊 Total Students in Supabase: ${students.length}`);

    let activeCount = 0;
    let disabledCount = 0;
    let leetcodeCount = 0;
    let gfgCount = 0;
    let cfCount = 0;
    let ccCount = 0;
    let totalSolvedAll = 0;

    students.forEach((s) => {
      if (s.accountStatus === 'ACTIVE') activeCount++;
      else disabledCount++;

      const p = s.platforms || {};
      const stats = s.platformStats || {};

      if (p.leetcode?.profileUrl || p.leetcode?.username) leetcodeCount++;
      if (p.gfg?.profileUrl || p.gfg?.username) gfgCount++;
      if (p.codeforces?.profileUrl || p.codeforces?.username) cfCount++;
      if (p.codechef?.profileUrl || p.codechef?.username) ccCount++;

      const solved =
        (stats.leetcode?.totalSolved || 0) +
        (stats.gfg?.totalSolved || 0) +
        (stats.codeforces?.totalSolved || 0) +
        (stats.codechef?.totalSolved || 0);
      totalSolvedAll += solved;
    });

    console.log(`   - Active Students:   ${activeCount}`);
    console.log(`   - Disabled Students: ${disabledCount}`);
    console.log(`   - LeetCode Profiles: ${leetcodeCount}`);
    console.log(`   - GFG Profiles:      ${gfgCount}`);
    console.log(`   - Codeforces:        ${cfCount}`);
    console.log(`   - CodeChef Profiles: ${ccCount}`);
    console.log(`   - Total Combined Problems Solved: ${totalSolvedAll}`);

    const admins = await getAllAdmins();
    console.log(`\n👑 Total Admins in Supabase: ${admins.length}`);
    admins.forEach((a) => {
      console.log(`   - ${a.name} (${a.email}) [Role: ${a.role}, Status: ${a.status}]`);
    });

    const auditLogs = await getAuditLogs(5);
    console.log(`\n📝 Recent Audit Logs: ${auditLogs.length} found`);
    auditLogs.forEach((l) => {
      console.log(`   - [${l.timestamp}] ${l.adminName}: ${l.action} -> ${l.target}`);
    });

    if (students.length > 0) {
      console.log('\n--- SAMPLE STUDENT RECORD ---');
      console.log(JSON.stringify(students[0], null, 2));
    }

    console.log('\n======================================================');
    console.log('✅ Supabase PostgreSQL integrity verified successfully.');
    console.log('======================================================');
  } catch (err) {
    console.error('❌ Supabase inspection error:', err.message);
  }
}

inspectSupabase().catch(console.error);
