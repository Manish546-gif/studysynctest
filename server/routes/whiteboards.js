const express = require('express');
const router = express.Router();
const Whiteboard = require('../models/Whiteboard');
const Notebook = require('../models/Notebook');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { notify } = require('../notify');

function ownerId(board) {
  return String(board.owner?._id || board.owner);
}

function sharedEntry(board, userId) {
  const uid = String(userId);
  return (board.sharedWith || []).find(
    (e) => String(e.user?._id || e.user) === uid
  );
}

// 'owner' | 'editor' | 'viewer' | 'link-editor' | 'link-viewer' | null
function accessLevel(board, userId) {
  if (!board) return null;
  const uid = String(userId);
  if (ownerId(board) === uid) return 'owner';
  const entry = sharedEntry(board, userId);
  if (entry) return entry.role === 'viewer' ? 'viewer' : 'editor';
  if (board.linkAccess === 'view') return 'link-viewer';
  if (board.linkAccess === 'edit') return 'link-editor';
  return null;
}

function canAccess(board, userId) {
  return !!accessLevel(board, userId);
}

function canEditContent(level) {
  return level === 'owner' || level === 'editor' || level === 'link-editor';
}

function loadBoard(id) {
  return Whiteboard.findById(id)
    .populate('owner', 'name email avatar')
    .populate('sharedWith.user', 'name email avatar');
}

function withRole(board, level) {
  const json = board.toJSON();
  json.myRole = level;
  return json;
}

// After mutating sharedWith/linkAccess, re-load so user refs are populated.
async function freshBoardResponse(id, level, res, status = 200) {
  const fresh = await loadBoard(id);
  res.status(status).json({ whiteboard: withRole(fresh, level) });
}

