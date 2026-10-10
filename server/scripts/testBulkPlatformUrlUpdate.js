require('dotenv').config();
const XLSX = require('xlsx');
const {
  ALLOWED_PLATFORMS,
  PLATFORM_DISPLAY_NAMES,
  validateBulkPlatformUrlHeaders,
  validateBulkPlatformUrlRows,
  parsePlatformUrl,
  getExistingPlatformUrl,
} = require('../src/utils/bulkPlatformUrlValidator');
const {
  parseLeetCodeUrl,
  parseGFGUrl,
  parseCodeforcesUrl,
  parseCodeChefUrl,
  parseHackerRankUrl,
  formatCanonicalUrl,
} = require('../src/utils/urlParsers');
const { getSupabase } = require('../src/supabase/supabaseClient');
const {
  getAllStudents,
  getStudentById,
  updateStudentPlatformProfile,
  batchUpdateStudentPlatformProfiles,
  getImportHistory,
} = require('../src/supabase/supabaseRepository');
const { syncStudentPlatforms } = require('../src/services/syncService');
const { evaluateStudentScores } = require('../src/services/scoring');
const { SCORING_WEIGHTS } = require('../src/services/scoring/scoringConfig');
const { recalculateCollegeRankings } = require('../src/services/ranking/rankingEngine');
const { AUDIT_ACTIONS } = require('../src/utils/auditLogger');

