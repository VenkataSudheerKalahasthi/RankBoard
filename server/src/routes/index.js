const express = require('express');
const router = express.Router();
const studentRoutes = require('./studentRoutes');
const leaderboardRoutes = require('./leaderboardRoutes');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'DSA Rankboard API',
    timestamp: new Date().toISOString(),
  });
});

// Mounted API routes (Student Portal & Public Leaderboard only)
router.use('/student', studentRoutes);
router.use('/leaderboard', leaderboardRoutes);

module.exports = router;
