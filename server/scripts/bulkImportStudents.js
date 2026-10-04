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
  const inputFilePath = args[0] || path.join(__dirname, '../data/students_sample.json');

  console.log(`\n======================================================`);
  console.log(`🚀 COLLEGE DSA RANKBOARD — BULK STUDENT IMPORT (SUPABASE)`);
  console.log(`======================================================`);
  console.log(`Reading input file from: ${inputFilePath}\n`);

  if (!fs.existsSync(inputFilePath)) {
    console.error(`❌ Error: File not found at ${inputFilePath}`);
    console.log(`\nUsage examples:`);
    console.log(`  node scripts/bulkImportStudents.js data/students.json`);
    console.log(`  node scripts/bulkImportStudents.js data/students.csv\n`);
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
    const name = item.name || `Student ${i + 1}`;
    const email = (item.email || '').trim().toLowerCase();
    const rollNumber = (item.rollNumber || item.roll_number || item.rollNo || '').trim();
    const department = item.department || 'Computer Science and Engineering';
    const year = parseInt(item.year, 10) || 3;

    const leetcodeInput = item.leetcodeUrl || item.leetcode || '';
    const gfgInput = item.gfgUrl || item.gfg || '';
    const codeforcesInput = item.codeforcesUrl || item.codeforces || '';
    const codechefInput = item.codechefUrl || item.codechef || '';

    if (!email) {
      console.warn(`⚠️  [Record #${i + 1}] Skipping record without email: "${name}"`);
      failCount++;
      continue;
    }

    console.log(`[${i + 1}/${rawStudents.length}] Processing: ${name} (${email})...`);

    // Parse handles
    const lcHandle = parseLeetCodeUrl(leetcodeInput);
    const gfgHandle = parseGFGUrl(gfgInput);
    const cfHandle = parseCodeforcesUrl(codeforcesInput);
    const ccHandle = parseCodeChefUrl(codechefInput);

    const platforms = {
      leetcode: {
        profileUrl: lcHandle ? formatCanonicalUrl('leetcode', lcHandle) : '',
        username: lcHandle || '',
        status: lcHandle ? 'PENDING' : 'NOT_CONNECTED',
        lastFetchedAt: null,
        errorMessage: null,
      },
      gfg: {
        profileUrl: gfgHandle ? formatCanonicalUrl('gfg', gfgHandle) : '',
        username: gfgHandle || '',
        status: gfgHandle ? 'PENDING' : 'NOT_CONNECTED',
        lastFetchedAt: null,
        errorMessage: null,
      },
      codeforces: {
        profileUrl: cfHandle ? formatCanonicalUrl('codeforces', cfHandle) : '',
        username: cfHandle || '',
        status: cfHandle ? 'PENDING' : 'NOT_CONNECTED',
        lastFetchedAt: null,
        errorMessage: null,
      },
      codechef: {
        profileUrl: ccHandle ? formatCanonicalUrl('codechef', ccHandle) : '',
        username: ccHandle || '',
        status: ccHandle ? 'PENDING' : 'NOT_CONNECTED',
        lastFetchedAt: null,
        errorMessage: null,
      },
    };

    const platformStats = {
      leetcode: null,
      gfg: null,
      codeforces: null,
      codechef: null,
    };

    // Fetch stats for configured platforms
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
        await sleep(350); // slight throttle
      }
    }

    // Evaluate composite scores
    const scoreResults = evaluateStudentScores(platformStats);
    const finalScore = scoreResults.finalScore;

    // Check existing student
    let docId = `import_${Buffer.from(email).toString('hex').slice(0, 24)}`;
    try {
      const existing = await getStudentById(email);
      if (existing) {
        docId = existing.id;
      }
    } catch (queryErr) {
      // fallback to generated docId
    }

    const studentRecord = {
      id: docId,
      clerkUserId: docId.startsWith('user_') ? docId : null,
      collegeId: config.COLLEGE_ID,
      name,
      email,
      rollNumber,
      department,
      year,
      profilePhoto: '',
      role: 'STUDENT',
      accountStatus: 'ACTIVE',
      profileCompleted: !!(lcHandle && gfgHandle && cfHandle && ccHandle && rollNumber),
      finalScore,
      scores: scoreResults,
      platforms,
      platformStats,
      updatedAt: new Date().toISOString(),
      lastDataUpdatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    try {
      await upsertStudent(studentRecord);
      console.log(`   ✓ Saved: Overall Score = ${finalScore.toFixed(2)}`);
      successCount++;
    } catch (saveErr) {
      console.error(`   ✗ Supabase Save Error for ${email}:`, saveErr.message);
      failCount++;
    }
  }

  console.log(`\nRecalculating college rankings for "${config.COLLEGE_ID}"...`);
  const rankSummary = await recalculateCollegeRankings(config.COLLEGE_ID);
  console.log(`✓ College rankings updated across ${rankSummary.totalStudents} students.\n`);

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
