const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notebook: { type: mongoose.Schema.Types.ObjectId, ref: 'Notebook', default: null },
  front: { type: String, required: true, trim: true },
  back: { type: String, required: true, trim: true },
  // Spaced repetition fields (SM-2 algorithm)
  easeFactor: { type: Number, default: 2.5 },
  interval: { type: Number, default: 0 }, // days
  repetitions: { type: Number, default: 0 },
  nextReview: { type: Date, default: Date.now },
  lastReview: { type: Date, default: null },
  // Quality rating from last review (0-5)
  lastQuality: { type: Number, default: 0 },
  isMastered: { type: Boolean, default: false },
}, { timestamps: true });

flashcardSchema.index({ owner: 1 });
flashcardSchema.index({ owner: 1, notebook: 1 });
flashcardSchema.index({ owner: 1, nextReview: 1 });

module.exports = mongoose.model('Flashcard', flashcardSchema);
