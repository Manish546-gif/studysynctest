require('dotenv').config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Room = require('./models/Room');

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const whiteboardRoutes = require('./routes/whiteboards');
const notebookRoutes = require('./routes/notebooks');
const fileRoutes = require('./routes/files');

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['*'];

const corsOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(null, false);
  }
};

const io = new Server(server, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '10mb' }));
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/whiteboards', whiteboardRoutes);
app.use('/api/notebooks', notebookRoutes);
app.use('/api/files', fileRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const clientBuild = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuild));
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(clientBuild, 'index.html'));
});

app.use((err, req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(err.status || 500).json({ error: err.message || 'Server error' });
  }
  next(err);
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return next(new Error('User not found'));
    socket.user = user;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

const activeRooms = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.name} (${socket._id})`);

  socket.on('join-room', async (roomId) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) return socket.emit('error', 'Room not found');

      socket.join(roomId);
      socket.roomId = roomId;

      if (!activeRooms.has(roomId)) activeRooms.set(roomId, new Map());
      activeRooms.get(roomId).set(socket.id, {
        _id: socket.user._id,
        name: socket.user.name,
        avatar: socket.user.avatar,
      });

      socket.emit('whiteboard-state', room.whiteboardActions || []);
      socket.emit('chat-history', room.messages || []);

      const users = Array.from(activeRooms.get(roomId).values());
      io.to(roomId).emit('room-users', users);

      console.log(`${socket.user.name} joined room ${room.name}`);
    } catch (err) {
      socket.emit('error', err.message);
    }
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    if (activeRooms.has(roomId)) {
      activeRooms.get(roomId).delete(socket.id);
      if (activeRooms.get(roomId).size === 0) {
        activeRooms.delete(roomId);
      } else {
        const users = Array.from(activeRooms.get(roomId).values());
        io.to(roomId).emit('room-users', users);
      }
    }
    socket.roomId = null;
  });

  socket.on('send-message', async (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;

    const text = typeof data?.text === 'string' ? data.text.trim() : '';
    if (!text) return;

    const message = {
      userId: socket.user._id,
      name: socket.user.name,
      avatar: socket.user.avatar || '',
      text,
      createdAt: new Date(),
    };

    io.to(roomId).emit('chat-message', message);

    try {
      await Room.findByIdAndUpdate(roomId, {
        $push: { messages: message },
      });
    } catch (err) {
      console.error('Failed to persist chat message:', err.message);
    }
  });

  socket.on('draw-action', async (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;

    const actionData = {
      type: data.type,
      points: data.points,
      color: data.color,
      strokeWidth: data.strokeWidth,
      text: data.text,
      x: data.x,
      y: data.y,
      w: data.w,
      h: data.h,
      fill: data.fill,
      stroke: data.stroke,
      userId: socket.user._id,
      actionId: data.actionId,
    };

    socket.to(roomId).emit('draw-action', {
      ...actionData,
      userName: socket.user.name,
      socketId: socket.id,
    });

    try {
      await Room.findByIdAndUpdate(roomId, {
        $push: { whiteboardActions: actionData },
      });
    } catch (err) {
      console.error('Failed to persist draw action:', err.message);
    }
  });

  socket.on('move-action', async (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;

    socket.to(roomId).emit('move-action', {
      actionId: data.actionId,
      x: data.x,
      y: data.y,
      userId: socket.user._id,
    });

    try {
      const room = await Room.findById(roomId);
      if (room) {
        const action = room.whiteboardActions.id(data.actionId);
        if (action) {
          action.x = data.x;
          action.y = data.y;
          await room.save();
        }
      }
    } catch (err) {
      console.error('Failed to persist move action:', err.message);
    }
  });

  socket.on('cursor-move', (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    socket.to(roomId).emit('cursor-move', {
      ...data,
      userId: socket.user._id,
      userName: socket.user.name,
      socketId: socket.id,
    });
  });

  socket.on('clear-whiteboard', async () => {
    const roomId = socket.roomId;
    if (!roomId) return;

    io.to(roomId).emit('clear-whiteboard');
    try {
      await Room.findByIdAndUpdate(roomId, { $set: { whiteboardActions: [] } });
    } catch (err) {
      console.error('Failed to clear whiteboard:', err.message);
    }
  });

  socket.on('undo-action', async (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;

    io.to(roomId).emit('undo-action', data);

    try {
      if (data.actionId) {
        await Room.findByIdAndUpdate(roomId, {
          $pull: { whiteboardActions: { _id: data.actionId } },
        });
      } else if (data.undoLast) {
        const room = await Room.findById(roomId);
        if (room && room.whiteboardActions.length > 0) {
          room.whiteboardActions.pop();
          await room.save();
        }
      }
    } catch (err) {
      console.error('Failed to undo action:', err.message);
    }
  });

  socket.on('live-path', (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    socket.to(roomId).emit('live-path', {
      ...data,
      socketId: socket.id,
    });
  });

  socket.on('live-path-end', () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    socket.to(roomId).emit('live-path-end', { socketId: socket.id });
  });

  socket.on('file-uploaded', async (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    io.to(roomId).emit('new-file', {
      _id: data._id,
      fileName: data.fileName,
      storedName: data.storedName,
      mimeType: data.mimeType,
      size: data.size,
      uploadedBy: data.uploadedBy,
      uploadedByName: data.uploadedByName,
      url: data.url,
      createdAt: data.createdAt,
    });
  });

  socket.on('file-deleted', (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    io.to(roomId).emit('file-removed', { fileId: data.fileId });
  });

  socket.on('webrtc-ready', () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    socket.to(roomId).emit('webrtc-user-joined', {
      socketId: socket.id,
      userId: socket.user._id,
    });
  });

  socket.on('webrtc-offer', (data) => {
    io.to(data.target).emit('webrtc-offer', {
      from: socket.id,
      offer: data.offer,
    });
  });

  socket.on('webrtc-answer', (data) => {
    io.to(data.target).emit('webrtc-answer', {
      from: socket.id,
      answer: data.answer,
    });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    io.to(data.target).emit('webrtc-ice-candidate', {
      from: socket.id,
      candidate: data.candidate,
    });
  });

  socket.on('disconnect', () => {
    const roomId = socket.roomId;
    if (roomId) {
      io.to(roomId).emit('webrtc-user-left', { socketId: socket.id });
      if (activeRooms.has(roomId)) {
        activeRooms.get(roomId).delete(socket.id);
        if (activeRooms.get(roomId).size === 0) {
          activeRooms.delete(roomId);
        } else {
          const users = Array.from(activeRooms.get(roomId).values());
          io.to(roomId).emit('room-users', users);
        }
      }
    }
    console.log(`User disconnected: ${socket.user.name}`);
  });
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Kill the existing process or use another port.`);
      } else {
        console.error('Server error:', err);
      }
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
