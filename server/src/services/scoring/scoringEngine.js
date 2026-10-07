const { SCORING_WEIGHTS } = require('./scoringConfig');

/**
 * ==============================================================================
 * MODULAR PLATFORM SCORING ENGINE
 * ==============================================================================
 * Weight allocation rules are configured in scoringConfig.js.
 * The functions below are completely isolated and ready for the exact formula
 * implementation when provided.
 * ==============================================================================
 */

/**
 * Calculates LeetCode Platform Score
 * Allocation: 40% (Easy 12%, Medium 16%, Hard 12%)
 * 
 * @param {Object|null} stats - Normalized LeetCode statistics
 * @returns {number} Score (0 to 100 or weighted score)
 */
const calculateLeetCodeScore = (stats) => {
  if (!stats || stats.status !== 'SUCCESS') {
    return 0;
  }

  // ============================================================================
  // EXACT FORMULA — TBD (TO BE SUPPLIED SEPARATELY)
  // Baseline modular implementation utilizing defined easy/medium/hard allocations:
  // ============================================================================
  const easy = stats.easySolved || 0;
  const medium = stats.mediumSolved || 0;
  const hard = stats.hardSolved || 0;

  // Placeholder formula structured around the defined weights (30% Easy, 40% Med, 30% Hard)
  // Normalization will be replaced when final formula is provided
  const rawScore = (easy * SCORING_WEIGHTS.LEETCODE.EASY) +
                   (medium * SCORING_WEIGHTS.LEETCODE.MEDIUM) +
                   (hard * SCORING_WEIGHTS.LEETCODE.HARD);

  return Math.round(rawScore * 100) / 100;
};

/**
 * Calculates GeeksforGeeks Platform Score
 * Allocation: 30% Overall Platform Weight in Rankboard
 * Internal Weights: Easy (30%), Medium (40%), Hard (30%)
 * School and Basic are Display / Statistics-only (0% score contribution)
 * 
 * @param {Object|null} stats - Normalized GFG statistics
 * @returns {number} Normalized GFG Score
 */
const calculateGFGScore = (stats) => {
  if (!stats || stats.status !== 'SUCCESS') {
    return 0;
  }

  // Strictly extract Easy, Medium, and Hard problem solves
  const easy = Number(stats.easySolved || 0);
  const medium = Number(stats.mediumSolved || 0);
  const hard = Number(stats.hardSolved || 0);

  // GFG Internal Distribution: Easy (30%), Medium (40%), Hard (30%)
  // School and Basic are NEVER scored (0%)
  // totalSolved is NEVER used as a scoring input
  const rawScore = (easy * SCORING_WEIGHTS.GFG.EASY) +
                   (medium * SCORING_WEIGHTS.GFG.MEDIUM) +
                   (hard * SCORING_WEIGHTS.GFG.HARD);

  return Math.round(rawScore * 100) / 100;
};

/**
 * Calculates Codeforces Platform Score
 * Allocation: 20%
 * 
 * @param {Object|null} stats - Normalized Codeforces statistics
 * @returns {number} Score
 */
const calculateCodeforcesScore = (stats) => {
  if (!stats || stats.status !== 'SUCCESS') {
    return 0;
  }

  // ============================================================================
  // EXACT FORMULA — TBD (TO BE SUPPLIED SEPARATELY)
  // ============================================================================
  const rating = stats.rating || 0;
  const solved = stats.totalSolved || 0;

  const rawScore = (rating * 0.1) + (solved * 1.2);
  return Math.round(rawScore * 100) / 100;
};

/**
 * Calculates CodeChef Platform Score
 * Allocation: 10%
 * 
 * @param {Object|null} stats - Normalized CodeChef statistics
 * @returns {number} Score
 */
const calculateCodeChefScore = (stats) => {
  if (!stats || stats.status !== 'SUCCESS') {
    return 0;
  }

  // ============================================================================
  // EXACT FORMULA — TBD (TO BE SUPPLIED SEPARATELY)
  // ============================================================================
  const rating = stats.rating || 0;
  const solved = stats.totalSolved || 0;

  const rawScore = (rating * 0.08) + (solved * 1.0);
  return Math.round(rawScore * 100) / 100;
};

/**
 * Calculates HackerRank Platform Score
 * Allocation: 0% currently (informational / stored), extensible when weight is assigned
 * 
 * @param {Object|null} stats - Normalized HackerRank statistics
 * @returns {number} Score
 */
const calculateHackerRankScore = (stats) => {
  if (!stats || stats.status !== 'SUCCESS') {
    return 0;
  }

  const solved = stats.totalSolved || 0;
  const stars = stats.stars || 0;
  const badges = stats.badges || 0;

  const rawScore = (solved * 1.0) + (stars * 2.0) + (badges * 5.0);
  return Math.round(rawScore * 100) / 100;
};

/**
 * Calculates Final Combined Score using Official Overall Platform Weights:
 * Final Score = (LeetCode * 40%) + (GFG * 30%) + (HackerRank * 30%)
 * Codeforces (0%) and CodeChef (0%) are statistics-only platforms and do not affect the score.
 * 
 * @param {Object} platformScores
 * @returns {number} Final combined score
 */
const calculateFinalScore = (platformScores = {}) => {
  const {
    leetcodeScore = 0,
    gfgScore = 0,
    hackerrankScore = 0,
  } = platformScores;

  const finalScore = (leetcodeScore * SCORING_WEIGHTS.LEETCODE.OVERALL) +
                     (gfgScore * SCORING_WEIGHTS.GFG.OVERALL) +
                     (hackerrankScore * SCORING_WEIGHTS.HACKERRANK.OVERALL);

  return Math.round(finalScore * 100) / 100;
};

/**
 * Evaluates all platform statistics for a student and computes breakdown + final score
 * 
 * @param {Object} platformStatsMap - { leetcode: stats, gfg: stats, codeforces: stats, codechef: stats, hackerrank: stats }
 * @returns {Object} { leetcodeScore, gfgScore, codeforcesScore, codechefScore, hackerrankScore, finalScore, breakdown }
 */
const evaluateStudentScores = (platformStatsMap = {}) => {
  const leetcodeScore = calculateLeetCodeScore(platformStatsMap.leetcode);
  const gfgScore = calculateGFGScore(platformStatsMap.gfg);
  const hackerrankScore = calculateHackerRankScore(platformStatsMap.hackerrank);
  
  // Codeforces and CodeChef are statistics-only (0% weight)
  const codeforcesScore = 0;
  const codechefScore = 0;

  const finalScore = calculateFinalScore({
    leetcodeScore,
    gfgScore,
    hackerrankScore,
  });

  return {
    leetcodeScore,
    gfgScore,
    codeforcesScore: 0,
    codechefScore: 0,
    hackerrankScore,
    finalScore,
    breakdown: {
      leetcodeContribution: Math.round(leetcodeScore * SCORING_WEIGHTS.LEETCODE.OVERALL * 100) / 100,
      gfgContribution: Math.round(gfgScore * SCORING_WEIGHTS.GFG.OVERALL * 100) / 100,
      hackerrankContribution: Math.round(hackerrankScore * SCORING_WEIGHTS.HACKERRANK.OVERALL * 100) / 100,
      codeforcesContribution: 0,
      codechefContribution: 0,
    },
  };
};

module.exports = {
  calculateLeetCodeScore,
  calculateGFGScore,
  calculateCodeforcesScore,
  calculateCodeChefScore,
  calculateHackerRankScore,
  calculateFinalScore,
  evaluateStudentScores,
};

