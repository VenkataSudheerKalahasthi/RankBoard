const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');

// Public Leaderboard Aggregate Stats Endpoint (Lightweight, real-time metrics)
router.get('/stats', leaderboardController.getLeaderboardStats);

// Public Leaderboard Endpoint
router.get('/', leaderboardController.getLeaderboard);

module.exports = router;
