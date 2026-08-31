const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const auth = require('../middleware/auth');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const avatarDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

function downloadGoogleAvatar(url, userId) {
  return new Promise((resolve, reject) => {
    const filename = `google-${userId}-${Date.now()}.jpg`;
    const filePath = path.join(avatarDir, filename);
    const file = fs.createWriteStream(filePath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(filePath, () => {});
        return reject(new Error(`Failed to fetch avatar: ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(`/uploads/avatars/${filename}`); });
    }).on('error', (err) => {
      file.close();
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '.jpg').toLowerCase();
      cb(null, `${req.user._id}-${Date.now()}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
  limits: { fileSize: 2 * 1024 * 1024 },
});

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Shared Google sign-in: find existing user by googleId/email or create one.
async function ensureUsername(user) {
  if (!user || (user.username && user.username.trim())) return user;
  const base = (user.email ? user.email.split('@')[0] : 'user')
    .replace(/[^a-z0-9_.]/gi, '')
    .replace(/_+/g, '_')
    .slice(0, 24)
    .toLowerCase() || 'user';
  let candidate = base;
  let i = 1;
  while (true) {
    const exists = await User.findOne({ username: candidate, _id: { $ne: user._id } });
    if (!exists) break;
    candidate = `${base}_${i}`;
    i += 1;
  }
  user.username = candidate;
  await user.save();
  return user;
}

async function generateUniqueUsername(email) {
  const base = (email ? email.split('@')[0] : 'user')
    .replace(/[^a-z0-9_.]/gi, '')
    .replace(/_+/g, '_')
    .slice(0, 24)
    .toLowerCase() || 'user';
  let candidate = base;
  let i = 1;
  for (;;) {
    const exists = await User.findOne({ username: candidate });
    if (!exists) return candidate;
    candidate = `${base}_${i}`;
    i += 1;
  }
}

async function findOrCreateGoogleUser({ googleId, email, name, picture }) {
  let user = await User.findOne({ $or: [{ googleId }, { email }] });

  let avatarUrl = user?.avatar || '';
  if (picture && (!user || !user.avatar || user.avatar.startsWith('https://'))) {
    try {
      avatarUrl = await downloadGoogleAvatar(picture, user?._id || googleId);
    } catch {
      avatarUrl = user?.avatar || '';
    }
  }

  if (user) {
    user.googleId = googleId;
    user.avatar = avatarUrl || user.avatar || '';
    if (!user.username || !user.username.trim()) {
      user.username = await generateUniqueUsername(email);
    }
    await user.save();
  } else {
    const username = await generateUniqueUsername(email);
    user = await User.create({ name, email, googleId, username, avatar: avatarUrl || '' });
  }
  return await ensureUsername(user);
}

function isAllowedRedirectUri(redirectUri) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : null;
  if (!allowedOrigins || allowedOrigins.includes('*')) return true;
  try {
    const origin = new URL(redirectUri).origin;
    return allowedOrigins.some((o) => o === origin || new URL(o).origin === origin);
  } catch {
    return false;
  }
}

router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: 'Name, username, email and password are required' });
    }

    if (!/^[a-z0-9_.]{3,24}$/i.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-24 characters (letters, numbers, _ and .)' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    const userNameTaken = await User.findOne({ username: username.toLowerCase() });
    if (userNameTaken) return res.status(400).json({ error: 'Username already taken' });

    const user = await User.create({ name, username, email, password });
    const token = generateToken(user._id);
    res.status(201).json({ user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    const token = generateToken(user._id);
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', auth, async (req, res) => {
  const user = await ensureUsername(req.user);
  res.json({ user });
});

router.put('/me', auth, async (req, res) => {
  try {
    const { name, username, email } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (username) {
      if (!/^[a-z0-9_.]{3,24}$/i.test(username)) {
        return res.status(400).json({ error: 'Username must be 3-24 characters (letters, numbers, _ and .)' });
      }
      const taken = await User.findOne({ username: username.toLowerCase(), _id: { $ne: req.user._id } });
      if (taken) return res.status(400).json({ error: 'Username already taken' });
      updates.username = username.toLowerCase();
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/avatar', auth, (req, res) => {
  avatarUpload.single('avatar')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Image must be under 2MB' });
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    try {
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      const user = await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl }, { new: true }).select('-password');
      res.json({ user });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
});

// OAuth authorization-code exchange (redirect flow — no popups, no third-party cookies).
router.post('/google/exchange', async (req, res) => {
  try {
    const { code, redirectUri } = req.body;
    if (!code || !redirectUri) {
      return res.status(400).json({ error: 'code and redirectUri are required' });
    }
    if (!isAllowedRedirectUri(redirectUri)) {
      return res.status(400).json({ error: 'Redirect URI not allowed' });
    }
    if (!process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ error: 'Server missing GOOGLE_CLIENT_SECRET' });
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      console.error('Google token exchange failed:', detail);
      return res.status(401).json({ error: 'Google authorization failed' });
    }
    const { access_token } = await tokenRes.json();

    const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!infoRes.ok) {
      return res.status(401).json({ error: 'Failed to fetch Google profile' });
    }
    const profile = await infoRes.json();

    const user = await findOrCreateGoogleUser({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    });
    res.json({ user, token: generateToken(user._id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Google credential is required' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const user = await findOrCreateGoogleUser({
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    });

    const token = generateToken(user._id);
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
