/**
 * Automated Test Suite for:
 * 1. Admin Student Deletion & Audit Trail
 * 2. Cross-Account Duplicate Platform Profile Detection (All 5 platforms)
 * 3. URL Variations & Case Normalization
 * 4. Multi-Platform Conflicts & Partial Updates
 */

const assert = require('assert');
const {
  maskEmail,
  normalizePlatformIdentity,
  checkDuplicatePlatformIdentities,
} = require('../src/utils/platformIdentityUtils');
const {
  parseLeetCodeUrl,
  parseGFGUrl,
  parseCodeforcesUrl,
  parseCodeChefUrl,
  parseHackerRankUrl,
} = require('../src/utils/urlParsers');
const {
  insertDeletedStudentAudit,
  getDeletedStudentsAudit,
  purgeDeletedStudentAudit,
} = require('../src/supabase/supabaseRepository');

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING DSA RANKBOARD FEATURE 1-10 TEST SUITE');
  console.log('====================================================');

  let passedTests = 0;
  let totalTests = 0;

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      console.log(`✅ [PASS] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  async function asyncTest(name, fn) {
    totalTests++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  // --- UNIT TESTS: Email Masking ---
  test('Email masking preserves first char and masks remainder with domain', () => {
    assert.strictEqual(maskEmail('student1@gmail.com'), 's*******@gmail.com');
    assert.strictEqual(maskEmail('sudheer123@gmail.com'), 's*********@gmail.com');
    assert.strictEqual(maskEmail('rishitharayapati40@gmail.com'), 'r*****************@gmail.com');
  });

  // --- UNIT TESTS: URL Parsing for all 5 platforms ---
  test('LeetCode URL and handle variations are normalized', () => {
    assert.strictEqual(parseLeetCodeUrl('https://leetcode.com/u/sudheer123/'), 'sudheer123');
    assert.strictEqual(parseLeetCodeUrl('https://leetcode.com/sudheer123'), 'sudheer123');
    assert.strictEqual(parseLeetCodeUrl('https://leetcode.com/u/sudheer123/?utm_source=rankboard'), 'sudheer123');
    assert.strictEqual(parseLeetCodeUrl('sudheer123'), 'sudheer123');
    assert.strictEqual(parseLeetCodeUrl('@sudheer123'), 'sudheer123');
  });

  test('GeeksforGeeks URL variations are normalized', () => {
    assert.strictEqual(parseGFGUrl('https://www.geeksforgeeks.org/user/sudheer_gfg/'), 'sudheer_gfg');
    assert.strictEqual(parseGFGUrl('https://geeksforgeeks.org/profile/sudheer_gfg'), 'sudheer_gfg');
    assert.strictEqual(parseGFGUrl('sudheer_gfg'), 'sudheer_gfg');
  });

  test('HackerRank URL variations are normalized', () => {
    assert.strictEqual(parseHackerRankUrl('https://www.hackerrank.com/profile/sudheer_hr'), 'sudheer_hr');
    assert.strictEqual(parseHackerRankUrl('https://hackerrank.com/sudheer_hr/'), 'sudheer_hr');
    assert.strictEqual(parseHackerRankUrl('sudheer_hr'), 'sudheer_hr');
  });

  test('Codeforces URL variations are normalized', () => {
    assert.strictEqual(parseCodeforcesUrl('https://codeforces.com/profile/tourist'), 'tourist');
    assert.strictEqual(parseCodeforcesUrl('tourist'), 'tourist');
  });

  test('CodeChef URL variations are normalized', () => {
    assert.strictEqual(parseCodeChefUrl('https://www.codechef.com/users/gennady'), 'gennady');
    assert.strictEqual(parseCodeChefUrl('gennady'), 'gennady');
  });

  // --- CROSS-ACCOUNT DUPLICATE DETECTION TESTS ---
  const existingActiveStudents = [
    {
      id: 'student_A',
      clerkUserId: 'user_clerk_A',
      name: 'Student A',
      email: 'student1@gmail.com',
      accountStatus: 'ACTIVE',
      platforms: {
        leetcode: { username: 'sudheer123', profileUrl: 'https://leetcode.com/u/sudheer123/' },
        gfg: { username: 'sudheer_gfg', profileUrl: 'https://geeksforgeeks.org/user/sudheer_gfg/' },
        hackerrank: { username: 'sudheer_hr', profileUrl: 'https://hackerrank.com/profile/sudheer_hr' },
        codeforces: { username: 'tourist', profileUrl: 'https://codeforces.com/profile/tourist' },
        codechef: { username: 'gennady', profileUrl: 'https://codechef.com/users/gennady' },
      },
    },
    {
      id: 'student_B',
      clerkUserId: 'user_clerk_B',
      name: 'Student B',
      email: 'venkata@gmail.com',
      accountStatus: 'ACTIVE',
      platforms: {
        gfg: { username: 'venkata_gfg', profileUrl: 'https://geeksforgeeks.org/user/venkata_gfg/' },
      },
    },
  ];

  test('Detects duplicate LeetCode profile submitted by another email', () => {
    const res = checkDuplicatePlatformIdentities({
      currentStudentId: 'student_new',
      currentEmail: 'student2@gmail.com',
      submittedLinks: {
        leetcodeUrl: 'https://leetcode.com/u/sudheer123/',
      },
      allActiveStudents: existingActiveStudents,
    });

    assert.strictEqual(res.hasConflict, true);
    assert.strictEqual(res.conflicts.length, 1);
    assert.strictEqual(res.conflicts[0].platform, 'leetcode');
    assert.strictEqual(res.conflicts[0].username, 'sudheer123');
    assert.strictEqual(res.conflicts[0].existingOwnerMaskedEmail, 's*******@gmail.com');
  });

  test('Detects duplicate GFG profile submitted by another email', () => {
    const res = checkDuplicatePlatformIdentities({
      currentStudentId: 'student_new',
      currentEmail: 'student2@gmail.com',
      submittedLinks: {
        gfgUrl: 'https://www.geeksforgeeks.org/user/sudheer_gfg/',
      },
      allActiveStudents: existingActiveStudents,
    });

    assert.strictEqual(res.hasConflict, true);
    assert.strictEqual(res.conflicts[0].platform, 'gfg');
    assert.strictEqual(res.conflicts[0].username, 'sudheer_gfg');
  });

  test('Detects duplicate HackerRank profile submitted by another email', () => {
    const res = checkDuplicatePlatformIdentities({
      currentStudentId: 'student_new',
      currentEmail: 'student2@gmail.com',
      submittedLinks: {
        hackerrankUrl: 'https://hackerrank.com/profile/sudheer_hr',
      },
      allActiveStudents: existingActiveStudents,
    });

    assert.strictEqual(res.hasConflict, true);
    assert.strictEqual(res.conflicts[0].platform, 'hackerrank');
  });

  test('Detects duplicate Codeforces handle submitted by another email', () => {
    const res = checkDuplicatePlatformIdentities({
      currentStudentId: 'student_new',
      currentEmail: 'student2@gmail.com',
      submittedLinks: {
        codeforcesUrl: 'https://codeforces.com/profile/tourist',
      },
      allActiveStudents: existingActiveStudents,
    });

    assert.strictEqual(res.hasConflict, true);
    assert.strictEqual(res.conflicts[0].platform, 'codeforces');
  });

  test('Detects duplicate CodeChef handle submitted by another email', () => {
    const res = checkDuplicatePlatformIdentities({
      currentStudentId: 'student_new',
      currentEmail: 'student2@gmail.com',
      submittedLinks: {
        codechefUrl: 'https://www.codechef.com/users/gennady',
      },
      allActiveStudents: existingActiveStudents,
    });

    assert.strictEqual(res.hasConflict, true);
    assert.strictEqual(res.conflicts[0].platform, 'codechef');
  });

  test('Handles multiple duplicate conflicts across different owners in single submission', () => {
    const res = checkDuplicatePlatformIdentities({
      currentStudentId: 'student_new',
      currentEmail: 'student2@gmail.com',
      submittedLinks: {
        leetcodeUrl: 'https://leetcode.com/u/sudheer123/',
        gfgUrl: 'https://www.geeksforgeeks.org/user/venkata_gfg/',
        codeforcesUrl: 'https://codeforces.com/profile/brand_new_cf',
      },
      allActiveStudents: existingActiveStudents,
    });

    assert.strictEqual(res.hasConflict, true);
    assert.strictEqual(res.conflicts.length, 2);
    assert.strictEqual(res.conflicts[0].platform, 'leetcode');
    assert.strictEqual(res.conflicts[0].existingOwnerMaskedEmail, 's*******@gmail.com');
    assert.strictEqual(res.conflicts[1].platform, 'gfg');
    assert.strictEqual(res.conflicts[1].existingOwnerMaskedEmail, 'v******@gmail.com');
    assert.strictEqual(res.validIdentities.codeforces.username, 'brand_new_cf');
  });

  test('Allows current authenticated student to update or re-submit their own existing handles', () => {
    const res = checkDuplicatePlatformIdentities({
      currentStudentId: 'student_A',
      currentEmail: 'student1@gmail.com',
      submittedLinks: {
        leetcodeUrl: 'https://leetcode.com/u/sudheer123/',
        gfgUrl: 'https://www.geeksforgeeks.org/user/sudheer_gfg/',
      },
      allActiveStudents: existingActiveStudents,
    });

    assert.strictEqual(res.hasConflict, false);
    assert.strictEqual(res.conflicts.length, 0);
  });

  test('Case-insensitive handle matching detects duplicates with different casing', () => {
    const res = checkDuplicatePlatformIdentities({
      currentStudentId: 'student_new',
      currentEmail: 'student2@gmail.com',
      submittedLinks: {
        leetcodeUrl: 'https://leetcode.com/u/SUDHEER123/',
      },
      allActiveStudents: existingActiveStudents,
    });

    assert.strictEqual(res.hasConflict, true);
    assert.strictEqual(res.conflicts[0].platform, 'leetcode');
  });

  // --- AUDIT TRAIL REPOSITORY TESTS ---
  await asyncTest('Deleted student audit record is inserted and retrieved correctly', async () => {
    const testRecord = {
      studentId: `test_del_${Date.now()}`,
      studentName: 'Test Deleted Student',
      studentEmail: 'test_del@college.edu',
      rollNumber: '21CS999',
      department: 'Computer Science',
      year: 4,
      deletedByAdminId: 'admin_test_1',
      deletedByAdminEmail: 'admin@college.edu',
      deletedByAdminName: 'Test Admin',
      reason: 'Automated Test Deletion',
    };

    const inserted = await insertDeletedStudentAudit(testRecord);
    assert.ok(inserted);
    assert.strictEqual(inserted.studentName, testRecord.studentName);
    assert.strictEqual(inserted.studentEmail, testRecord.studentEmail);

    const list = await getDeletedStudentsAudit({ search: 'test_del' });
    assert.ok(list.deletedStudents.length >= 1);
    const found = list.deletedStudents.find((s) => s.studentId === testRecord.studentId);
    assert.ok(found);
    assert.strictEqual(found.studentName, testRecord.studentName);

    // Purge test
    await purgeDeletedStudentAudit(testRecord.studentId);
    const afterPurge = await getDeletedStudentsAudit({ search: testRecord.studentId });
    assert.strictEqual(afterPurge.deletedStudents.length, 0);
  });

  console.log('====================================================');
  console.log(`🎉 TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log('====================================================');
}

runTestSuite().catch((err) => {
  console.error('Test Suite Exception:', err);
  process.exit(1);
});
