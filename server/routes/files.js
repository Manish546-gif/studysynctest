const express = require('express');
const multer = require('multer');
const path = require('path');
const Room = require('../models/Room');
const auth = require('../middleware/auth');
const { getBucket, uploadToGridFS, findGridFSFile, deleteFromGridFS } = require('../gridfs');

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'text/plain', 'text/markdown',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ];
  const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.pdf', '.txt', '.md', '.pptx', '.ppt', '.docx', '.doc'];
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'));
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

const router = express.Router();

router.post('/:roomId/upload', auth, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Max 20MB.' });
      }
      return res.status(400).json({ error: err.message || 'Upload error' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!room.members.includes(req.user._id)) {
      return res.status(403).json({ error: 'Not a member of this room' });
    }

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

    await uploadToGridFS(req.file.buffer, {
      filename: storedName,
      contentType: req.file.mimetype,
    });

    const fileDoc = {
      fileName: req.file.originalname,
      storedName,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user._id,
      uploadedByName: req.user.name,
      url: `/api/files/${roomId}/download/${storedName}`,
      createdAt: new Date(),
    };

    room.files.push(fileDoc);
    await room.save();

    const saved = room.files[room.files.length - 1];
    res.status(201).json({ file: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:roomId', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId).select('files');
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ files: room.files || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:roomId/download/:storedName', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId).select('files');
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const file = room.files.find((f) => f.storedName === req.params.storedName);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const gfsFile = await findGridFSFile(req.params.storedName);
    if (!gfsFile) return res.status(404).json({ error: 'File not found' });

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.fileName)}"`);

    const bucket = getBucket();
    const downloadStream = bucket.openDownloadStream(gfsFile._id);
    downloadStream.on('error', () => {
      if (!res.headersSent) res.status(500).json({ error: 'Failed to stream file' });
    });
    downloadStream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:roomId/:fileId', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const file = room.files.id(req.params.fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    if (file.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only uploader can delete' });
    }

    if (file.url) {
      try { await deleteFromGridFS(file.storedName); } catch (e) { console.error('GridFS delete failed:', e.message); }
    }

    room.files.pull(req.params.fileId);
    await room.save();

    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
