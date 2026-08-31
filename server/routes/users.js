const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get('/search', auth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ users: [] });
    const query = {
      username: { $exists: true, $ne: '' },
      _id: { $ne: req.user._id },
      $or: [
        { username: { $regex: escapeRegex(q), $options: 'i' } },
        { name: { $regex: escapeRegex(q), $options: 'i' } },
      ],
    };
    const users = await User.find(query)
      .limit(10)
      .select('name username avatar email');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
