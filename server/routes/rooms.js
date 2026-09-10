const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Room = require('../models/Room');
const User = require('../models/User');
const auth = require('../middleware/auth');

const findRoomByIdOrCode = async (idOrCode) => {
  if (!idOrCode) return null;
  const str = String(idOrCode).trim();
  if (mongoose.Types.ObjectId.isValid(str)) {
    const room = await Room.findById(str);
    if (room) return room;
  }
  return Room.findOne({ code: str.toUpperCase() });
};

const findPopulatedRoom = async (idOrCode) => {
  if (!idOrCode) return null;
  const str = String(idOrCode).trim();
  const query = mongoose.Types.ObjectId.isValid(str)
    ? { _id: str }
    : { code: str.toUpperCase() };
  return Room.findOne(query)
    .populate('host', 'name username email avatar')
    .populate('members', 'name username email avatar');
};

router.post('/', auth, async (req, res) => {
  try {
    const { name, description, tag, isPublic } = req.body;
    if (!name) return res.status(400).json({ error: 'Room name is required' });

    const room = await Room.create({
      name,
      description: description || '',
      tag: tag || 'Study',
      host: req.user._id,
      originalHost: req.user._id,
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
    const activeRoomsMap = req.app.get('activeRooms');
    const rooms = await Room.find({
      $or: [{ host: req.user._id }, { members: req.user._id }],
    })
      .populate('host', 'name username email avatar')
      .populate('members', 'name username email avatar')
      .sort({ updatedAt: -1 });

    const roomsWithLiveStatus = rooms.map((room) => {
      const roomIdStr = room._id.toString();
      const activeCount = activeRoomsMap?.get(roomIdStr)?.size || 0;
      const isLive = activeCount > 0;
      const rObj = room.toObject();
      return {
        ...rObj,
        activeUsersCount: activeCount,
        isLive,
      };
    });

    res.json({ rooms: roomsWithLiveStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const room = await findPopulatedRoom(req.params.id);
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

    const room = await findRoomByIdOrCode(req.params.id);
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
    const room = await findRoomByIdOrCode(req.params.id);
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
    const room = await findRoomByIdOrCode(req.params.id);
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
    const room = await findRoomByIdOrCode(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the host can delete this room' });
    }

    await Room.findByIdAndDelete(room._id);
    res.json({ message: 'Room deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/theme', auth, async (req, res) => {
  try {
    const room = await findRoomByIdOrCode(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the host can change the theme' });
    }
    const { accentColor } = req.body;
    if (!accentColor || !/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
      return res.status(400).json({ error: 'Invalid accent color (must be hex, e.g. #53fc18)' });
    }
    room.theme = { accentColor };
    await room.save();
    res.json({ theme: room.theme, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
