const User   = require('../models/User');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');
const { deleteFromCloudinary } = require('../config/cloudinary');

/**
 * @route  GET /api/client/profile
 * @access Private (Client)
 */
exports.getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).select('-otp -password');
  return sendSuccess(res, 200, 'Profile fetched', { user });
});

/**
 * @route  PUT /api/client/profile
 * @access Private (Client)
 */
exports.updateProfile = catchAsync(async (req, res) => {
  const allowedFields = { name: req.body.name, email: req.body.email };
  Object.keys(allowedFields).forEach(k => {
    if (allowedFields[k] === undefined) delete allowedFields[k];
  });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    allowedFields,
    { new: true, runValidators: true }
  ).select('-otp -password');

  return sendSuccess(res, 200, 'Profile updated', { user });
});

/**
 * @route  POST /api/client/upload-avatar
 * @desc   Upload client profile picture via Cloudinary
 * @access Private (Client)
 */
exports.uploadAvatar = catchAsync(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Please upload an image');

  const user = await User.findById(req.user._id);

  // Delete old avatar from Cloudinary if it exists
  if (user.profileImage?.publicId) {
    await deleteFromCloudinary(user.profileImage.publicId);
  }

  user.profileImage = {
    url:      req.file.path,
    publicId: req.file.filename
  };
  await user.save();

  return sendSuccess(res, 200, 'Avatar uploaded', {
    avatarUrl: req.file.path
  });
});
