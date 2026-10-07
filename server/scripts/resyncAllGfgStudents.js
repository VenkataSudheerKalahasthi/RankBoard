const { getAllStudents, getStudentById } = require('../src/supabase/supabaseRepository');
const { syncStudentPlatforms } = require('../src/services/syncService');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function resyncAllGfgStudents() {
  console.log('======================================================');
  console.log('🔄 GEEKSFORGEEKS GLOBAL SAFE RE-SYNCHRONIZATION');
  console.log('======================================================\n');

  try {
    const students = await getAllStudents();
    const gfgStudents = students.filter(
      (s) => s.platforms?.gfg?.username || s.platforms?.gfg?.profileUrl
    );

    console.log(`📊 Total students found with GFG configuration: ${gfgStudents.length}`);

    let updatedCount = 0;
    let unchangedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < gfgStudents.length; i++) {
      const student = gfgStudents[i];
      const handle = student.platforms?.gfg?.username;
      const prevStats = student.platformStats?.gfg || {};
      const prevScore = student.scores?.gfgScore ?? 0;

      console.log(`\n[${i + 1}/${gfgStudents.length}] Processing: ${student.name} (${student.rollNumber || student.id}) | Handle: ${handle}`);
      console.log(`  Previous: School=${prevStats.schoolSolved ?? 'N/A'}, Basic=${prevStats.basicSolved ?? 'N/A'}, Easy=${prevStats.easySolved ?? 'N/A'}, Medium=${prevStats.mediumSolved ?? 'N/A'}, Hard=${prevStats.hardSolved ?? 'N/A'}, Total=${prevStats.totalSolved ?? 'N/A'}, GFGScore=${prevScore}`);

      try {
        const syncRes = await syncStudentPlatforms(student.id, null, { forceSync: true });
        const newStats = syncRes.student.platformStats?.gfg || {};
        const newScore = syncRes.student.scores?.gfgScore ?? 0;

        console.log(`  New:      School=${newStats.schoolSolved ?? 0}, Basic=${newStats.basicSolved ?? 0}, Easy=${newStats.easySolved ?? 0}, Medium=${newStats.mediumSolved ?? 0}, Hard=${newStats.hardSolved ?? 0}, Total=${newStats.totalSolved ?? 0}, GFGScore=${newScore}`);
        if (syncRes.hasChanged) {
          console.log(`  ✨ Changes: ${syncRes.detectedChanges.join(' | ')}`);
          updatedCount++;
        } else {
          console.log(`  ✅ Unchanged / Already Accurate`);
          unchangedCount++;
        }
      } catch (err) {
        console.error(`  ❌ Failed to sync ${student.name}:`, err.message);
        failedCount++;
      }

      // Safe rate-limit buffer between students
      await sleep(1300);
    }

    console.log('\n======================================================');
    console.log('🎉 GEEKSFORGEEKS RE-SYNCHRONIZATION COMPLETED');
    console.log(`  Total Processed: ${gfgStudents.length}`);
    console.log(`  Updated / Corrected: ${updatedCount}`);
    console.log(`  Unchanged / Accurate: ${unchangedCount}`);
    console.log(`  Failed: ${failedCount}`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('Fatal error during GFG re-synchronization:', err);
  }
}

resyncAllGfgStudents();
