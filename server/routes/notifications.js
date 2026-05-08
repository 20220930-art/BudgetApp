const express = require('express');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/notifications
 * Get recent notifications.
 * @returns {Array} Recent notifications (max 20)
 */
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.findRecent(req.userId);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read.
 * @param {number} req.params.id - Notification ID
 * @returns {Object} Updated notification
 */
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.markAsRead(req.params.id, req.userId);
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read.
 * @returns {Object} { message: 'All marked as read' }
 */
router.put('/read-all', async (req, res) => {
  try {
    await Notification.markAllAsRead(req.userId);
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
