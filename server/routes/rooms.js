const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
    const { name, description, tag } = req.body;
    if (!name) return res.status(400).json({ error: 'Room name is required' });

    const code = await Room.generateCode();

    const room = await Room.create({
      name,
      description: description || '',
      tag: tag || 'Study',
      code,
      host: req.user._id,
      members: [req.user._id],
    });

    const populated = await room.populate('host', 'name email avatar');
    res.status(201).json({ room: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const rooms = await Room.find({
      $or: [{ host: req.user._id }, { members: req.user._id }],
    })
      .populate('host', 'name email avatar')
      .populate('members', 'name email avatar')
      .sort({ updatedAt: -1 });

    res.json({ rooms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('host', 'name email avatar')
      .populate('members', 'name email avatar');

    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/verify', auth, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Room code is required' });

    const room = await Room.findOne({ code: code.toUpperCase().trim() })
      .populate('host', 'name email avatar')
      .populate('members', 'name email avatar');

    if (!room) return res.status(404).json({ error: 'Invalid room code' });

    if (!room.members.includes(req.user._id)) {
      room.members.push(req.user._id);
      await room.save();
    }

    res.json({ room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/join', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (!room.members.includes(req.user._id)) {
      room.members.push(req.user._id);
      await room.save();
    }

    const populated = await room.populate('host members', 'name email avatar');
    res.json({ room: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the host can delete this room' });
    }

    await Room.findByIdAndDelete(req.params.id);
    res.json({ message: 'Room deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
