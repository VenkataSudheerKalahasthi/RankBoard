const express = require('express');
const router = express.Router();
const multer = require('multer');
const showcaseController = require('../controllers/showcaseController');
const { requireAuth } = require('../middleware/clerkAuth');

// Configure Multer for in-memory file handling (max 5MB image)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WEBP, GIF) are allowed.'));
    }
  },
});

// ==============================================================================
// 1. PUBLIC SHOWCASE ENDPOINTS
// ==============================================================================

// Publicly viewable achievement showcase (no login required, returns sanitized metrics)
router.get('/:studentId', showcaseController.getPublicShowcase);

// ==============================================================================
// 2. AUTHENTICATED STUDENT SHOWCASE ENDPOINTS
// ==============================================================================

// Current student preview & settings
router.get('/me/preview', requireAuth, showcaseController.getMyShowcase);

// Secure profile image upload to Cloudinary CDN
router.post(
  '/profile-image',
  requireAuth,
  upload.single('image'),
  showcaseController.uploadProfileImage
);

// Update showcase visibility and bio
router.put('/settings', requireAuth, showcaseController.updateShowcaseSettings);

module.exports = router;
