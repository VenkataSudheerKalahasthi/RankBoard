const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const platformController = require('../controllers/platformController');
const { requireAuth } = require('../middleware/clerkAuth');
const { validateBody } = require('../middleware/validate');
const { syncLimiter } = require('../middleware/rateLimiter');
const { updateProfileSchema } = require('../validators/studentValidator');
const { platformUrlsSchema } = require('../validators/platformValidator');

// All student endpoints require authenticated Clerk session
router.use(requireAuth);

// Profile
router.get('/me', studentController.getMe);
router.get('/profile', studentController.getMe);
router.put('/profile', validateBody(updateProfileSchema), studentController.updateProfile);

// Platforms & Synchronization
router.get('/platforms', platformController.getPlatforms);
router.post('/platforms/sync', syncLimiter, validateBody(platformUrlsSchema), platformController.saveAndSyncPlatforms);

// Score & Dynamic Rank
router.get('/score', studentController.getStudentScore);
router.get('/rank', studentController.getStudentRank);

module.exports = router;
