const { SCORING_WEIGHTS } = require('./scoringConfig');
const {
  calculateLeetCodeScore,
  calculateGFGScore,
  calculateCodeforcesScore,
  calculateCodeChefScore,
  calculateFinalScore,
  evaluateStudentScores,
} = require('./scoringEngine');

module.exports = {
  SCORING_WEIGHTS,
  calculateLeetCodeScore,
  calculateGFGScore,
  calculateCodeforcesScore,
  calculateCodeChefScore,
  calculateFinalScore,
  evaluateStudentScores,
};
