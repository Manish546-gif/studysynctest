const express = require('express');
const router = express.Router();
const ScheduledSession = require('../models/ScheduledSession');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Create a scheduled session
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, roomId, scheduledAt, durationMinutes, invitees, color } = req.body;
    if (!title || !scheduledAt) return res.status(400).json({ error: 'Title and scheduledAt are required' });

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) return res.status(400).json({ error: 'Invalid scheduledAt date' });

    const session = await ScheduledSession.create({
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      roomId: roomId || null,
      createdBy: req.user._id,
      scheduledAt: scheduledDate,
      durationMinutes: durationMinutes || 60,
      invitees: Array.isArray(invitees) ? invitees : [],
      color: color || '#53fc18',
    });

    const populated = await session.populate([
      { path: 'createdBy', select: 'name username avatar' },
      { path: 'invitees', select: 'name username avatar' },
      { path: 'roomId', select: 'name' },
    ]);

    res.status(201).json({ session: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's sessions (created + invited to)
router.get('/', auth, async (req, res) => {
  try {
    const sessions = await ScheduledSession.find({
      $or: [{ createdBy: req.user._id }, { invitees: req.user._id }],
    })
      .populate('createdBy', 'name username avatar')
      .populate('invitees', 'name username avatar')
      .populate('roomId', 'name')
      .sort({ scheduledAt: 1 });

    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get upcoming sessions (next 7 days)
router.get('/upcoming', auth, async (req, res) => {
  try {
    const now = new Date();
    const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sessions = await ScheduledSession.find({
      $or: [{ createdBy: req.user._id }, { invitees: req.user._id }],
      scheduledAt: { $gte: now, $lte: week },
    })
      .populate('createdBy', 'name username avatar')
      .populate('invitees', 'name username avatar')
      .populate('roomId', 'name')
      .sort({ scheduledAt: 1 });

    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a session
router.put('/:id', auth, async (req, res) => {
  try {
    const session = await ScheduledSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the creator can edit this session' });
    }
    const { title, description, scheduledAt, durationMinutes, invitees, color } = req.body;
    if (title) session.title = String(title).trim();
    if (description !== undefined) session.description = String(description).trim();
    if (scheduledAt) session.scheduledAt = new Date(scheduledAt);
    if (durationMinutes) session.durationMinutes = durationMinutes;
    if (invitees) session.invitees = invitees;
    if (color) session.color = color;
    await session.save();
    const populated = await session.populate([
      { path: 'createdBy', select: 'name username avatar' },
      { path: 'invitees', select: 'name username avatar' },
      { path: 'roomId', select: 'name' },
    ]);
    res.json({ session: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a session
router.delete('/:id', auth, async (req, res) => {
  try {
    const session = await ScheduledSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the creator can delete this session' });
    }
    await ScheduledSession.findByIdAndDelete(req.params.id);
    res.json({ message: 'Session deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
