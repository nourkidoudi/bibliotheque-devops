const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');

// GET / - List user notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { unreadOnly, page = 1, limit = 20 } = req.query;

    const query = { userId };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /unread-count - Get unread notifications count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const count = await Notification.countDocuments({ userId, isRead: false });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /:id/read - Mark one notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification introuvable.' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /read-all - Mark all user notifications as read
router.put('/read-all', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    await Notification.updateMany({ userId, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'Toutes les notifications sont marquées comme lues.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /:id - Delete a notification
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const deleted = await Notification.findOneAndDelete({ _id: req.params.id, userId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Notification introuvable.' });
    }
    res.json({ success: true, message: 'Notification supprimée.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
