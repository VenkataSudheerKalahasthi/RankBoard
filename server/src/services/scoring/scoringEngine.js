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
 * Allocation: 30%
 * 
 * @param {Object|null} stats - Normalized GFG statistics
 * @returns {number} Score
 */
const calculateGFGScore = (stats) => {
  if (!stats || stats.status !== 'SUCCESS') {
    return 0;
  }

  // ============================================================================
  // EXACT FORMULA — TBD (TO BE SUPPLIED SEPARATELY)
  // ============================================================================
  const totalSolved = stats.totalSolved || 0;
  const score = stats.rating || 0;

  const rawScore = score > 0 ? score * 0.1 : totalSolved * 1.5;
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
 * Calculates Final Combined Score using Overall Platform Weights:
 * Final Score = (LeetCode * 40%) + (GFG * 30%) + (Codeforces * 20%) + (CodeChef * 10%)
 * 
 * @param {Object} platformScores
 * @returns {number} Final combined score
 */
const calculateFinalScore = (platformScores = {}) => {
  const {
    leetcodeScore = 0,
    gfgScore = 0,
    codeforcesScore = 0,
    codechefScore = 0,
  } = platformScores;

  const finalScore = (leetcodeScore * SCORING_WEIGHTS.LEETCODE.OVERALL) +
                     (gfgScore * SCORING_WEIGHTS.GFG.OVERALL) +
                     (codeforcesScore * SCORING_WEIGHTS.CODEFORCES.OVERALL) +
                     (codechefScore * SCORING_WEIGHTS.CODECHEF.OVERALL);

  return Math.round(finalScore * 100) / 100;
};

/**
 * Evaluates all platform statistics for a student and computes breakdown + final score
 * 
 * @param {Object} platformStatsMap - { leetcode: stats, gfg: stats, codeforces: stats, codechef: stats }
 * @returns {Object} { leetcodeScore, gfgScore, codeforcesScore, codechefScore, finalScore, breakdown }
 */
const evaluateStudentScores = (platformStatsMap = {}) => {
  const leetcodeScore = calculateLeetCodeScore(platformStatsMap.leetcode);
  const gfgScore = calculateGFGScore(platformStatsMap.gfg);
  const codeforcesScore = calculateCodeforcesScore(platformStatsMap.codeforces);
  const codechefScore = calculateCodeChefScore(platformStatsMap.codechef);

  const finalScore = calculateFinalScore({
    leetcodeScore,
    gfgScore,
    codeforcesScore,
    codechefScore,
  });

  return {
    leetcodeScore,
    gfgScore,
    codeforcesScore,
    codechefScore,
    finalScore,
    breakdown: {
      leetcodeContribution: Math.round(leetcodeScore * SCORING_WEIGHTS.LEETCODE.OVERALL * 100) / 100,
      gfgContribution: Math.round(gfgScore * SCORING_WEIGHTS.GFG.OVERALL * 100) / 100,
      codeforcesContribution: Math.round(codeforcesScore * SCORING_WEIGHTS.CODEFORCES.OVERALL * 100) / 100,
      codechefContribution: Math.round(codechefScore * SCORING_WEIGHTS.CODECHEF.OVERALL * 100) / 100,
    },
  };
};

module.exports = {
  calculateLeetCodeScore,
  calculateGFGScore,
  calculateCodeforcesScore,
  calculateCodeChefScore,
  calculateFinalScore,
  evaluateStudentScores,
};