router.get('/', auth, async (req, res) => {
  try {
    const boards = await Whiteboard.find({
      $or: [{ owner: req.user._id }, { 'sharedWith.user': req.user._id }],
    })
      .populate('owner', 'name email avatar')
      .populate('sharedWith.user', 'name email avatar')
      .sort({ updatedAt: -1 });
    res.json({
      whiteboards: boards.map((b) => withRole(b, accessLevel(b, req.user._id))),
    });
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
    await board.populate('owner', 'name email avatar');
    res.status(201).json({ whiteboard: withRole(board, 'owner') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const board = await loadBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'Whiteboard not found' });
    const level = accessLevel(board, req.user._id);
    if (!level) {
      return res.status(403).json({ error: 'You do not have access to this whiteboard' });
    }
    res.json({ whiteboard: withRole(board, level), role: level });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const board = await loadBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'Whiteboard not found' });
    const level = accessLevel(board, req.user._id);
    if (level !== 'owner') {
      return res.status(403).json({ error: 'Only the owner can edit whiteboard details' });
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
    res.json({ whiteboard: withRole(board, level) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/actions', auth, async (req, res) => {
  try {
    const board = await Whiteboard.findById(req.params.id);
    if (!board) return res.status(404).json({ error: 'Whiteboard not found' });
    const level = accessLevel(board, req.user._id);
    if (!canAccess(board, req.user._id)) {
      return res.status(403).json({ error: 'You do not have access to this whiteboard' });
    }
    if (!canEditContent(level)) {
      return res.status(403).json({ error: 'You have view-only access to this whiteboard' });
    }

    const raw = Array.isArray(req.body.actions) ? req.body.actions : [];
    const actions = raw.map((a) => {
      const clean = { tool: a.tool || a.type || 'pen' };
      if (a.points) clean.points = a.points;
      if (a.color != null) clean.color = a.color;
      if (a.strokeWidth != null) clean.strokeWidth = a.strokeWidth;
      if (a.text != null) clean.text = a.text;
      if (a.x != null) clean.x = a.x;
      if (a.y != null) clean.y = a.y;
      if (a.x1 != null) clean.x1 = a.x1;
      if (a.y1 != null) clean.y1 = a.y1;
      if (a.x2 != null) clean.x2 = a.x2;
      if (a.y2 != null) clean.y2 = a.y2;
      if (a.w != null) clean.w = a.w;
      if (a.h != null) clean.h = a.h;
      if (a.fill != null) clean.fill = a.fill;
      if (a.stroke != null) clean.stroke = a.stroke;
      if (a.src != null) clean.src = a.src;
      if (a.fontSize != null) clean.fontSize = a.fontSize;
      return clean;
    });

    const result = await Whiteboard.findByIdAndUpdate(
      req.params.id,
      { $set: { actions } },
      { new: true, runValidators: false }
    );
    res.json({ message: 'Saved', count: result.actions.length });
  } catch (err) {
    console.error('Failed to save whiteboard actions:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/share', auth, async (req, res) => {
  try {
    const board = await loadBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'Whiteboard not found' });
    if (accessLevel(board, req.user._id) !== 'owner') {
      return res.status(403).json({ error: 'Only the owner can share this whiteboard' });
    }

    const email = String(req.body.email || '').toLowerCase().trim();
    const role = req.body.role === 'viewer' ? 'viewer' : 'editor';
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const target = await User.findOne({ email });
    if (!target) return res.status(404).json({ error: 'No user found with that email' });
    if (String(target._id) === ownerId(board)) {
      return res.status(400).json({ error: 'You already own this whiteboard' });
    }

    const existing = sharedEntry(board, target._id);
    if (existing) {
      existing.role = role;
    } else {
      board.sharedWith.push({ user: target._id, role });
    }
    await board.save();

    notify(target._id, {
      type: 'whiteboard_shared',
      title: `${req.user.name} shared "${board.title}" with you`,
      body: role === 'viewer' ? 'You can view this whiteboard' : 'You can collaborate on this whiteboard',
      from: req.user._id,
    });

    await freshBoardResponse(board._id, 'owner', res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/share/:userId', auth, async (req, res) => {
  try {
    const board = await loadBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'Whiteboard not found' });
    if (accessLevel(board, req.user._id) !== 'owner') {
      return res.status(403).json({ error: 'Only the owner can manage sharing' });
    }

    const entry = sharedEntry(board, req.params.userId);
    if (!entry) return res.status(404).json({ error: 'User is not shared on this whiteboard' });

    entry.role = req.body.role === 'viewer' ? 'viewer' : 'editor';
    await board.save();
    await freshBoardResponse(board._id, 'owner', res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/link', auth, async (req, res) => {
  try {
    const board = await loadBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'Whiteboard not found' });
    if (accessLevel(board, req.user._id) !== 'owner') {
      return res.status(403).json({ error: 'Only the owner can manage link access' });
    }

    const access = ['none', 'view', 'edit'].includes(req.body.access)
      ? req.body.access
      : 'none';
    board.linkAccess = access;
    await board.save();
    await freshBoardResponse(board._id, 'owner', res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/share', auth, async (req, res) => {
  try {
    const board = await loadBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'Whiteboard not found' });
    if (accessLevel(board, req.user._id) !== 'owner') {
      return res.status(403).json({ error: 'Only the owner can manage sharing' });
    }

    const uid = String(req.body.userId || '');
    board.sharedWith = board.sharedWith.filter(
      (e) => String(e.user?._id || e.user) !== uid
    );
    await board.save();
    await freshBoardResponse(board._id, 'owner', res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Comments — any user with access (including viewers) can participate.
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const board = await loadBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'Whiteboard not found' });
    const level = accessLevel(board, req.user._id);
    if (!level) {
      return res.status(403).json({ error: 'You do not have access to this whiteboard' });
    }

    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Comment text is required' });
    if (text.length > 2000) return res.status(400).json({ error: 'Comment too long' });

    board.comments.push({
      user: req.user._id,
      userName: req.user.name,
      text,
      x: Number(req.body.x) || 0,
      y: Number(req.body.y) || 0,
    });
    await board.save();

    // Mention notifications: match @fullname or @firstname against participants.
    const participants = [
      { id: ownerId(board), name: board.owner?.name },
      ...(board.sharedWith || []).map((e) => ({
        id: String(e.user?._id || e.user),
        name: e.user?.name,
      })),
    ];
    const lower = text.toLowerCase();
    const mentioned = new Set();
    for (const p of participants) {
      if (!p.name || !p.id) continue;
      const full = String(p.name).trim().toLowerCase();
      const first = full.split(/\s+/)[0];
      if (lower.includes(`@${full}`) || lower.includes(`@${first}`)) mentioned.add(p.id);
    }
    mentioned.delete(String(req.user._id));
    for (const uid of mentioned) {
      notify(uid, {
        type: 'comment_mention',
        title: `${req.user.name} mentioned you on "${board.title}"`,
        body: text.slice(0, 120),
        from: req.user._id,
      });
    }

    // Let the owner know about new comments (unless they wrote/are mentioned).
    const ownerUid = ownerId(board);
    if (String(req.user._id) !== ownerUid && !mentioned.has(ownerUid)) {
      notify(ownerUid, {
        type: 'whiteboard_comment',
        title: `${req.user.name} commented on "${board.title}"`,
        body: text.slice(0, 120),
        from: req.user._id,
      });
    }

    res.status(201).json({ whiteboard: withRole(board, level) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/comments/:commentId', auth, async (req, res) => {
  try {
    const board = await loadBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'Whiteboard not found' });
    const level = accessLevel(board, req.user._id);
    if (!level) {
      return res.status(403).json({ error: 'You do not have access to this whiteboard' });
    }

    const comment = board.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const isAuthor = String(comment.user?._id || comment.user) === String(req.user._id);
    if (!isAuthor && level !== 'owner') {
      return res.status(403).json({ error: 'Only the author or owner can delete this comment' });
    }

    comment.deleteOne();
    await board.save();
    res.json({ whiteboard: withRole(board, level) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const board = await Whiteboard.findById(req.params.id);
    if (!board) return res.status(404).json({ error: 'Whiteboard not found' });
    if (accessLevel(board, req.user._id) !== 'owner') {
      return res.status(403).json({ error: 'Only the owner can delete this whiteboard' });
    }

    await Whiteboard.findByIdAndDelete(req.params.id);
    res.json({ message: 'Whiteboard deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
