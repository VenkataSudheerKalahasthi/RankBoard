/**
 * ==============================================================================
 * SCORING ENGINE CONFIGURATION & WEIGHT ALLOCATIONS (OFFICIAL FORMULA)
 * ==============================================================================
 * Overall Platform Scoring Weights (Total: 100%):
 * - LeetCode:      40% (0.40)
 * - GeeksforGeeks: 30% (0.30)
 * - HackerRank:    30% (0.30)
 * - Codeforces:     0% (0.00) -> Statistics-only platform
 * - CodeChef:       0% (0.00) -> Statistics-only platform
 * 
 * LeetCode Internal Weights:
 * - Easy:   30% (0.30)
 * - Medium: 40% (0.40)
 * - Hard:   30% (0.30)
 * ==============================================================================
 */

const SCORING_WEIGHTS = {
  LEETCODE: {
    OVERALL: 0.40,
    EASY: 0.30,   // 30%
    MEDIUM: 0.40, // 40%
    HARD: 0.30,   // 30%
    IS_SCORING: true,
  },
  GFG: {
    OVERALL: 0.30, // 30% Platform weight in Rankboard
    EASY: 0.30,    // 30% of GFG component
    MEDIUM: 0.40,  // 40% of GFG component
    HARD: 0.30,    // 30% of GFG component
    SCHOOL: 0.00,  // 0% (Display / Statistics only)
    BASIC: 0.00,   // 0% (Display / Statistics only)
    IS_SCORING: true,
  },
  HACKERRANK: {
    OVERALL: 0.30, // 30%
    IS_SCORING: true,
  },
  CODEFORCES: {
    OVERALL: 0.00, // 0% (Statistics only)
    IS_SCORING: false,
  },
  CODECHEF: {
    OVERALL: 0.00, // 0% (Statistics only)
    IS_SCORING: false,
  },
};

module.exports = {
  SCORING_WEIGHTS,
};

