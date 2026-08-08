const express = require('express');
const router  = express.Router();
const pkgc    = require('../controllers/packageController');
const { protect, restrictTo } = require('../middleware/auth');

// ── Static/prefixed FIRST ─────────────────────────────────────────────────────

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get('/admin/all',   protect, restrictTo('admin'), pkgc.getAllPackagesAdmin);
router.post('/',           protect, restrictTo('admin'), pkgc.createPackage);
router.put('/:id',         protect, restrictTo('admin'), pkgc.updatePackage);

// ── Client ────────────────────────────────────────────────────────────────────
router.post('/:id/purchase', protect, restrictTo('client'), pkgc.purchasePackage);

// ── Public (LAST) ─────────────────────────────────────────────────────────────
router.get('/',    pkgc.getAllPackages);
router.get('/:id', pkgc.getPackageById);

module.exports = router;
