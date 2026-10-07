const express = require('express');
const router = express.Router();
const studentRoutes = require('./studentRoutes');
const leaderboardRoutes = require('./leaderboardRoutes');
const adminRoutes = require('./adminRoutes');
const showcaseRoutes = require('./showcaseRoutes');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'DSA Rankboard API',
    timestamp: new Date().toISOString(),
  });
});

// Mounted API routes
router.use('/student', studentRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/admin', adminRoutes);
router.use('/showcase', showcaseRoutes);

module.exports = router;