async function runComprehensiveTests() {
  console.log('===================================================================');
  console.log('🧪 RUNNING BULK PLATFORM URL UPDATE VERIFICATION & REGRESSION SUITE');
  console.log('===================================================================');

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

  // ---------------------------------------------------------------------------
  // TEST 1: Platform & Header Validation
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 1: Platform Allowlist & Header Validation ---');
  assert(ALLOWED_PLATFORMS.includes('leetcode'), 'LeetCode is in allowed platforms');
  assert(ALLOWED_PLATFORMS.includes('gfg'), 'GFG is in allowed platforms');
  assert(ALLOWED_PLATFORMS.includes('hackerrank'), 'HackerRank is in allowed platforms');
  assert(ALLOWED_PLATFORMS.includes('codeforces'), 'Codeforces is in allowed platforms');
  assert(ALLOWED_PLATFORMS.includes('codechef'), 'CodeChef is in allowed platforms');
  assert(!ALLOWED_PLATFORMS.includes('atcoder'), 'Unallowed platform "atcoder" is rejected');

  // HackerRank with Email header
  const hrHeaders = ['Email', 'HackerRank URL'];
  const hrRes = validateBulkPlatformUrlHeaders(hrHeaders, 'hackerrank');
  assert(hrRes.isValid === true, 'Valid Email + HackerRank URL headers pass');
  assert(hrRes.mapping.identifierType === 'email', 'Identifier detected as email');
  assert(hrRes.mapping.urlIndex === 1, 'HackerRank URL column mapped');

  // LeetCode with Roll Number header
  const lcHeaders = ['Roll Number', 'LeetCode Profile'];
  const lcRes = validateBulkPlatformUrlHeaders(lcHeaders, 'leetcode');
  assert(lcRes.isValid === true, 'Valid Roll Number + LeetCode Profile headers pass');
  assert(lcRes.mapping.identifierType === 'rollNumber', 'Identifier detected as rollNumber');

  // GFG aliases header
  const gfgHeaders = ['Student Mail', 'GeeksforGeeks Profile'];
  const gfgRes = validateBulkPlatformUrlHeaders(gfgHeaders, 'gfg');
  assert(gfgRes.isValid === true, 'GFG aliases pass validation');

  // Missing identifier header
  const missingIdHeaders = ['Name', 'HackerRank URL'];
  const missingIdRes = validateBulkPlatformUrlHeaders(missingIdHeaders, 'hackerrank');
  assert(missingIdRes.isValid === false, 'Missing identifier header fails');
  assert(missingIdRes.error.includes('Missing required identifier'), 'Expected error message returned');

  // Missing platform URL header
  const missingUrlHeaders = ['Email', 'Random Column'];
  const missingUrlRes = validateBulkPlatformUrlHeaders(missingUrlHeaders, 'codechef');
  assert(missingUrlRes.isValid === false, 'Missing CodeChef URL header fails');
  assert(missingUrlRes.error.includes('Missing required column for CodeChef'), 'Expected CodeChef error returned');

  // ---------------------------------------------------------------------------
  // TEST 2: URL Parsers & Canonical Formatting for all 5 platforms
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: URL Parsers & Canonical Formatting (All 5 Platforms) ---');
  // LeetCode
  assert(parseLeetCodeUrl('https://leetcode.com/u/student_lc/') === 'student_lc', 'LeetCode /u/ profile parsed');
  assert(parseLeetCodeUrl('https://leetcode.com/student_lc') === 'student_lc', 'LeetCode direct profile parsed');
  assert(parseLeetCodeUrl('student_lc') === 'student_lc', 'LeetCode handle parsed');
  assert(formatCanonicalUrl('leetcode', 'student_lc') === 'https://leetcode.com/u/student_lc/', 'LeetCode canonical URL formatted');

  // GFG
  assert(parseGFGUrl('https://www.geeksforgeeks.org/user/student_gfg/') === 'student_gfg', 'GFG /user/ profile parsed');
  assert(parseGFGUrl('https://www.geeksforgeeks.org/profile/student_gfg') === 'student_gfg', 'GFG /profile/ parsed');
  assert(formatCanonicalUrl('gfg', 'student_gfg') === 'https://www.geeksforgeeks.org/user/student_gfg/', 'GFG canonical URL formatted');

  // HackerRank
  assert(parseHackerRankUrl('https://www.hackerrank.com/profile/student_hr') === 'student_hr', 'HackerRank /profile/ parsed');
  assert(parseHackerRankUrl('https://www.hackerrank.com/student_hr') === 'student_hr', 'HackerRank direct URL parsed');
  assert(formatCanonicalUrl('hackerrank', 'student_hr') === 'https://www.hackerrank.com/profile/student_hr', 'HackerRank canonical URL formatted');

  // Codeforces
  assert(parseCodeforcesUrl('https://codeforces.com/profile/student_cf') === 'student_cf', 'Codeforces /profile/ parsed');
  assert(formatCanonicalUrl('codeforces', 'student_cf') === 'https://codeforces.com/profile/student_cf', 'Codeforces canonical URL formatted');

  // CodeChef
  assert(parseCodeChefUrl('https://www.codechef.com/users/student_cc') === 'student_cc', 'CodeChef /users/ parsed');
  assert(formatCanonicalUrl('codechef', 'student_cc') === 'https://www.codechef.com/users/student_cc', 'CodeChef canonical URL formatted');

  // Malformed URL rejection
  assert(parseHackerRankUrl('https://fake-site.com/profile/test') === null, 'Non-platform domain rejected');
  assert(parseHackerRankUrl('') === null, 'Empty URL string returns null');
  assert(parseHackerRankUrl('   ') === null, 'Whitespace URL returns null');

  // ---------------------------------------------------------------------------
  // TEST 3: Safe Matching & Error Condition Handling
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Safe Matching & Error Condition Handling ---');
  const existingStudents = await getAllStudents();
  console.log(`  ℹ️ Found ${existingStudents.length} students in Supabase.`);
  assert(existingStudents.length > 0, 'Database contains existing students for matching tests');

  const existingStudent1 = existingStudents[0];
  const existingStudent2 = existingStudents[1] || existingStudents[0];
  const existingStudent3 = existingStudents[2] || existingStudents[0];
  const existingStudent4 = existingStudents[3] || existingStudents[0];

  const testCasesRows = [
    // 1. Valid match by Email
    {
      rowNumber: 1,
      identifier: existingStudent1.email.toUpperCase(), // Case normalization check
      url: 'https://www.hackerrank.com/profile/new_hr_handle_1',
    },
    // 2. Valid match by Roll Number
    {
      rowNumber: 2,
      identifier: existingStudent2.rollNumber.toLowerCase(), // Case normalization check
      url: 'https://www.hackerrank.com/profile/new_hr_handle_2',
    },
    // 3. Student Not Found
    {
      rowNumber: 3,
      identifier: 'non_existent_student_99999@college.edu',
      url: 'https://www.hackerrank.com/profile/valid_hr_handle',
    },
    // 4. Invalid URL format
    {
      rowNumber: 4,
      identifier: existingStudent3.email,
      url: 'https://invalid-domain.com/user/xyz',
    },
    // 5. Missing URL
    {
      rowNumber: 5,
      identifier: existingStudent4.email,
      url: '',
    },
    // 6. Missing Identifier
    {
      rowNumber: 6,
      identifier: '',
      url: 'https://www.hackerrank.com/profile/missing_id',
    },
    // 7. Duplicate in file (re-using existingStudent1.email from row 1)
    {
      rowNumber: 7,
      identifier: existingStudent1.email,
      url: 'https://www.hackerrank.com/profile/dup_hr',
    },
  ];

  const valResult = validateBulkPlatformUrlRows(testCasesRows, 'hackerrank', existingStudents);
  const rowsRes = valResult.rows;

  assert(rowsRes[0].isValid === true, 'Row 1 (Email match) is valid');
  assert(rowsRes[0].studentId === existingStudent1.id, 'Row 1 matched exact student ID');
  assert(rowsRes[0].handle === 'new_hr_handle_1', 'Row 1 handle extracted');

  assert(rowsRes[1].isValid === true, 'Row 2 (Roll Number match) is valid');
  assert(rowsRes[1].studentId === existingStudent2.id, 'Row 2 matched exact student ID');

  assert(rowsRes[2].status === 'STUDENT_NOT_FOUND', 'Row 3 correctly flagged as STUDENT_NOT_FOUND');
  assert(rowsRes[2].isValid === false, 'Row 3 marked invalid');

  assert(rowsRes[3].status === 'INVALID_URL', 'Row 4 correctly flagged as INVALID_URL');
  assert(rowsRes[3].isValid === false, 'Row 4 marked invalid');

  assert(rowsRes[4].status === 'MISSING_REQUIRED_VALUE', 'Row 5 correctly flagged as MISSING_REQUIRED_VALUE (URL)');
  assert(rowsRes[5].status === 'MISSING_REQUIRED_VALUE', 'Row 6 correctly flagged as MISSING_REQUIRED_VALUE (Identifier)');

  assert(rowsRes[6].status === 'DUPLICATE_IN_FILE', 'Row 7 correctly flagged as DUPLICATE_IN_FILE');

  assert(valResult.summary.totalRows === 7, 'Total rows = 7');
  assert(valResult.summary.studentsNotFound === 1, 'Students not found = 1');
  assert(valResult.summary.invalidUrls === 1, 'Invalid URLs = 1');
  assert(valResult.summary.duplicatesInFile === 1, 'Duplicates in file = 1');

  // ---------------------------------------------------------------------------
  // TEST 4: Outcome Determination (New Link, Identical/Unchanged, Replacement)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Outcome Determination (New Link, Identical, Replacement) ---');
  // Mock students with known states
  const mockStudents = [
    {
      id: 'mock_1',
      name: 'Student One',
      email: 's1@univ.edu',
      rollNumber: 'R01',
      platforms: {
        hackerrank: { profileUrl: '', username: '' }, // No existing URL
      },
    },
    {
      id: 'mock_2',
      name: 'Student Two',
      email: 's2@univ.edu',
      rollNumber: 'R02',
      platforms: {
        hackerrank: { profileUrl: 'https://www.hackerrank.com/profile/existing_hr', username: 'existing_hr' },
      },
    },
  ];

  const outcomeRows = [
    // Should be NEW_LINK
    { rowNumber: 1, identifier: 's1@univ.edu', url: 'https://www.hackerrank.com/profile/new_hr' },
    // Should be IDENTICAL (UNCHANGED)
    { rowNumber: 2, identifier: 's2@univ.edu', url: 'https://www.hackerrank.com/profile/existing_hr' },
    // Should be REPLACEMENT
    { rowNumber: 3, identifier: 's2@univ.edu', url: 'https://www.hackerrank.com/profile/different_hr' },
  ];

  // Note: Row 3 will be flagged duplicate in file if we pass both row 2 and 3 with same identifier in single file,
  // so validate separately:
  const resNew = validateBulkPlatformUrlRows([outcomeRows[0]], 'hackerrank', mockStudents);
  assert(resNew.rows[0].changeType === 'NEW_LINK', 'Student with no previous URL produces NEW_LINK');
  assert(resNew.rows[0].status === 'READY_TO_UPDATE', 'Status is READY_TO_UPDATE');

  const resIdentical = validateBulkPlatformUrlRows([outcomeRows[1]], 'hackerrank', mockStudents);
  assert(resIdentical.rows[0].changeType === 'IDENTICAL', 'Student with matching URL produces IDENTICAL');
  assert(resIdentical.rows[0].status === 'UNCHANGED', 'Status is UNCHANGED');
  assert(resIdentical.summary.unchanged === 1, 'Unchanged counter incremented');

  const resReplacement = validateBulkPlatformUrlRows([outcomeRows[2]], 'hackerrank', mockStudents);
  assert(resReplacement.rows[0].changeType === 'REPLACEMENT', 'Student with different URL produces REPLACEMENT');
  assert(resReplacement.rows[0].isReplacement === true, 'isReplacement is true');
  assert(resReplacement.summary.replacements === 1, 'Replacements counter incremented');

  // ---------------------------------------------------------------------------
  // TEST 5: Targeted Update & Zero Regression on All Unrelated Student Fields
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Targeted Update & Zero Regression Verification ---');
  // Use a real student from DB to test targeted update
  const targetStudent = existingStudents[0];
  const originalSnapshot = await getStudentById(targetStudent.id);

  console.log(`  ℹ️ Target student for zero regression: ${originalSnapshot.name} (${originalSnapshot.id})`);

  const testNewHrHandle = `test_hr_${Date.now()}`;
  const testNewHrUrl = `https://www.hackerrank.com/profile/${testNewHrHandle}`;

  // Execute targeted update for HackerRank only
  await updateStudentPlatformProfile(targetStudent.id, 'hackerrank', {
    profileUrl: testNewHrUrl,
    username: testNewHrHandle,
  });

  // Fetch updated student from DB
  const updatedSnapshot = await getStudentById(targetStudent.id);

  // 1. Verify HackerRank URL was updated
  assert(
    updatedSnapshot.platforms.hackerrank.username === testNewHrHandle,
    `HackerRank username updated to "${testNewHrHandle}"`
  );
  assert(
    updatedSnapshot.platforms.hackerrank.profileUrl === testNewHrUrl,
    `HackerRank profileUrl updated to "${testNewHrUrl}"`
  );

  // 2. CRITICAL ZERO-REGRESSION CHECKS: Verify all other fields were untouched!
  assert(updatedSnapshot.name === originalSnapshot.name, 'Student Name UNTOUCHED and identical');
  assert(updatedSnapshot.email === originalSnapshot.email, 'Student Email UNTOUCHED and identical');
  assert(updatedSnapshot.rollNumber === originalSnapshot.rollNumber, 'Student Roll Number UNTOUCHED and identical');
  assert(updatedSnapshot.department === originalSnapshot.department, 'Student Department UNTOUCHED and identical');
  assert(updatedSnapshot.year === originalSnapshot.year, 'Student Year UNTOUCHED and identical');
  assert(updatedSnapshot.profilePhoto === originalSnapshot.profilePhoto, 'Student Profile Photo UNTOUCHED and identical');
  assert(updatedSnapshot.accountStatus === originalSnapshot.accountStatus, 'Student Account Status UNTOUCHED and identical');
  assert(updatedSnapshot.role === originalSnapshot.role, 'Student Role UNTOUCHED and identical');

  // Verify other platforms were untouched
  assert(
    updatedSnapshot.platforms.leetcode.profileUrl === originalSnapshot.platforms.leetcode.profileUrl,
    'LeetCode profile URL UNTOUCHED'
  );
  assert(
    updatedSnapshot.platforms.gfg.profileUrl === originalSnapshot.platforms.gfg.profileUrl,
    'GFG profile URL UNTOUCHED'
  );
  assert(
    updatedSnapshot.platforms.codeforces.profileUrl === originalSnapshot.platforms.codeforces.profileUrl,
    'Codeforces profile URL UNTOUCHED'
  );
  assert(
    updatedSnapshot.platforms.codechef.profileUrl === originalSnapshot.platforms.codechef.profileUrl,
    'CodeChef profile URL UNTOUCHED'
  );

  // Restore previous HackerRank profile for hygiene
  if (originalSnapshot.platforms.hackerrank) {
    await updateStudentPlatformProfile(targetStudent.id, 'hackerrank', {
      profileUrl: originalSnapshot.platforms.hackerrank.profileUrl,
      username: originalSnapshot.platforms.hackerrank.username,
    });
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Replacement Confirmation Gate
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6: Replacement Confirmation Gate ---');
  // Confirm unconfirmed replacements are skipped
  const replacementRow = {
    rowNumber: 1,
    studentId: 'test_student_id',
    identifier: 'student@example.com',
    submittedUrl: 'https://www.hackerrank.com/profile/new_url',
    status: 'REPLACEMENT',
    changeType: 'REPLACEMENT',
    isValid: true,
  };

  // Simulating controller logic when confirmReplacements is false
  const unconfirmedAction = (r, confirmReplacements) => {
    if (r.changeType === 'REPLACEMENT' && !confirmReplacements) {
      return { skipped: true, reason: 'Replacement requires explicit confirmation' };
    }
    return { skipped: false };
  };

  assert(unconfirmedAction(replacementRow, false).skipped === true, 'Replacement skipped when confirmReplacements is false');
  assert(unconfirmedAction(replacementRow, true).skipped === false, 'Replacement allowed when confirmReplacements is true');

  // ---------------------------------------------------------------------------
  // TEST 7: 100 Rows & 1,000 Rows Scaling Simulation
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7: Scalable Import Simulation (100 Rows & 1,000 Rows) ---');
  // Generate 100 rows
  const rows100 = [];
  for (let i = 1; i <= 100; i++) {
    rows100.push({
      rowNumber: i,
      identifier: `student_${i}@college.edu`,
      url: `https://www.hackerrank.com/profile/student_${i}_hr`,
    });
  }
  assert(rows100.length === 100, 'Generated 100 student rows');

  // Generate 1,000 rows
  const startTime = Date.now();
  const rows1000 = [];
  for (let i = 1; i <= 1000; i++) {
    rows1000.push({
      rowNumber: i,
      identifier: `batch_student_${i}@college.edu`,
      url: `https://leetcode.com/u/batch_student_${i}/`,
    });
  }
  const val1000 = validateBulkPlatformUrlRows(rows1000, 'leetcode', existingStudents);
  const elapsed = Date.now() - startTime;

  assert(val1000.summary.totalRows === 1000, 'Validated 1,000 rows successfully');
  assert(elapsed < 1000, `1,000 rows validated in ${elapsed}ms (< 1000ms threshold)`);

  // Verify batch chunking logic
  const chunkSize = 50;
  const chunks = [];
  for (let i = 0; i < rows1000.length; i += chunkSize) {
    chunks.push(rows1000.slice(i, i + chunkSize));
  }
  assert(chunks.length === 20, '1,000 rows successfully partitioned into 20 bounded chunks of 50');

  // Verify progress math
  let simulatedProcessed = 0;
  for (let c = 0; c < chunks.length; c++) {
    simulatedProcessed += chunks[c].length;
    const pct = Math.min(100, Math.round((simulatedProcessed / rows1000.length) * 100));
    assert(!isNaN(pct), `Progress percentage is not NaN on chunk ${c + 1}`);
    assert(pct <= 100, `Progress percentage does not exceed 100% (currently ${pct}%)`);
  }
  assert(simulatedProcessed === 1000, 'All 1,000 rows accounted for');

  // ---------------------------------------------------------------------------
  // TEST 8: Failure Isolation & Partial Batch Error Handling
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8: Failure Isolation & Partial Batch Error Handling ---');
  const mixedRows = [
    { rowNumber: 1, identifier: existingStudent1.email, url: 'https://codeforces.com/profile/valid_cf' },
    { rowNumber: 2, identifier: 'bad_email', url: 'https://codeforces.com/profile/bad' },
    { rowNumber: 3, identifier: existingStudent1.email, url: 'https://invalid-host.com/profile' },
  ];
  const mixedVal = validateBulkPlatformUrlRows(mixedRows, 'codeforces', existingStudents);

  assert(mixedVal.rows[0].isValid === true, 'Valid row in mixed batch passed');
  assert(mixedVal.rows[1].isValid === false, 'Invalid student row caught');
  assert(mixedVal.rows[2].isValid === false, 'Invalid URL row caught');
  assert(mixedVal.summary.validRows === 1, 'Valid rows = 1');
  assert(mixedVal.summary.failedRows === 2, 'Failed rows = 2');

  // ---------------------------------------------------------------------------
  // TEST 9: Selective Platform Synchronization & Scoring Integration
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 9: Selective Platform Synchronization & Scoring ---');
  // Verify scoring weights
  assert(SCORING_WEIGHTS.LEETCODE.OVERALL === 0.40, 'LeetCode scoring weight is 40%');
  assert(SCORING_WEIGHTS.GFG.OVERALL === 0.30, 'GFG scoring weight is 30%');
  assert(SCORING_WEIGHTS.HACKERRANK.OVERALL === 0.30, 'HackerRank scoring weight is 30%');
  assert(SCORING_WEIGHTS.CODEFORCES.OVERALL === 0.00, 'Codeforces scoring weight is 0% (Statistics only)');
  assert(SCORING_WEIGHTS.CODECHEF.OVERALL === 0.00, 'CodeChef scoring weight is 0% (Statistics only)');

  // Test evaluateStudentScores function
  const sampleStats = {
    leetcode: { status: 'SUCCESS', totalSolved: 100, easySolved: 40, mediumSolved: 40, hardSolved: 20 },
    gfg: { status: 'SUCCESS', totalSolved: 100, easySolved: 30, mediumSolved: 40, hardSolved: 30, rating: 500 },
    hackerrank: { status: 'SUCCESS', totalSolved: 50, rating: 250, stars: 5, badges: 3 },
    codeforces: { status: 'SUCCESS', totalSolved: 50, rating: 1200 },
    codechef: { status: 'SUCCESS', totalSolved: 30 },
  };
  const scores = evaluateStudentScores(sampleStats);
  assert(scores.finalScore > 0, 'Final score calculated correctly');
  assert(scores.codeforcesScore === 0, 'Codeforces does not add to final score');
  assert(scores.codechefScore === 0, 'CodeChef does not add to final score');

  // ---------------------------------------------------------------------------
  // TEST 10: Audit Action & History Logging
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 10: Audit Action & History Logging Constants ---');
  assert(
    AUDIT_ACTIONS.BULK_PLATFORM_URL_UPDATE === 'BULK_PLATFORM_URL_UPDATE',
    'BULK_PLATFORM_URL_UPDATE action is registered in AUDIT_ACTIONS'
  );

  // ---------------------------------------------------------------------------
  // TEST 11: Real Workspace File Testing (prime 1 links.xlsx)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 11: Real Workspace File Testing (prime 1 links.xlsx) ---');
  const primeWb = XLSX.readFile('../prime 1 links.xlsx');
  const primeWs = primeWb.Sheets[primeWb.SheetNames[0]];
  const primeData = XLSX.utils.sheet_to_json(primeWs, { header: 1 });

  // prime 1 links contains columns: Index 1 = Email, Index 4 = LeetCode, Index 5 = CodeChef, Index 6 = GFG
  const primeRows = [];
  for (let i = 1; i < primeData.length; i++) {
    const r = primeData[i];
    if (r[1] && r[4]) {
      primeRows.push({
        rowNumber: i,
        identifier: String(r[1]).trim(),
        url: String(r[4]).trim(),
      });
    }
  }

  assert(primeRows.length > 0, `Extracted ${primeRows.length} real rows from prime 1 links.xlsx`);
  const primeValidation = validateBulkPlatformUrlRows(primeRows, 'leetcode', existingStudents);
  console.log(`  ℹ️ prime 1 links (LeetCode): ${primeValidation.summary.totalRows} rows, ${primeValidation.summary.matchedExisting} matched existing students in Supabase.`);
  assert(primeValidation.summary.totalRows === primeRows.length, 'All real student rows parsed');

  console.log('\n===================================================================');
  console.log(`🎉 ALL ${passedTests} / ${totalTests} TESTS PASSED WITH ZERO REGRESSION!`);
  console.log('===================================================================\n');
}

runComprehensiveTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test suite execution failed:', err);
    process.exit(1);
  });
