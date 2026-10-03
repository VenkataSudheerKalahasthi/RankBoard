const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');

// Public Leaderboard Endpoint
router.get('/', leaderboardController.getLeaderboard);

module.exports = router;
