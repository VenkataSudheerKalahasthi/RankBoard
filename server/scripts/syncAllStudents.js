require('dotenv').config();
const { getAllStudents } = require('../src/supabase/supabaseRepository');
const { syncStudentPlatforms } = require('../src/services/syncService');
const { recalculateCollegeRankings } = require('../src/services/ranking/rankingEngine');

async function syncAll() {
  try {
    console.log('Fetching students from Supabase repository...');
    const students = await getAllStudents();
    console.log(`Found ${students.length} students. Syncing...`);
    
    for (const student of students) {
      console.log(`\n--- Syncing student: ${student.fullName} (${student.id}, clerk: ${student.clerkId}) ---`);
      try {
        const synced = await syncStudentPlatforms(student.id);
        console.log(`[GFG Stats]:`, synced.platformStats?.gfg);
        console.log(`[Scores]:`, synced.scores);
        console.log(`[Final Score]:`, synced.finalScore);
      } catch (err) {
        console.error(`Failed to sync ${student.fullName}:`, err.message);
      }
    }

    await recalculateCollegeRankings('COLLEGE_MAIN');
    console.log('\nAll student sync and ranking calculation completed successfully!');
  } catch (e) {
    console.error('Fatal sync error:', e);
  }
}

syncAll();
