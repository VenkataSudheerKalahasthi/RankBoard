/**
 * ==============================================================================
 * SCORING ENGINE CONFIGURATION & WEIGHT ALLOCATIONS
 * ==============================================================================
 * Overall Platform Weights:
 * - LeetCode:      40%
 * - GeeksforGeeks: 30%
 * - Codeforces:    20%
 * - CodeChef:      10%
 * 
 * LeetCode Internal Weights:
 * - Easy:   30% (Overall 12%)
 * - Medium: 40% (Overall 16%)
 * - Hard:   30% (Overall 12%)
 * ==============================================================================
 */

const SCORING_WEIGHTS = {
  LEETCODE: {
    OVERALL: 0.40,
    EASY: 0.30,   // 0.40 * 0.30 = 0.12 (12%)
    MEDIUM: 0.40, // 0.40 * 0.40 = 0.16 (16%)
    HARD: 0.30,   // 0.40 * 0.30 = 0.12 (12%)
  },
  GFG: {
    OVERALL: 0.30, // 30%
  },
  CODEFORCES: {
    OVERALL: 0.20, // 20%
  },
  CODECHEF: {
    OVERALL: 0.10, // 10%
  },
};

module.exports = {
  SCORING_WEIGHTS,
};
