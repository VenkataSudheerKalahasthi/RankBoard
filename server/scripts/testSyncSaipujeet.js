const { getAllStudents, getStudentById } = require('../src/supabase/supabaseRepository');
const { syncStudentPlatforms } = require('../src/services/syncService');

async function testSyncSaipujeet() {
  const students = await getAllStudents();
  const saipujeet = students.find(s => s.platforms?.gfg?.username === 'saipu3ane');

  if (!saipujeet) {
    console.error('Saipujeet not found!');
    return;
  }

  console.log('Found Saipujeet:', saipujeet.id, saipujeet.name);
  console.log('BEFORE SYNC:');
  console.log('  GFG Stats:', JSON.stringify(saipujeet.platformStats?.gfg));
  console.log('  Scores:', JSON.stringify(saipujeet.scores));

  console.log('\n--- Syncing Saipujeet with forceSync: true ---');
  const syncResult = await syncStudentPlatforms(saipujeet.id, null, { forceSync: true });

  console.log('\nAFTER SYNC:');
  console.log('  Has Changed:', syncResult.hasChanged);
  console.log('  Detected Changes:', syncResult.detectedChanges);
  console.log('  GFG Stats:', JSON.stringify(syncResult.student.platformStats?.gfg));
  console.log('  Scores:', JSON.stringify(syncResult.student.scores));

  const refreshed = await getStudentById(saipujeet.id);
  console.log('\nREFETCHED FROM DB:');
  console.log('  GFG Stats:', JSON.stringify(refreshed.platformStats?.gfg));
  console.log('  Scores:', JSON.stringify(refreshed.scores));
}

testSyncSaipujeet();
