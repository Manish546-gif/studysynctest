const express = require('express');
const router = express.Router();
const Whiteboard = require('../models/Whiteboard');
const Notebook = require('../models/Notebook');
const User = require('../models/User');
const auth = require('../middleware/auth');

function ownerId(board) {
  return String(board.owner?._id || board.owner);
}

function canAccess(board, userId) {
  if (!board) return false;
  if (ownerId(board) === String(userId)) return true;
  return (board.sharedWith || []).some((u) => String(u._id || u) === String(userId));
}

function canEdit(board, userId) {
  if (!board) return false;
  return ownerId(board) === String(userId);
}

function loadBoard(id) {
  return Whiteboard.findById(id)
    .populate('owner', 'name email avatar')
    .populate('sharedWith', 'name email avatar');
}

router.get('/', auth, async (req, res) => {
  try {
    const boards = await Whiteboard.find({
      $or: [{ owner: req.user._id }, { sharedWith: req.user._id }],
    })
      .populate('owner', 'name email avatar')
      .populate('sharedWith', 'name email avatar')
      .sort({ updatedAt: -1 });
    res.json({ whiteboards: boards });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, description, notebook } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    let notebookId = notebook || null;
    if (notebookId) {
      const nb = await Notebook.findOne({ _id: notebookId, owner: req.user._id });
      if (!nb) return res.status(400).json({ error: 'Invalid notebook' });
    }

    const board = await Whiteboard.create({
      title,
      description: description || '',
      owner: req.user._id,
      notebook: notebookId,
    });
    const populated = await board.populate('owner', 'name email avatar');
    res.status(201).json({ whiteboard: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const board = await loadBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'Whiteboard not found' });
    if (!canAccess(board, req.user._id)) {
      return res.status(403).json({ error: 'You do not have access to this whiteboard' });
    }
    res.json({ whiteboard: board });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const board = await loadBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'Whiteboard not found' });
    if (!canAccess(board, req.user._id)) {
      return res.status(403).json({ error: 'You do not have access to this whiteboard' });
    }

    const { title, description, notebook } = req.body;
    if (title !== undefined) board.title = String(title).trim() || board.title;
    if (description !== undefined) board.description = description;
    if (notebook !== undefined) {
      let notebookId = notebook || null;
      if (notebookId) {
        const nb = await Notebook.findOne({ _id: notebookId, owner: req.user._id });
        if (!nb) return res.status(400).json({ error: 'Invalid notebook' });
      }
      board.notebook = notebookId;
    }
    await board.save();
    res.json({ whiteboard: board });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/actions', auth, async (req, res) => {
  try {
    const board = await loadBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'Whiteboard not found' });
    if (!canAccess(board, req.user._id)) {
      return res.status(403).json({ error: 'You do not have access to this whiteboard' });
    }

    board.actions = Array.isArray(req.body.actions) ? req.body.actions : [];
    await board.save();
    res.json({ message: 'Saved', count: board.actions.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/share', auth, async (req, res) => {
  try {
    const board = await loadBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'Whiteboard not found' });
    if (!canEdit(board, req.user._id)) {
      return res.status(403).json({ error: 'Only the owner can share this whiteboard' });
    }

    const email = String(req.body.email || '').toLowerCase().trim();
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const target = await User.findOne({ email });
    if (!target) return res.status(404).json({ error: 'No user found with that email' });
    if (String(target._id) === ownerId(board)) {
      return res.status(400).json({ error: 'You already own this whiteboard' });
    }

    if (!board.sharedWith.some((u) => String(u._id || u) === String(target._id))) {
      board.sharedWith.push(target._id);
      await board.save();
    }
    res.json({ whiteboard: board });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/share', auth, async (req, res) => {
  try {
    const board = await loadBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'Whiteboard not found' });
    if (!canEdit(board, req.user._id)) {
      return res.status(403).json({ error: 'Only the owner can manage sharing' });
    }

    board.sharedWith = board.sharedWith.filter(
      (u) => String(u._id || u) !== String(req.body.userId || '')
    );
    await board.save();
    res.json({ whiteboard: board });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const board = await Whiteboard.findById(req.params.id);
    if (!board) return res.status(404).json({ error: 'Whiteboard not found' });
    if (!canEdit(board, req.user._id)) {
      return res.status(403).json({ error: 'Only the owner can delete this whiteboard' });
    }

    await Whiteboard.findByIdAndDelete(req.params.id);
    res.json({ message: 'Whiteboard deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
