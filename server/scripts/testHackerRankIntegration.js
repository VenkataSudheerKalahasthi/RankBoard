const { parseHackerRankUrl, formatCanonicalUrl } = require('../src/utils/urlParsers');
const { fetchHackerRankProfile } = require('../src/services/platforms/hackerrankService');
const { fetchPlatformProfile } = require('../src/services/platforms');
const { evaluateStudentScores } = require('../src/services/scoring');
const { SCORING_WEIGHTS } = require('../src/services/scoring/scoringConfig');

async function testHackerRankIntegration() {
  console.log('====================================================');
  console.log('TEST 1: URL Parsing & Formatting');
  console.log('====================================================');
  const testUrls = [
    'https://www.hackerrank.com/profile/prakash_mannam',
    'https://hackerrank.com/profile/prakash_mannam?hr_r=1',
    'https://www.hackerrank.com/prakash_mannam',
    'prakash_mannam',
    '',
    null,
    'invalid#username!'
  ];

  for (const url of testUrls) {
    const handle = parseHackerRankUrl(url);
    const canonical = handle ? formatCanonicalUrl('hackerrank', handle) : '';
    console.log(`Input: "${url}" -> Handle: "${handle}" -> Canonical: "${canonical}"`);
  }

  console.log('\n====================================================');
  console.log('TEST 2: Live HackerRank Profile Fetch');
  console.log('====================================================');
  const sampleUser = 'prakash_mannam';
  console.log(`Fetching public profile for user: ${sampleUser}...`);
  try {
    const hrData = await fetchHackerRankProfile(sampleUser);
    console.log('Fetch Result:');
    console.log(JSON.stringify(hrData, null, 2));
  } catch (err) {
    console.error('Fetch error:', err.message);
  }

  console.log('\n====================================================');
  console.log('TEST 3: Platform Service Routing');
  console.log('====================================================');
  try {
    const res = await fetchPlatformProfile('hackerrank', sampleUser);
    console.log(`fetchPlatformProfile returned status: ${res.status}, totalSolved: ${res.totalSolved}`);
  } catch (err) {
    console.error('Platform router error:', err.message);
  }

  console.log('\n====================================================');
  console.log('TEST 4: Scoring Engine Weights & Evaluation');
  console.log('====================================================');
  console.log('Current Scoring Weights:');
  console.log(JSON.stringify(SCORING_WEIGHTS, null, 2));

  const sampleStats = {
    leetcode: { totalSolved: 150, easySolved: 70, mediumSolved: 60, hardSolved: 20 },
    gfg: { totalSolved: 80, rating: 210 },
    codeforces: { totalSolved: 40, rating: 1200 },
    codechef: { totalSolved: 30, rating: 1400 },
    hackerrank: { totalSolved: 50, badgesCount: 5, stars: 4 },
  };

  const scores = evaluateStudentScores(sampleStats);
  console.log('Evaluated Scores:');
  console.log(JSON.stringify(scores, null, 2));

  // Verify weights sum
  const sumWeights =
    SCORING_WEIGHTS.LEETCODE.OVERALL +
    SCORING_WEIGHTS.GFG.OVERALL +
    SCORING_WEIGHTS.CODEFORCES.OVERALL +
    SCORING_WEIGHTS.CODECHEF.OVERALL +
    (SCORING_WEIGHTS.HACKERRANK?.OVERALL || 0);

  console.log(`Total Platform Weight Sum: ${(sumWeights * 100).toFixed(0)}% (Expected 100%)`);
  if (Math.abs(sumWeights - 1.0) < 0.001) {
    console.log('✓ Scoring weights correctly maintain 100% total without HackerRank weight skewing overall score.');
  } else {
    console.error('✗ Scoring weights sum error!');
  }

  console.log('\n====================================================');
  console.log('All Integration Tests Completed');
  console.log('====================================================');
}

testHackerRankIntegration().catch(console.error);
