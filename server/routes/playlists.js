const express = require('express');
const router = express.Router();
const Playlist = require('../models/Playlist');
const auth = require('../middleware/auth');

// GET /api/music/playlists - Get all playlists for logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const playlists = await Playlist.find({ user: req.user._id }).sort({ updatedAt: -1 });
    res.json({ playlists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/music/playlists - Create new playlist
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Playlist name is required' });
    }

    const playlist = new Playlist({
      user: req.user._id,
      name: name.trim(),
      description: description ? description.trim() : '',
      color: color || '#53fc18',
      icon: icon || 'headphones',
      tracks: [],
    });

    await playlist.save();
    res.status(201).json({ playlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/music/playlists/:id - Get single playlist
router.get('/:id', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findOne({
      _id: req.params.id,
      $or: [{ user: req.user._id }, { isPublic: true }],
    });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json({ playlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/music/playlists/:id - Update playlist details
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, color, icon, isPublic } = req.body;
    const playlist = await Playlist.findOne({ _id: req.params.id, user: req.user._id });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    if (name) playlist.name = name.trim();
    if (description !== undefined) playlist.description = description.trim();
    if (color) playlist.color = color;
    if (icon) playlist.icon = icon;
    if (isPublic !== undefined) playlist.isPublic = !!isPublic;

    await playlist.save();
    res.json({ playlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/music/playlists/:id/tracks - Add track to playlist
router.post('/:id/tracks', auth, async (req, res) => {
  try {
    const { track } = req.body;
    if (!track || !track.title) {
      return res.status(400).json({ error: 'Valid track object required' });
    }

    const playlist = await Playlist.findOne({ _id: req.params.id, user: req.user._id });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    // Check if duplicate track exists
    const trackId = track.id || track.videoId || `trk_${Date.now()}`;
    const exists = playlist.tracks.some(
      (t) => (t.id && t.id === trackId) || (t.videoId && track.videoId && t.videoId === track.videoId)
    );
    if (exists) {
      return res.status(400).json({ error: 'Track is already in this playlist' });
    }

    playlist.tracks.push({
      id: trackId,
      title: track.title,
      artist: track.artist || 'Unknown Artist',
      duration: track.duration || 0,
      durationText: track.durationText || '0:00',
      thumbnail: track.thumbnail || track.artwork || '',
      artwork: track.artwork || track.thumbnail || '',
      videoId: track.videoId || null,
      audioUrl: track.audioUrl || null,
      source: track.source || 'youtube',
    });

    await playlist.save();
    res.json({ playlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/music/playlists/:id/tracks/:trackId - Remove track from playlist
router.delete('/:id/tracks/:trackId', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findOne({ _id: req.params.id, user: req.user._id });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    playlist.tracks = playlist.tracks.filter(
      (t) => t.id !== req.params.trackId && t._id.toString() !== req.params.trackId && t.videoId !== req.params.trackId
    );

    await playlist.save();
    res.json({ playlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/music/playlists/:id - Delete playlist
router.delete('/:id', auth, async (req, res) => {
  try {
    const playlist = await Playlist.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json({ message: 'Playlist deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
