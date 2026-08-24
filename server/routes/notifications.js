const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

router.get('/', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const skip = parseInt(req.query.skip) || 0;
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('from', 'name avatar')
        .lean(),
      Notification.countDocuments({ user: req.user._id, read: false }),
    ]);
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/read', auth, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ error: 'Not found' });
    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
    res.json({ notification: notif, unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ unreadCount: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
    res.json({ unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
