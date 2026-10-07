const fs = require('fs');
const path = require('path');
const { config, validateEnv } = require('../src/config/env');
const { getStudentById, upsertStudent } = require('../src/supabase/supabaseRepository');
const { fetchPlatformProfile } = require('../src/services/platforms');
const { evaluateStudentScores } = require('../src/services/scoring');
const { recalculateCollegeRankings } = require('../src/services/ranking/rankingEngine');
const {
  parseLeetCodeUrl,
  parseGFGUrl,
  parseCodeforcesUrl,
  parseCodeChefUrl,
  formatCanonicalUrl,
} = require('../src/utils/urlParsers');

const xlsx = require('xlsx');

// Validate environment
validateEnv();

/**
 * Parses Excel (.xlsx, .xls) file into array of objects
 */
function parseExcel(filePath) {
  const workbook = xlsx.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  return xlsx.utils.sheet_to_json(worksheet, { defval: '' });
}

/**
 * Parses a simple CSV string into an array of objects
 */
function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(',');
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = rawCols[idx] ? rawCols[idx].trim().replace(/^["']|["']$/g, '') : '';
    });
    records.push(obj);
  }

  return records;
}

/**
 * Sleep helper for platform API rate limiting
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runBulkImport() {
  const args = process.argv.slice(2);
  const isSyncMode = args.includes('--sync') || args.includes('-s');
  const fileArgs = args.filter((a) => !a.startsWith('-'));
  const inputFilePath = fileArgs[0] || path.join(__dirname, '../data/students_sample.json');

  console.log(`\n======================================================`);
  console.log(`🚀 COLLEGE DSA RANKBOARD — BULK STUDENT IMPORT (SUPABASE)`);
  console.log(`======================================================`);
  console.log(`Reading input file from: ${inputFilePath}`);
  console.log(`Mode: ${isSyncMode ? 'Live Sync (fetch external platform statistics)' : 'Fast Import (import profiles & compute rankings)'}\n`);

  if (!fs.existsSync(inputFilePath)) {
    console.error(`❌ Error: File not found at ${inputFilePath}`);
    console.log(`\nUsage examples:`);
    console.log(`  node scripts/bulkImportStudents.js data/students_sample.json`);
    console.log(`  node scripts/bulkImportStudents.js data/students_sample.json --sync\n`);
    process.exit(1);
  }

  let rawStudents = [];

  if (inputFilePath.endsWith('.xlsx') || inputFilePath.endsWith('.xls')) {
    rawStudents = parseExcel(inputFilePath);
  } else if (inputFilePath.endsWith('.csv')) {
    const fileContent = fs.readFileSync(inputFilePath, 'utf8');
    rawStudents = parseCSV(fileContent);
  } else {
    try {
      const fileContent = fs.readFileSync(inputFilePath, 'utf8');
      rawStudents = JSON.parse(fileContent);
    } catch (e) {
      console.error(`❌ Failed to parse JSON file:`, e.message);
      process.exit(1);
    }
  }

  if (!Array.isArray(rawStudents) || rawStudents.length === 0) {
    console.error(`❌ No student records found in ${inputFilePath}.`);
    process.exit(1);
  }

  console.log(`Found ${rawStudents.length} student records to process.`);
  console.log(`Target College ID: ${config.COLLEGE_ID}\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < rawStudents.length; i++) {
    const item = rawStudents[i];
    const name = (item.name || `Student ${i + 1}`).trim();
    const email = (item.email || '').trim().toLowerCase();
    const rollNumber = (item.rollNumber || item.roll_number || item.rollNo || '').trim();
    const department = item.department || 'Computer Science and Engineering';
    const year = parseInt(item.year, 10) || 4;

    const leetcodeInput = item.leetcodeUrl || item.leetcode || '';
    const gfgInput = item.gfgUrl || item.gfg || '';
    const codeforcesInput = item.codeforcesUrl || item.codeforces || '';
    const codechefInput = item.codechefUrl || item.codechef || '';

    if (!email && !rollNumber) {
      console.warn(`⚠️  [Record #${i + 1}] Skipping record without email and roll number: "${name}"`);
      failCount++;
      continue;
    }

    const effectiveEmail = email || `${rollNumber.toLowerCase()}@student.college.edu`;
    console.log(`[${i + 1}/${rawStudents.length}] Processing: ${name} (${rollNumber || effectiveEmail})...`);

    // Parse handles
    const lcHandle = parseLeetCodeUrl(leetcodeInput);
    const gfgHandle = parseGFGUrl(gfgInput);
    const cfHandle = parseCodeforcesUrl(codeforcesInput);
    const ccHandle = parseCodeChefUrl(codechefInput);

    // Check existing student in Supabase to preserve ID and existing stats
    let existingStudent = null;
    try {
      if (email) existingStudent = await getStudentById(email);
      if (!existingStudent && rollNumber) {
        const { getStudentByRollNumber } = require('../src/supabase/supabaseRepository');
        existingStudent = await getStudentByRollNumber(rollNumber);
      }
    } catch (queryErr) {
      // ignore
    }

    const studentId = existingStudent?.id || `import_${Buffer.from(effectiveEmail).toString('hex').slice(0, 24)}`;
    const clerkUserId = existingStudent?.clerkUserId || (studentId.startsWith('user_') ? studentId : null);

    const platforms = {
      leetcode: {
        profileUrl: lcHandle ? formatCanonicalUrl('leetcode', lcHandle) : (existingStudent?.platforms?.leetcode?.profileUrl || ''),
        username: lcHandle || existingStudent?.platforms?.leetcode?.username || '',
        status: lcHandle ? (existingStudent?.platforms?.leetcode?.status || 'CONNECTED') : 'NOT_CONNECTED',
        lastFetchedAt: existingStudent?.platforms?.leetcode?.lastFetchedAt || null,
        errorMessage: null,
      },
      gfg: {
        profileUrl: gfgHandle ? formatCanonicalUrl('gfg', gfgHandle) : (existingStudent?.platforms?.gfg?.profileUrl || ''),
        username: gfgHandle || existingStudent?.platforms?.gfg?.username || '',
        status: gfgHandle ? (existingStudent?.platforms?.gfg?.status || 'CONNECTED') : 'NOT_CONNECTED',
        lastFetchedAt: existingStudent?.platforms?.gfg?.lastFetchedAt || null,
        errorMessage: null,
      },
      codeforces: {
        profileUrl: cfHandle ? formatCanonicalUrl('codeforces', cfHandle) : (existingStudent?.platforms?.codeforces?.profileUrl || ''),
        username: cfHandle || existingStudent?.platforms?.codeforces?.username || '',
        status: cfHandle ? (existingStudent?.platforms?.codeforces?.status || 'CONNECTED') : 'NOT_CONNECTED',
        lastFetchedAt: existingStudent?.platforms?.codeforces?.lastFetchedAt || null,
        errorMessage: null,
      },
      codechef: {
        profileUrl: ccHandle ? formatCanonicalUrl('codechef', ccHandle) : (existingStudent?.platforms?.codechef?.profileUrl || ''),
        username: ccHandle || existingStudent?.platforms?.codechef?.username || '',
        status: ccHandle ? (existingStudent?.platforms?.codechef?.status || 'CONNECTED') : 'NOT_CONNECTED',
        lastFetchedAt: existingStudent?.platforms?.codechef?.lastFetchedAt || null,
        errorMessage: null,
      },
    };

    const platformStats = {
      leetcode: existingStudent?.platformStats?.leetcode || null,
      gfg: existingStudent?.platformStats?.gfg || null,
      codeforces: existingStudent?.platformStats?.codeforces || null,
      codechef: existingStudent?.platformStats?.codechef || null,
    };

    // If live sync is enabled, fetch stats
    if (isSyncMode) {
      const platformKeys = ['leetcode', 'gfg', 'codeforces', 'codechef'];
      for (const key of platformKeys) {
        const p = platforms[key];
        if (p.username) {
          try {
            const stats = await fetchPlatformProfile(key, p.profileUrl || p.username);
            if (stats.status === 'SUCCESS') {
              platformStats[key] = stats;
              platforms[key].status = 'SUCCESS';
              platforms[key].lastFetchedAt = new Date().toISOString();
            } else {
              platforms[key].status = 'FAILED';
              platforms[key].errorMessage = stats.errorMessage || 'Failed to fetch profile';
            }
          } catch (fetchErr) {
            platforms[key].status = 'FAILED';
            platforms[key].errorMessage = fetchErr.message;
          }
          await sleep(250);
        }
      }
    }

    // Evaluate composite scores
    const scoreResults = evaluateStudentScores(platformStats);
    const finalScore = scoreResults.finalScore;

    const studentRecord = {
      id: studentId,
      clerkUserId,
      collegeId: config.COLLEGE_ID,
      name: existingStudent?.name && existingStudent.name !== 'New Student' ? existingStudent.name : name,
      email: effectiveEmail,
      rollNumber: rollNumber || existingStudent?.rollNumber || '',
      department: department || existingStudent?.department || 'Computer Science and Engineering',
      year: year || existingStudent?.year || 4,
      profilePhoto: existingStudent?.profilePhoto || '',
      role: 'STUDENT',
      accountStatus: existingStudent?.accountStatus || 'ACTIVE',
      profileCompleted: !!(rollNumber && department && (lcHandle || gfgHandle || cfHandle || ccHandle)),
      finalScore: finalScore || existingStudent?.finalScore || 0,
      scores: scoreResults,
      platforms,
      platformStats,
      updatedAt: new Date().toISOString(),
      lastDataUpdatedAt: new Date().toISOString(),
      createdAt: existingStudent?.createdAt || new Date().toISOString(),
    };

    try {
      await upsertStudent(studentRecord);
      console.log(`   ✓ Saved: ${name} (Score: ${(studentRecord.finalScore || 0).toFixed(2)})`);
      successCount++;
    } catch (saveErr) {
      console.error(`   ✗ Supabase Save Error for ${effectiveEmail}:`, saveErr.message);
      failCount++;
    }
  }

  console.log(`\nRecalculating college rankings for "${config.COLLEGE_ID}"...`);
  const rankSummary = await recalculateCollegeRankings(config.COLLEGE_ID);
  console.log(`✓ College rankings updated across ${rankSummary.totalStudents} total students in Supabase.\n`);

  console.log(`======================================================`);
  console.log(`📊 BULK IMPORT COMPLETED`);
  console.log(`   Successfully Processed: ${successCount}`);
  console.log(`   Failed / Skipped:       ${failCount}`);
  console.log(`   Total College Board:    ${rankSummary.totalStudents}`);
  console.log(`======================================================\n`);
  process.exit(0);
}

runBulkImport().catch((err) => {
  console.error('Fatal import error:', err);
  process.exit(1);
});
