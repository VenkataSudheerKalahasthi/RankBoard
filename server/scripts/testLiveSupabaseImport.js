require('dotenv').config();
const XLSX = require('xlsx');
const { validateHeaders, validateStudentRows } = require('../src/utils/importValidator');
const { getSupabase } = require('../src/supabase/supabaseClient');
const { getAllStudents, getStudentById, getImportHistory, deleteStudent } = require('../src/supabase/supabaseRepository');
const { recalculateCollegeRankings } = require('../src/services/ranking/rankingEngine');

async function testLiveImport() {
  console.log('===============================================================');
  console.log('🚀 LIVE SUPABASE BULK IMPORT INTEGRATION VERIFICATION');
  console.log('===============================================================');

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client failed to initialize');
  }

  // 1. Initial State Check
  const initialStudents = await getAllStudents();
  console.log(`📊 Initial Active Students Count in Supabase: ${initialStudents.length}`);

  const testStudentEmail = `test_live_import_${Date.now()}@university.edu`;
  const testStudentRoll = `24TEST${Math.floor(1000 + Math.random() * 9000)}`;

  // 2. Prepare Test Data according to the official 10 columns
  const testRows = [
    // A. Valid New Student with platform links
    {
      rowNumber: 1,
      name: 'Venkata Sudheer Test',
      email: testStudentEmail,
      rollNumber: testStudentRoll,
      branch: 'PRIME',
      year: 4,
      leetcodeUrl: 'https://leetcode.com/u/venkata_sudheer_kalahasthi',
      gfgUrl: 'https://www.geeksforgeeks.org/profile/venkatasudheerkalahasthi',
      hackerrankUrl: 'https://www.hackerrank.com/profile/venkatasudheerk5',
      codeforcesUrl: '',
      codechefUrl: 'https://www.codechef.com/users/super_eagle_45',
    },
    // B. Invalid Row (bad email)
    {
      rowNumber: 2,
      name: 'Invalid Email Person',
      email: 'bad-email-format',
      rollNumber: 'BAD001',
      branch: 'CSE',
      year: 3,
    },
  ];

  // 3. Run Validation
  console.log('\n--- Step 1: Running Server Validation ---');
  const validation = validateStudentRows(testRows, initialStudents);
  console.log('Validation Summary:', JSON.stringify(validation.summary, null, 2));

  if (validation.summary.validRows !== 1 || validation.summary.invalidRows !== 1) {
    throw new Error('Validation summary counts mismatch expected counts');
  }
  console.log('✅ Validation correctly identified 1 valid new student and 1 invalid row.');

  // 4. Simulate confirmImport logic directly
  console.log('\n--- Step 2: Running Database Import ---');
  const docId = `import_${Buffer.from(testStudentEmail).toString('hex').slice(0, 24)}`;
  
  // Insert student
  const { error: studentErr } = await supabase.from('students').upsert({
    id: docId,
    clerk_user_id: null,
    college_id: 'COLLEGE_MAIN',
    name: 'Venkata Sudheer Test',
    email: testStudentEmail,
    roll_number: testStudentRoll,
    department: 'PRIME',
    year: 4,
    role: 'STUDENT',
    account_status: 'ACTIVE',
    profile_completed: true,
    final_score: 0,
    rank: null,
    last_data_updated_at: new Date().toISOString(),
  });

  if (studentErr) throw new Error(`Insert student error: ${studentErr.message}`);

  // Insert platform profiles
  const profileRows = [
    {
      student_id: docId,
      platform: 'leetcode',
      profile_url: 'https://leetcode.com/u/venkata_sudheer_kalahasthi/',
      username: 'venkata_sudheer_kalahasthi',
      status: 'PENDING',
    },
    {
      student_id: docId,
      platform: 'gfg',
      profile_url: 'https://www.geeksforgeeks.org/user/venkatasudheerkalahasthi/',
      username: 'venkatasudheerkalahasthi',
      status: 'PENDING',
    },
    {
      student_id: docId,
      platform: 'hackerrank',
      profile_url: 'https://www.hackerrank.com/profile/venkatasudheerk5',
      username: 'venkatasudheerk5',
      status: 'PENDING',
    },
    {
      student_id: docId,
      platform: 'codechef',
      profile_url: 'https://www.codechef.com/users/super_eagle_45',
      username: 'super_eagle_45',
      status: 'PENDING',
    },
  ];

  const { error: profileErr } = await supabase
    .from('student_platform_profiles')
    .upsert(profileRows, { onConflict: 'student_id,platform' });

  if (profileErr) throw new Error(`Insert profiles error: ${profileErr.message}`);

  // Insert initial score
  await supabase.from('scores').upsert({
    student_id: docId,
    leetcode_score: 0,
    gfg_score: 0,
    hackerrank_score: 0,
    codeforces_score: 0,
    codechef_score: 0,
    final_score: 0,
  });

  // Insert Import History
  const historyPayload = {
    admin_id: 'test_admin_id',
    admin_email: 'admin@college.edu',
    file_name: 'test_live_import.xlsx',
    total_rows: 2,
    imported_count: 1,
    skipped_count: 0,
    failed_count: 1,
    status: 'COMPLETED_WITH_ERRORS',
    details: {
      createdCount: 1,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 1,
      failedRows: [
        {
          rowNumber: 2,
          name: 'Invalid Email Person',
          email: 'bad-email-format',
          rollNumber: 'BAD001',
          reason: 'Invalid Email format',
        },
      ],
    },
    created_at: new Date().toISOString(),
  };

  const { error: histErr } = await supabase.from('import_history').insert(historyPayload);
  if (histErr) throw new Error(`Insert history error: ${histErr.message}`);

  console.log('✅ Student, platform profiles, and import history written to Supabase successfully.');

  // 5. Verify Record Retrieval from Supabase
  console.log('\n--- Step 3: Verifying Data in Supabase ---');
  const createdStudent = await getStudentById(docId);
  console.log('Retrieved Student:', {
    id: createdStudent.id,
    name: createdStudent.name,
    email: createdStudent.email,
    rollNumber: createdStudent.rollNumber,
    department: createdStudent.department,
    leetcode: createdStudent.platforms.leetcode,
    gfg: createdStudent.platforms.gfg,
    hackerrank: createdStudent.platforms.hackerrank,
    codechef: createdStudent.platforms.codechef,
  });

  if (!createdStudent || createdStudent.email !== testStudentEmail) {
    throw new Error('Created student could not be fetched from Supabase');
  }
  if (!createdStudent.platforms.hackerrank.username || createdStudent.platforms.hackerrank.username !== 'venkatasudheerk5') {
    throw new Error('HackerRank platform profile was not stored correctly');
  }

  // 6. Recalculate Rankings
  console.log('\n--- Step 4: Recalculating College Rankings ---');
  const rankResult = await recalculateCollegeRankings('COLLEGE_MAIN');
  console.log(`Rankings updated for ${rankResult.updatedCount} students.`);

  // 7. Verify Import History
  console.log('\n--- Step 5: Verifying Import History ---');
  const historyList = await getImportHistory(5);
  console.log('Latest Import History Entry:', historyList[0]);
  if (!historyList || historyList.length === 0 || historyList[0].fileName !== 'test_live_import.xlsx') {
    throw new Error('Import history record not found');
  }

  // 8. Cleanup test student
  console.log('\n--- Step 6: Cleaning up test student ---');
  await supabase.from('scores').delete().eq('student_id', docId);
  await supabase.from('student_platform_profiles').delete().eq('student_id', docId);
  await supabase.from('students').delete().eq('id', docId);
  await recalculateCollegeRankings('COLLEGE_MAIN');
  console.log('✅ Cleanup completed cleanly.');

  console.log('\n===============================================================');
  console.log('🎉 LIVE SUPABASE IMPORT VERIFICATION COMPLETED WITH 100% SUCCESS!');
  console.log('===============================================================');
}

testLiveImport()
  .then(() => {
    console.log('Done.');
  })
  .catch((err) => {
    console.error('❌ Live import test error:', err);
  });
