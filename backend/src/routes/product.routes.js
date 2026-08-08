const express = require('express');
const router  = express.Router();
const pc      = require('../controllers/productController');
const { protect, attachVendor } = require('../middleware/auth');
const { productUpload }         = require('../config/cloudinary');

// ── Static/prefixed routes FIRST ─────────────────────────────────────────────

// ── Vendor ────────────────────────────────────────────────────────────────────
router.get('/vendor/my-products',   protect, attachVendor, pc.getVendorProducts);
router.post('/',                    protect, attachVendor, pc.createProduct);
router.put('/:id',                  protect, pc.updateProduct);
router.delete('/:id',               protect, pc.deleteProduct);
router.post('/:id/upload-images',   protect, attachVendor, productUpload.array('images', 5), pc.uploadImages);
router.delete('/:id/images/:publicId', protect, attachVendor, pc.deleteImage);

// ── Public (LAST) ─────────────────────────────────────────────────────────────
router.get('/',    pc.getAllProducts);
router.get('/:id', pc.getProductById);

module.exports = router;
