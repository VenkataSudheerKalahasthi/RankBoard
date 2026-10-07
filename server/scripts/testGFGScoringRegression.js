const {
  calculateGFGScore,
  calculateFinalScore,
  evaluateStudentScores,
} = require('../src/services/scoring');
const { SCORING_WEIGHTS } = require('../src/services/scoring/scoringConfig');

console.log('================================================================');
console.log('🧪 DSA RANKBOARD — GEEKSFORGEEKS GLOBAL SCORING REGRESSION SUITE');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assertEqual(actual, expected, testName) {
  totalTests++;
  const roundedActual = Math.round(Number(actual) * 100) / 100;
  const roundedExpected = Math.round(Number(expected) * 100) / 100;

  if (roundedActual === roundedExpected) {
    console.log(`✅ [PASS] ${testName}: ${roundedActual}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    console.error(`   Expected: ${roundedExpected}`);
    console.error(`   Actual:   ${roundedActual}`);
  }
}

// -----------------------------------------------------------------------------
// TEST 1: User Profile Regression Test
// Easy + Medium + Hard = 9, School = 15, Basic = 14, Total = 38
// Easy = 4, Medium = 3, Hard = 2 (Total scored problems = 9)
// -----------------------------------------------------------------------------
const profileSample = {
  status: 'SUCCESS',
  schoolSolved: 15,
  basicSolved: 14,
  easySolved: 4,
  mediumSolved: 3,
  hardSolved: 2,
  totalSolved: 38,
};

// Expected GFG Score = (4 * 0.30) + (3 * 0.40) + (2 * 0.30) = 1.20 + 1.20 + 0.60 = 3.00
const gfgScore1 = calculateGFGScore(profileSample);
assertEqual(gfgScore1, 3.00, 'Test 1 - GFG Score calculation using only Easy(4), Med(3), Hard(2)');

// GFG Overall Contribution (30% weight) = 3.00 * 0.30 = 0.90
const evalResult1 = evaluateStudentScores({ gfg: profileSample });
assertEqual(evalResult1.gfgScore, 3.00, 'Test 1b - Evaluate student scores GFG Score');
assertEqual(evalResult1.breakdown.gfgContribution, 0.90, 'Test 1c - GFG Overall Contribution (30%)');

// -----------------------------------------------------------------------------
// TEST 2: High School and Basic problems do NOT inflate score
// School = 500, Basic = 500, Easy = 10, Medium = 10, Hard = 10
// -----------------------------------------------------------------------------
const highSchoolBasicSample = {
  status: 'SUCCESS',
  schoolSolved: 500,
  basicSolved: 500,
  easySolved: 10,
  mediumSolved: 10,
  hardSolved: 10,
  totalSolved: 1030,
};

// Expected: (10 * 0.30) + (10 * 0.40) + (10 * 0.30) = 3 + 4 + 3 = 10.00
const gfgScore2 = calculateGFGScore(highSchoolBasicSample);
assertEqual(gfgScore2, 10.00, 'Test 2 - High School(500) and Basic(500) contribute 0 points');

// -----------------------------------------------------------------------------
// TEST 3: Generic Global Test Case from Spec
// School = 100, Basic = 100, Easy = 10, Medium = 20, Hard = 5
// -----------------------------------------------------------------------------
const genericTestSample = {
  status: 'SUCCESS',
  schoolSolved: 100,
  basicSolved: 100,
  easySolved: 10,
  mediumSolved: 20,
  hardSolved: 5,
  totalSolved: 235,
};

// Expected: (10 * 0.30) + (20 * 0.40) + (5 * 0.30) = 3.00 + 8.00 + 1.50 = 12.50
const gfgScore3 = calculateGFGScore(genericTestSample);
assertEqual(gfgScore3, 12.50, 'Test 3 - Generic test case GFG Score (12.50)');

// -----------------------------------------------------------------------------
// TEST 4: Missing or failed status returns 0
// -----------------------------------------------------------------------------
assertEqual(calculateGFGScore(null), 0, 'Test 4a - Null stats returns 0');
assertEqual(calculateGFGScore({ status: 'FAILED' }), 0, 'Test 4b - Failed status returns 0');
assertEqual(calculateGFGScore({ status: 'SUCCESS', easySolved: 0, mediumSolved: 0, hardSolved: 0, totalSolved: 100 }), 0, 'Test 4c - Zero Easy/Med/Hard with Total=100 returns 0');

console.log(`\n================================================================`);
console.log(`📊 TEST SUITE SUMMARY: ${passedTests}/${totalTests} tests passed`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
