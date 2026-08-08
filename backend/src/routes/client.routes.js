const express = require('express');
const router  = express.Router();
const cc      = require('../controllers/clientController');
const { protect, restrictTo } = require('../middleware/auth');
const { profileUpload }       = require('../config/cloudinary');

// ── Client profile ────────────────────────────────────────────────────────────
router.get('/profile',       protect, restrictTo('client'), cc.getProfile);
router.put('/profile',       protect, restrictTo('client'), cc.updateProfile);
router.post('/upload-avatar',protect, restrictTo('client'), profileUpload.single('avatar'), cc.uploadAvatar);

module.exports = router;
