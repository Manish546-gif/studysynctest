const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET /api/friends — list accepted friends with basic info
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friends', 'name username avatar')
      .populate('friendRequests.from', 'name username avatar');
    res.json({
      friends: user.friends || [],
      requests: user.friendRequests || [],
      sentRequests: user.sentRequests || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/friends/request/:userId — send a friend request
router.post('/request/:userId', auth, async (req, res) => {
  try {
    const targetId = req.params.userId;
    if (targetId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot send request to yourself' });
    }
    const [me, target] = await Promise.all([
      User.findById(req.user._id),
      User.findById(targetId),
    ]);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (me.friends.some((f) => f.toString() === targetId)) {
      return res.status(400).json({ error: 'Already friends' });
    }
    if (me.sentRequests.some((id) => id.toString() === targetId)) {
      return res.status(400).json({ error: 'Request already sent' });
    }
    if (target.friendRequests.some((r) => r.from.toString() === req.user._id.toString())) {
      return res.status(400).json({ error: 'Request already sent' });
    }
    me.sentRequests.push(targetId);
    target.friendRequests.push({ from: req.user._id, sentAt: new Date() });
    await Promise.all([me.save(), target.save()]);
    res.json({ message: 'Friend request sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/friends/accept/:userId — accept a friend request
router.post('/accept/:userId', auth, async (req, res) => {
  try {
    const fromId = req.params.userId;
    const [me, sender] = await Promise.all([
      User.findById(req.user._id),
      User.findById(fromId),
    ]);
    if (!sender) return res.status(404).json({ error: 'User not found' });
    const reqIdx = me.friendRequests.findIndex((r) => r.from.toString() === fromId);
    if (reqIdx === -1) return res.status(400).json({ error: 'No request from this user' });

    // Add to each other's friends list
    me.friendRequests.splice(reqIdx, 1);
    if (!me.friends.some((f) => f.toString() === fromId)) me.friends.push(fromId);

    const sentIdx = sender.sentRequests.findIndex((id) => id.toString() === req.user._id.toString());
    if (sentIdx !== -1) sender.sentRequests.splice(sentIdx, 1);
    if (!sender.friends.some((f) => f.toString() === req.user._id.toString())) {
      sender.friends.push(req.user._id);
    }

    await Promise.all([me.save(), sender.save()]);
    const populated = await User.findById(fromId).select('name username avatar');
    res.json({ message: 'Friend request accepted', friend: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/friends/decline/:userId — decline a friend request
router.post('/decline/:userId', auth, async (req, res) => {
  try {
    const fromId = req.params.userId;
    const [me, sender] = await Promise.all([
      User.findById(req.user._id),
      User.findById(fromId),
    ]);
    if (!sender) return res.status(404).json({ error: 'User not found' });

    me.friendRequests = me.friendRequests.filter((r) => r.from.toString() !== fromId);
    const sentIdx = sender.sentRequests.findIndex((id) => id.toString() === req.user._id.toString());
    if (sentIdx !== -1) sender.sentRequests.splice(sentIdx, 1);

    await Promise.all([me.save(), sender.save()]);
    res.json({ message: 'Request declined' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/friends/:userId — unfriend
router.delete('/:userId', auth, async (req, res) => {
  try {
    const otherId = req.params.userId;
    const [me, other] = await Promise.all([
      User.findById(req.user._id),
      User.findById(otherId),
    ]);
    if (!other) return res.status(404).json({ error: 'User not found' });
    me.friends = me.friends.filter((f) => f.toString() !== otherId);
    other.friends = other.friends.filter((f) => f.toString() !== req.user._id.toString());
    await Promise.all([me.save(), other.save()]);
    res.json({ message: 'Unfriended' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/friends/search?q= — search users to add as friends
router.get('/search', auth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 2) return res.json({ users: [] });
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
      ],
    }).select('name username avatar').limit(10);
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
