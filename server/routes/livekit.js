const express = require('express');
const router = express.Router();
const { AccessToken } = require('livekit-server-sdk');
const auth = require('../middleware/auth');
const Room = require('../models/Room');

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

router.post('/token', auth, async (req, res) => {
  try {
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return res.status(500).json({ error: 'LiveKit not configured on server' });
    }

    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: 'roomId is required' });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const isMember = room.members.some((m) => m.toString() === req.user._id.toString());
    const isHost = room.host.toString() === req.user._id.toString();
    if (!isMember && !isHost) {
      return res.status(403).json({ error: 'Not a member of this room' });
    }

    const identity = req.user._id.toString();
    const roomName = roomId;

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      name: req.user.name || 'Participant',
      ttl: 60 * 60 * 4,
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canPublishSources: [1, 2, 3, 4, 5, 6, 7, 8],
    });

    const token = await at.toJwt();

    const serverUrl = LIVEKIT_URL || undefined;

    res.json({ token, url: serverUrl });
  } catch (err) {
    console.error('LiveKit token error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
