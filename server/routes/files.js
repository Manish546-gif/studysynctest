const express = require('express');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const Room = require('../models/Room');
const auth = require('../middleware/auth');
const { getBucket, uploadToGridFS, findGridFSFile, deleteFromGridFS } = require('../gridfs');

const findRoomByIdOrCode = async (idOrCode) => {
  if (!idOrCode) return null;
  const str = String(idOrCode).trim();
  if (mongoose.Types.ObjectId.isValid(str)) {
    const room = await Room.findById(str);
    if (room) return room;
  }
  return Room.findOne({
    $or: [
      { code: str.toUpperCase() },
      { code: str.toLowerCase() },
      { code: str },
      { name: new RegExp(`^${str}$`, 'i') },
    ],
  });
};

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
    const room = await findRoomByIdOrCode(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!room.members.some((m) => m.toString() === req.user._id.toString()) && room.host.toString() !== req.user._id.toString()) {
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
      url: `/api/files/${room._id}/download/${storedName}`,
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
    const room = await findRoomByIdOrCode(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ files: room.files || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:roomId/download/:storedName', auth, async (req, res) => {
  try {
    const room = await findRoomByIdOrCode(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const file = (room.files || []).find((f) => f.storedName === req.params.storedName);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const gfsFile = await findGridFSFile(req.params.storedName);
    if (!gfsFile) return res.status(404).json({ error: 'File not found' });

    const total = gfsFile.length;
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.fileName)}"`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.removeHeader('X-Frame-Options');

    const bucket = getBucket();

    const range = req.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (match) {
        let start = match[1] ? parseInt(match[1], 10) : 0;
        let end = match[2] ? Math.min(parseInt(match[2], 10), total - 1) : total - 1;
        if (!Number.isFinite(start)) start = 0;
        if (start > end || start >= total) {
          res.setHeader('Content-Range', `bytes */${total}`);
          return res.status(416).json({ error: 'Range not satisfiable' });
        }
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
        res.setHeader('Content-Length', end - start + 1);
        const partial = bucket.openDownloadStream(gfsFile._id, { start, end: end + 1 });
        partial.on('error', () => {
          if (!res.headersSent) res.status(500).json({ error: 'Failed to stream file' });
        });
        partial.pipe(res);
        return;
      }
    }

    res.setHeader('Content-Length', total);
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
    const room = await findRoomByIdOrCode(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const fileIdStr = String(req.params.fileId);
    let targetFile = null;
    if (room.files && typeof room.files.id === 'function' && mongoose.Types.ObjectId.isValid(fileIdStr)) {
      targetFile = room.files.id(fileIdStr);
    }
    if (!targetFile) {
      targetFile = (room.files || []).find(
        (f) => String(f._id) === fileIdStr || f.storedName === fileIdStr
      );
    }
    if (!targetFile) return res.status(404).json({ error: 'File not found' });

    const userIdStr = req.user._id.toString();
    const isHost = room.host && (room.host.toString() === userIdStr || room.host._id?.toString() === userIdStr);
    const isUploader = targetFile.uploadedBy && (targetFile.uploadedBy.toString() === userIdStr || targetFile.uploadedBy._id?.toString() === userIdStr);
    const isMember = Array.isArray(room.members) && room.members.some(
      (m) => m.toString() === userIdStr || m._id?.toString() === userIdStr
    );

    if (!isHost && !isUploader && !isMember) {
      return res.status(403).json({ error: 'Only room members or uploader can delete this file' });
    }

    if (targetFile.storedName) {
      try {
        await deleteFromGridFS(targetFile.storedName);
      } catch (e) {
        console.error('GridFS delete failed:', e.message);
      }
    }

    room.files = (room.files || []).filter(
      (f) => String(f._id) !== String(targetFile._id) && f.storedName !== targetFile.storedName
    );
    await room.save();

    res.json({ message: 'File deleted', fileId: String(targetFile._id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
