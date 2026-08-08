const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Notification = require('../models/Notification');
const { sendSuccess } = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');

// ── GET /api/notifications ────────────────────────────────────────────────────
router.get('/', protect, catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  
  const [notifications, total] = await Promise.all([
    Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean(),
    Notification.countDocuments({ recipient: req.user._id })
  ]);

  return sendSuccess(res, 200, 'Notifications fetched', {
    notifications,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      limit: parseInt(limit)
    }
  });
}));

// ── GET /api/notifications/unread-count ───────────────────────────────────────
router.get('/unread-count', protect, catchAsync(async (req, res) => {
  const count = await Notification.countDocuments({
    recipient: req.user._id,
    read: false
  });
  return sendSuccess(res, 200, 'Unread count fetched', { unreadCount: count });
}));

// ── PUT /api/notifications/mark-all-read ──────────────────────────────────────
// NOTE: Must come BEFORE /:id/read so Express doesn't treat "mark-all-read" as an :id
router.put('/mark-all-read', protect, catchAsync(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, read: false },
    { read: true, readAt: new Date() }
  );
  return sendSuccess(res, 200, 'All notifications marked as read');
}));

// ── PUT /api/notifications/:id/read ───────────────────────────────────────────
router.put('/:id/read', protect, catchAsync(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { read: true, readAt: new Date() },
    { returnDocument: 'after' }
  );
  return sendSuccess(res, 200, 'Notification marked as read', { notification });
}));

// ── DELETE /api/notifications/:id ─────────────────────────────────────────────
router.delete('/:id', protect, catchAsync(async (req, res) => {
  await Notification.findOneAndDelete({
    _id: req.params.id,
    recipient: req.user._id
  });
  return sendSuccess(res, 200, 'Notification deleted');
}));

module.exports = router;
