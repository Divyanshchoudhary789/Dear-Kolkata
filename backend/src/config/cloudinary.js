const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ─── Allowed MIME types (validated before upload reaches Cloudinary) ──────────
const IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const DOC_MIMES   = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

function makeFileFilter(allowedMimes) {
  return (_req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: ${allowedMimes.join(', ')}`), false);
    }
  };
}

// Storage for product images
const productStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'dear-kolkata/products',
    // format is derived from the uploaded file — no allow_formats restriction needed
    // because we already gate by mimetype in fileFilter above
    transformation: [{ width: 1000, height: 1000, crop: 'limit', quality: 'auto' }]
  }
});

// Storage for vendor documents
const vendorStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'dear-kolkata/vendors',
    resource_type: 'auto'
  }
});

// Storage for user profile pictures
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'dear-kolkata/profiles',
    transformation: [{ width: 500, height: 500, crop: 'fill', gravity: 'face', quality: 'auto' }]
  }
});

// Multer instances
const productUpload = multer({
  storage: productStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: makeFileFilter(IMAGE_MIMES)
});

const vendorUpload = multer({
  storage: vendorStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: makeFileFilter(DOC_MIMES)
});

const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: makeFileFilter(IMAGE_MIMES)
});

// Helper function to delete from cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return false;
  }
};

module.exports = {
  cloudinary,
  productUpload,
  vendorUpload,
  profileUpload,
  deleteFromCloudinary
};
