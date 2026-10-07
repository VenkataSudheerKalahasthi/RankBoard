const { config, validateEnv } = require('../src/config/env');
const { getAllStudents, updateStudent } = require('../src/supabase/supabaseRepository');
const { fetchPlatformProfile } = require('../src/services/platforms');
const { evaluateStudentScores } = require('../src/services/scoring');
const { recalculateCollegeRankings } = require('../src/services/ranking/rankingEngine');

validateEnv();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function refreshAllProfiles() {
  console.log('\n======================================================');
  console.log('🔄 REFRESHING REAL DATA FOR ALL STUDENTS (SUPABASE)');
  console.log('======================================================\n');

  const students = await getAllStudents();
  console.log(`Found ${students.length} students in Supabase database.\n`);

  let index = 0;
  let successCount = 0;
  let failCount = 0;

  for (const student of students) {
    index++;
    const docId = student.id;
    const name = student.name || 'Student';

    console.log(`[${index}/${students.length}] Syncing: ${name} (${student.rollNumber || student.email})...`);

    const platforms = { ...(student.platforms || {}) };
    const platformStats = { ...(student.platformStats || {}) };
    const platformKeys = ['leetcode', 'gfg', 'codeforces', 'codechef', 'hackerrank'];

    for (const key of platformKeys) {
      const p = platforms[key];
      if (p && p.username) {
        let stats = null;
        let attempts = 0;
        const maxAttempts = 2;

        while (attempts < maxAttempts) {
          attempts++;
          try {
            stats = await fetchPlatformProfile(key, p.profileUrl || p.username);
            if (stats.status === 'SUCCESS') break;
            if (stats.errorMessage && stats.errorMessage.includes('429')) {
              console.log(`   ⏳ Rate limit detected for ${key} (${p.username}), waiting 2s...`);
              await sleep(2000);
            } else {
              break;
            }
          } catch (err) {
            if (err.message && err.message.includes('429')) {
              console.log(`   ⏳ Rate limit error for ${key}, waiting 2s...`);
              await sleep(2000);
            } else {
              break;
            }
          }
        }

        if (stats && stats.status === 'SUCCESS') {
          platformStats[key] = stats;
          platforms[key].status = 'SUCCESS';
          platforms[key].lastFetchedAt = new Date().toISOString();
          platforms[key].errorMessage = null;
          console.log(`   ✓ ${key.toUpperCase()}: ${stats.totalSolved} solved${stats.rating ? ` (Rating: ${stats.rating})` : ''}`);
        } else {
          platforms[key].status = 'FAILED';
          platforms[key].errorMessage = stats?.errorMessage || 'Failed to fetch statistics';
          console.log(`   ✗ ${key.toUpperCase()}: ${platforms[key].errorMessage}`);
        }

        // Throttle between platform requests
        await sleep(350);
      }
    }

    // Evaluate composite scores
    const scoreResults = evaluateStudentScores(platformStats);
    const connectedCount = platformKeys.filter((k) => platforms[k]?.username).length;
    const profileCompleted = connectedCount === 4 && !!student.rollNumber && !!student.department;

    const updatedData = {
      platforms,
      platformStats,
      scores: scoreResults,
      finalScore: scoreResults.finalScore,
      profileCompleted,
      lastDataUpdatedAt: new Date().toISOString(),
    };

    try {
      await updateStudent(docId, updatedData);
      console.log(`   ⭐ Overall Score: ${scoreResults.finalScore.toFixed(2)}\n`);
      successCount++;
    } catch (saveErr) {
      console.error(`   ✗ Supabase Update Error for ${docId}:`, saveErr.message);
      failCount++;
    }

    // Throttle between students
    await sleep(250);
  }

  console.log('\nRecalculating college-wide dynamic rankings...');
  const rankSummary = await recalculateCollegeRankings(config.COLLEGE_ID);
  console.log(`✓ College rankings updated across ${rankSummary.totalStudents} students.\n`);

  console.log('======================================================');
  console.log(`📊 REFRESH COMPLETE: ${successCount} updated, ${failCount} failed.`);
  console.log('======================================================\n');
  process.exit(0);
}

refreshAllProfiles().catch((err) => {
  console.error('Fatal refresh error:', err);
  process.exit(1);
});
