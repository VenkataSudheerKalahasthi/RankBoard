require('dotenv').config();
const XLSX = require('xlsx');
const { validateHeaders, validateStudentRows, REQUIRED_COLUMNS } = require('../src/utils/importValidator');
const { getSupabase } = require('../src/supabase/supabaseClient');
const { getAllStudents, getStudentById, getImportHistory } = require('../src/supabase/supabaseRepository');
const { syncStudentPlatforms } = require('../src/services/syncService');
const { evaluateStudentScores } = require('../src/services/scoring');
const { recalculateCollegeRankings } = require('../src/services/ranking/rankingEngine');

async function runEndToEndTests() {
  console.log('===============================================================');
  console.log('🧪 RUNNING END-TO-END BULK STUDENT EXCEL IMPORT TEST SUITE');
  console.log('===============================================================');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      throw new Error(`Test failed: ${message}`);
    }
  }

  // TEST 1: Header Validation - Success with exact 10 columns
  console.log('\n--- TEST 1: Header Validation (Standard 10 Columns) ---');
  const validHeaders = [
    'Name',
    'Email',
    'Roll Number',
    'Branch',
    'Year',
    'LeetCode Profile',
    'GeeksforGeeks Profile',
    'HackerRank Profile',
    'Codeforces Profile',
    'CodeChef Profile',
  ];
  const headerRes1 = validateHeaders(validHeaders);
  assert(headerRes1.isValid === true, 'Valid 10 columns pass validation');
  assert(headerRes1.mapping.name.header === 'Name', 'Name column mapped');
  assert(headerRes1.mapping.hackerrankUrl.header === 'HackerRank Profile', 'HackerRank column mapped (8th position)');

  // TEST 2: Header Validation - Failure with missing column
  console.log('\n--- TEST 2: Header Validation (Missing Column) ---');
  const missingGFGHeaders = [
    'Name',
    'Email',
    'Roll Number',
    'Branch',
    'Year',
    'LeetCode Profile',
    'HackerRank Profile',
    'Codeforces Profile',
    'CodeChef Profile',
  ];
  const headerRes2 = validateHeaders(missingGFGHeaders);
  assert(headerRes2.isValid === false, 'Missing column fails validation');
  assert(
    headerRes2.error === 'Invalid Excel format. Missing column: GeeksforGeeks Profile',
    `Expected exact error message: "${headerRes2.error}"`
  );

  // TEST 3: Header Validation - Duplicate Column
  console.log('\n--- TEST 3: Header Validation (Duplicate Column) ---');
  const duplicateHeaders = [
    'Name',
    'Email',
    'Email',
    'Roll Number',
    'Branch',
    'Year',
    'LeetCode Profile',
    'GeeksforGeeks Profile',
    'HackerRank Profile',
    'Codeforces Profile',
    'CodeChef Profile',
  ];
  const headerRes3 = validateHeaders(duplicateHeaders);
  assert(headerRes3.isValid === false, 'Duplicate column fails validation');
  assert(headerRes3.error.includes('Duplicate column found'), `Duplicate error detected: ${headerRes3.error}`);

  // TEST 4: Row Validation & Duplicate Detection
  console.log('\n--- TEST 4: Row Validation (Errors, Duplicates, and Partial Profiles) ---');
  const existingStudents = await getAllStudents();
  console.log(`  ℹ️ Found ${existingStudents.length} existing students in Supabase.`);

  const existingSample = existingStudents[0] || { email: 'test@example.com', rollNumber: '23491A0501' };

  const testRows = [
    // 1. Valid New Student with partial links (CF and CC empty)
    {
      rowNumber: 1,
      name: 'Test New Student A',
      email: 'test_new_student_a_import@testuniv.edu',
      rollNumber: '99TEST001',
      branch: 'CSE',
      year: 4,
      leetcodeUrl: 'https://leetcode.com/u/venkata_sudheer_kalahasthi',
      gfgUrl: 'https://www.geeksforgeeks.org/profile/venkatasudheerkalahasthi',
      hackerrankUrl: 'https://www.hackerrank.com/profile/venkatasudheerk5',
      codeforcesUrl: '',
      codechefUrl: '',
    },
    // 2. Duplicate of existing student in DB
    {
      rowNumber: 2,
      name: 'Existing Student Update',
      email: existingSample.email,
      rollNumber: existingSample.rollNumber,
      branch: 'PRIME',
      year: 4,
      leetcodeUrl: 'https://leetcode.com/u/test_update/',
      gfgUrl: 'https://www.geeksforgeeks.org/user/test_update/',
      hackerrankUrl: 'https://www.hackerrank.com/profile/test_update',
      codeforcesUrl: '',
      codechefUrl: '',
    },
    // 3. Row with invalid email
    {
      rowNumber: 3,
      name: 'Invalid Email Student',
      email: 'not-an-email',
      rollNumber: '99TEST003',
      branch: 'IT',
      year: 3,
    },
    // 4. Row with missing name
    {
      rowNumber: 4,
      name: '',
      email: 'missingname@testuniv.edu',
      rollNumber: '99TEST004',
      branch: 'ECE',
      year: 2,
    },
    // 5. In-file duplicate email
    {
      rowNumber: 5,
      name: 'Duplicate File Student',
      email: 'test_new_student_a_import@testuniv.edu', // duplicate of row 1
      rollNumber: '99TEST005',
      branch: 'CSE',
      year: 4,
    },
  ];

  const rowValidation = validateStudentRows(testRows, existingStudents);
  console.log('  ℹ️ Summary:', JSON.stringify(rowValidation.summary, null, 2));

  assert(rowValidation.summary.totalRows === 5, 'Total rows = 5');
  assert(rowValidation.summary.validRows === 1, 'Valid new rows = 1');
  assert(rowValidation.summary.duplicateRows === 1, 'Duplicate rows = 1');
  assert(rowValidation.summary.invalidRows === 3, 'Invalid rows = 3');

  // Verify Row 1: Valid new record
  const r1 = rowValidation.rows[0];
  assert(r1.status === 'VALID' && r1.isValid === true, 'Row 1 is VALID');
  assert(r1.leetcodeHandle === 'venkata_sudheer_kalahasthi', 'LeetCode handle parsed correctly');
  assert(r1.gfgHandle === 'venkatasudheerkalahasthi', 'GFG handle parsed correctly');
  assert(r1.hackerrankHandle === 'venkatasudheerk5', 'HackerRank handle parsed correctly');

  // Verify Row 2: Existing student match
  const r2 = rowValidation.rows[1];
  assert(r2.status === 'DUPLICATE' && r2.isDuplicate === true, 'Row 2 is DUPLICATE');
  assert(r2.duplicateReason.includes(existingSample.email), 'Duplicate reason mentions existing email');

  // Verify Row 3: Invalid email
  const r3 = rowValidation.rows[2];
  assert(r3.status === 'INVALID' && r3.errors.includes('Invalid Email format'), 'Row 3 flags invalid email');

  // Verify Row 4: Missing name
  const r4 = rowValidation.rows[3];
  assert(r4.status === 'INVALID' && r4.errors.includes('Missing Name'), 'Row 4 flags missing name');

  // Verify Row 5: In-file duplicate
  const r5 = rowValidation.rows[4];
  assert(r5.status === 'INVALID' && r5.errors.some((e) => e.includes('Duplicate email')), 'Row 5 flags in-file duplicate');

  // TEST 5: Excel Parsing from Real File (sudheer_details.xlsx)
  console.log('\n--- TEST 5: Excel Parsing with Real Workspace File (sudheer_details.xlsx) ---');
  const path = require('path');
  const filePath = path.join(__dirname, '../../sudheer_details.xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  
  const headersInFile = rawData[0];
  console.log('  ℹ️ Headers in sudheer_details.xlsx:', headersInFile);
  const fileHeaderCheck = validateHeaders(headersInFile);
  assert(fileHeaderCheck.isValid === true, 'sudheer_details.xlsx headers match recognized template');

  console.log('\n===============================================================');
  console.log(`🎉 ALL ${passedTests} / ${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('===============================================================');
}

runEndToEndTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test suite error:', err);
    process.exit(1);
  });
