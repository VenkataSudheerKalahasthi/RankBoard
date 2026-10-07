require('dotenv').config();
const { getAllStudents, getStudentById } = require('../src/supabase/supabaseRepository');
const { syncStudentPlatforms } = require('../src/services/syncService');

async function syncTarget() {
  const students = await getAllStudents();
  const target = students.find(s => 
    s.platforms?.gfg?.username?.toLowerCase() === 'venkatasudheerkalahasthi' ||
    s.fullName?.toLowerCase().includes('sudheer') ||
    s.email?.toLowerCase().includes('sudheer')
  );

  if (!target) {
    console.log('Student not found! List of sample handles:', students.slice(0, 5).map(s => ({ name: s.fullName, gfg: s.platforms?.gfg?.username })));
    return;
  }

  console.log(`Found target student: ${target.fullName} (${target.id})`);
  const synced = await syncStudentPlatforms(target.id);
  console.log('\n--- SYNCED GFG STATS ---');
  console.log(JSON.stringify(synced.platformStats?.gfg, null, 2));
  console.log('\n--- SCORES ---');
  console.log(JSON.stringify(synced.scores, null, 2));
}

syncTarget();
