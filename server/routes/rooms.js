const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
    const { name, description, tag, isPublic } = req.body;
    if (!name) return res.status(400).json({ error: 'Room name is required' });

    const room = await Room.create({
      name,
      description: description || '',
      tag: tag || 'Study',
      host: req.user._id,
      members: [req.user._id],
      isPublic: isPublic !== undefined ? !!isPublic : true,
    });

    const populated = await room.populate('host', 'name username email avatar');
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
      .populate('host', 'name username email avatar')
      .populate('members', 'name username email avatar')
      .sort({ updatedAt: -1 });

    res.json({ rooms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('host', 'name username email avatar')
      .populate('members', 'name username email avatar');

    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/invite', auth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (room.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the host can invite members' });
    }

    const target = await User.findOne({ username: String(username).toLowerCase().trim() });
    if (!target) return res.status(404).json({ error: 'No user found with that username' });

    if (target._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot invite yourself' });
    }
    if (room.host.toString() === target._id.toString()) {
      return res.status(400).json({ error: 'The host is already in this room' });
    }
    if (room.members.includes(target._id)) {
      return res.status(400).json({ error: 'This user is already a member' });
    }

    room.members.push(target._id);
    await room.save();

    const populated = await room.populate('host members', 'name username email avatar');
    res.json({ room: populated, invitedUser: target });
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

    const populated = await room.populate('host members', 'name username email avatar');
    res.json({ room: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the host can update this room' });
    }

    const { name, description, tag } = req.body;
    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ error: 'Room name is required' });
      room.name = String(name).trim();
    }
    if (description !== undefined) room.description = String(description).trim();
    if (tag !== undefined) room.tag = String(tag).trim();

    await room.save();

    const populated = await room.populate('host members', 'name username email avatar');
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
