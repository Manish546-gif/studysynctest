const mongoose = require('mongoose');

const TrackSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  artist: { type: String, default: 'Unknown Artist' },
  duration: { type: Number, default: 0 },
  durationText: { type: String, default: '0:00' },
  thumbnail: { type: String, default: '' },
  artwork: { type: String, default: '' },
  videoId: { type: String },
  audioUrl: { type: String },
  source: { type: String, enum: ['youtube', 'audius', 'theme'], default: 'youtube' },
  addedAt: { type: Date, default: Date.now },
});

const PlaylistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    color: {
      type: String,
      default: '#53fc18',
    },
    icon: {
      type: String,
      default: 'headphones',
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    tracks: [TrackSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Playlist', PlaylistSchema);
