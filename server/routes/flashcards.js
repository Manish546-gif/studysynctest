const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Flashcard = require('../models/Flashcard');

// Get all flashcards for user
router.get('/', auth, async (req, res) => {
  try {
    const { notebook, due } = req.query;
    const filter = { owner: req.user._id };
    if (notebook) filter.notebook = notebook;
    if (due === 'true') filter.nextReview = { $lte: new Date() };
    const cards = await Flashcard.find(filter).sort({ nextReview: 1 });
    res.json({ flashcards: cards });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get due cards for review
router.get('/due', auth, async (req, res) => {
  try {
    const { notebook, limit } = req.query;
    const filter = { owner: req.user._id, nextReview: { $lte: new Date() }, isMastered: false };
    if (notebook) filter.notebook = notebook;
    const cards = await Flashcard.find(filter).sort({ nextReview: 1 }).limit(parseInt(limit) || 20);
    res.json({ flashcards: cards });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create flashcard
router.post('/', auth, async (req, res) => {
  try {
    const { front, back, notebook } = req.body;
    if (!front?.trim() || !back?.trim()) {
      return res.status(400).json({ error: 'Front and back are required' });
    }
    const card = await Flashcard.create({
      owner: req.user._id,
      front: front.trim(),
      back: back.trim(),
      notebook: notebook || null,
    });
    res.json({ flashcard: card });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batch create flashcards
router.post('/batch', auth, async (req, res) => {
  try {
    const { cards, notebook } = req.body;
    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ error: 'Cards array is required' });
    }
    const created = await Flashcard.insertDocuments(
      cards.filter((c) => c.front?.trim() && c.back?.trim()).map((c) => ({
        owner: req.user._id,
        front: c.front.trim(),
        back: c.back.trim(),
        notebook: notebook || null,
      }))
    );
    res.json({ flashcards: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update flashcard (edit front/back)
router.put('/:id', auth, async (req, res) => {
  try {
    const card = await Flashcard.findOne({ _id: req.params.id, owner: req.user._id });
    if (!card) return res.status(404).json({ error: 'Card not found' });
    if (req.body.front !== undefined) card.front = req.body.front.trim();
    if (req.body.back !== undefined) card.back = req.body.back.trim();
    await card.save();
    res.json({ flashcard: card });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete flashcard
router.delete('/:id', auth, async (req, res) => {
  try {
    await Flashcard.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Review flashcard (SM-2 spaced repetition)
router.post('/:id/review', auth, async (req, res) => {
  try {
    const { quality } = req.body; // 0-5: 0=blackout, 5=perfect
    if (quality === undefined || quality < 0 || quality > 5) {
      return res.status(400).json({ error: 'Quality 0-5 is required' });
    }
    const card = await Flashcard.findOne({ _id: req.params.id, owner: req.user._id });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    // SM-2 algorithm
    if (quality >= 3) {
      // Correct response
      if (card.repetitions === 0) {
        card.interval = 1;
      } else if (card.repetitions === 1) {
        card.interval = 6;
      } else {
        card.interval = Math.round(card.interval * card.easeFactor);
      }
      card.repetitions += 1;
    } else {
      // Incorrect response — reset
      card.repetitions = 0;
      card.interval = 1;
    }

    card.easeFactor = Math.max(1.3,
      card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );

    card.lastReview = new Date();
    card.lastQuality = quality;
    card.nextReview = new Date(Date.now() + card.interval * 24 * 60 * 60 * 1000);
    card.isMastered = card.repetitions >= 5 && card.easeFactor >= 2.3;

    await card.save();
    res.json({ flashcard: card });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stats
router.get('/stats', auth, async (req, res) => {
  try {
    const total = await Flashcard.countDocuments({ owner: req.user._id });
    const due = await Flashcard.countDocuments({ owner: req.user._id, nextReview: { $lte: new Date() }, isMastered: false });
    const mastered = await Flashcard.countDocuments({ owner: req.user._id, isMastered: true });
    res.json({ total, due, mastered });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
