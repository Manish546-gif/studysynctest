const express = require('express');
const router = express.Router();
const Notebook = require('../models/Notebook');
const Whiteboard = require('../models/Whiteboard');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const notebooks = await Notebook.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json({ notebooks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const notebook = await Notebook.create({ name: String(name).trim(), owner: req.user._id });
    res.status(201).json({ notebook });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const notebook = await Notebook.findOne({ _id: req.params.id, owner: req.user._id });
    if (!notebook) return res.status(404).json({ error: 'Notebook not found' });
    const { name } = req.body;
    if (name !== undefined) notebook.name = String(name).trim() || notebook.name;
    await notebook.save();
    res.json({ notebook });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const notebook = await Notebook.findOne({ _id: req.params.id, owner: req.user._id });
    if (!notebook) return res.status(404).json({ error: 'Notebook not found' });

    await Notebook.findByIdAndDelete(req.params.id);
    await Whiteboard.updateMany(
      { notebook: req.params.id },
      { $set: { notebook: null } }
    );
    res.json({ message: 'Notebook deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
