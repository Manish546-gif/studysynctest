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
const notificationRoutes = require('./routes/notifications');
const flashcardRoutes = require('./routes/flashcards');
const statsRoutes = require('./routes/stats');
const livekitRoutes = require('./routes/livekit');
const { setSocketIO, notify } = require('./notify');

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

setSocketIO(io);

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '10mb' }));
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/whiteboards', whiteboardRoutes);
app.use('/api/notebooks', notebookRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/livekit', livekitRoutes);
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
// roomId -> Map(userId -> userName) of active screen sharers
const roomScreenShares = new Map();

function setScreenShareState(roomId, userId, userName, sharing) {
  if (!roomScreenShares.has(roomId)) {
    roomScreenShares.set(roomId, new Map());
  }
  const shares = roomScreenShares.get(roomId);
  if (sharing) {
    shares.set(userId, userName);
  } else {
    shares.delete(userId);
  }
  if (shares.size === 0) roomScreenShares.delete(roomId);
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.name} (${socket._id})`);

  socket.join(`user:${socket.user._id.toString()}`);

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
      socket.emit('poll-state', room.polls || []);
      socket.emit('todo-state', room.todos || []);
      socket.emit('agenda-state', room.agenda || []);
      socket.emit('sticky-state', { notes: room.stickyNotes || [] });
      socket.emit('waiting-update', { waiting: room.waitingRoom || [] });

      const users = Array.from(activeRooms.get(roomId).values());
      io.to(roomId).emit('room-users', users);

      // Late joiners need the current screen-share state (they missed earlier events).
      const shares = roomScreenShares.get(roomId);
      if (shares && shares.size > 0) {
        socket.emit(
          'screen-sharers',
          Array.from(shares.entries()).map(([userId, userName]) => ({ userId, userName }))
        );
      }

      if (room.host.toString() !== socket.user._id.toString()) {
        notify(room.host, {
          type: 'room_joined',
          title: `${socket.user.name} joined "${room.name}"`,
          body: 'A new member joined your study room',
          from: socket.user._id,
          roomId: room._id,
        });
      }

      console.log(`${socket.user.name} joined room ${room.name}`);
    } catch (err) {
      socket.emit('error', err.message);
    }
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit('user-stopped-typing', {
      userId: socket.user._id,
    });
    // Leaving the room ends any active screen share.
    if (roomScreenShares.has(roomId) && roomScreenShares.get(roomId).has(socket.user._id.toString())) {
      setScreenShareState(roomId, socket.user._id.toString(), socket.user.name, false);
      io.to(roomId).emit('screen-share-changed', {
        userId: socket.user._id,
        sharing: false,
        userName: socket.user.name,
      });
    }
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

  socket.on('typing-start', () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    socket.to(roomId).emit('user-typing', {
      userId: socket.user._id,
      name: socket.user.name,
    });
  });

  socket.on('typing-stop', () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    socket.to(roomId).emit('user-stopped-typing', {
      userId: socket.user._id,
    });
  });

  socket.on('draw-action', async (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;

    const actionData = {
      tool: data.tool,
      points: data.points,
      color: data.color,
      strokeWidth: data.strokeWidth,
      text: data.text,
      x: data.x,
      y: data.y,
      x1: data.x1,
      y1: data.y1,
      x2: data.x2,
      y2: data.y2,
      w: data.w,
      h: data.h,
      fill: data.fill,
      stroke: data.stroke,
      src: data.src,
      fontSize: data.fontSize,
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

    try {
      const room = await Room.findById(roomId).select('host');
      if (room && room.host.toString() !== socket.user._id.toString()) {
        notify(room.host, {
          type: 'file_uploaded',
          title: `${socket.user.name} uploaded "${data.fileName}"`,
          body: 'A new file was shared in your study room',
          from: socket.user._id,
          roomId: room._id,
        });
      }
    } catch (err) {
      console.error('File notification error:', err.message);
    }
  });

  socket.on('file-deleted', (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    io.to(roomId).emit('file-removed', { fileId: data.fileId });
  });

  socket.on('screen-share-changed', (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    const sharing = !!data.sharing;
    const userId = socket.user._id.toString();
    setScreenShareState(roomId, userId, socket.user.name, sharing);
    io.to(roomId).emit('screen-share-changed', {
      userId,
      sharing,
      userName: socket.user.name,
    });
  });

  // --- Reactions (floating emoji) ---
  socket.on('reaction', (data) => {
    const roomId = socket.roomId;
    if (!roomId || !data?.emoji) return;
    io.to(roomId).emit('reaction', {
      socketId: socket.id,
      userId: socket.user._id,
      userName: socket.user.name,
      emoji: String(data.emoji).slice(0, 4),
    });
  });

  socket.on('raise-hand', (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    io.to(roomId).emit('raise-hand', {
      socketId: socket.id,
      userId: socket.user._id,
      userName: socket.user.name,
      raised: !!data.raised,
    });
  });

  // --- Shared Pomodoro sync ---
  socket.on('pomodoro-sync', (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    // Only host can control the shared timer
    if (!activeRooms.has(roomId)) return;
    const users = activeRooms.get(roomId);
    const hostEntry = Array.from(users.values())[0];
    if (!hostEntry || String(hostEntry._id) !== String(socket.user._id)) return;
    io.to(roomId).emit('pomodoro-sync', {
      phase: data.phase,
      timeLeft: data.timeLeft,
      completedSessions: data.completedSessions,
      totalSessions: data.totalSessions,
    });
  });

  // --- Screen share viewer count ---
  const screenViewers = new Map(); // roomId -> Map(sharingSocketId -> Set<viewerSocketId>)

  socket.on('screen-viewer-join', (data) => {
    const roomId = socket.roomId;
    if (!roomId || !data?.targetSocketId) return;
    if (!screenViewers.has(roomId)) screenViewers.set(roomId, new Map());
    const rv = screenViewers.get(roomId);
    if (!rv.has(data.targetSocketId)) rv.set(data.targetSocketId, new Set());
    rv.get(data.targetSocketId).add(socket.id);
    const count = rv.get(data.targetSocketId).size;
    io.to(data.targetSocketId).emit('viewer-count', { count });
  });

  socket.on('screen-viewer-leave', (data) => {
    const roomId = socket.roomId;
    if (!roomId || !data?.targetSocketId) return;
    const rv = screenViewers.get(roomId);
    if (rv && rv.has(data.targetSocketId)) {
      rv.get(data.targetSocketId).delete(socket.id);
      const count = rv.get(data.targetSocketId).size;
      io.to(data.targetSocketId).emit('viewer-count', { count });
      if (count <= 0) rv.delete(data.targetSocketId);
    }
  });

  // --- Breakout rooms ---
  socket.on('breakout-create', async (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    try {
      const room = await Room.findById(roomId);
      if (!room || String(room.host) !== String(socket.user._id)) return;
      room.breakoutRooms.push({ name: data?.name || `Breakout ${room.breakoutRooms.length + 1}`, members: [] });
      await room.save();
      io.to(roomId).emit('breakout-update', { breakoutRooms: room.breakoutRooms });
    } catch {}
  });

  socket.on('breakout-join', async (data) => {
    const roomId = socket.roomId;
    if (!roomId || !data?.breakoutIndex && data.breakoutIndex !== 0) return;
    try {
      const room = await Room.findById(roomId);
      if (!room) return;
      // Remove from other breakout rooms first
      room.breakoutRooms.forEach((br) => {
        br.members = br.members.filter((m) => String(m) !== String(socket.user._id));
      });
      if (data.breakoutIndex < room.breakoutRooms.length) {
        const br = room.breakoutRooms[data.breakoutIndex];
        if (!br.members.some((m) => String(m) === String(socket.user._id))) {
          br.members.push(socket.user._id);
        }
      }
      await room.save();
      io.to(roomId).emit('breakout-update', { breakoutRooms: room.breakoutRooms });
    } catch {}
  });

  socket.on('breakout-leave', async (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    try {
      const room = await Room.findById(roomId);
      if (!room) return;
      room.breakoutRooms.forEach((br) => {
        br.members = br.members.filter((m) => String(m) !== String(socket.user._id));
      });
      await room.save();
      io.to(roomId).emit('breakout-update', { breakoutRooms: room.breakoutRooms });
    } catch {}
  });

  socket.on('breakout-delete', async (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    try {
      const room = await Room.findById(roomId);
      if (!room || String(room.host) !== String(socket.user._id)) return;
      if (data?.breakoutIndex < room.breakoutRooms.length) {
        room.breakoutRooms.splice(data.breakoutIndex, 1);
        await room.save();
        io.to(roomId).emit('breakout-update', { breakoutRooms: room.breakoutRooms });
      }
    } catch {}
  });

  // --- Polls / Quizzes ---
  const persistRoomField = async (roomId, fn) => {
    const room = await Room.findById(roomId);
    if (room) { fn(room); await room.save(); }
  };

  socket.on('poll-create', async (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    try {
      const room = await Room.findById(roomId);
      if (!room) return;
      const poll = {
        question: String(data?.question || '').slice(0, 200),
        options: (data?.options || []).filter((o) => o && o.trim()).map((o) => ({ text: o.trim().slice(0, 80), votes: [] })),
        createdBy: socket.user._id,
        isQuiz: !!data?.isQuiz,
        correctIndex: data?.isQuiz ? Number(data.correctIndex) : -1,
        active: true,
        createdAt: new Date(),
      };
      if (!poll.question || poll.options.length < 2) return;
      room.polls.push(poll);
      await room.save();
      io.to(roomId).emit('poll-update', { polls: room.polls });
    } catch {}
  });

  socket.on('poll-vote', async (data) => {
    const roomId = socket.roomId;
    if (!roomId || !data?.pollIndex === undefined) return;
    try {
      const room = await Room.findById(roomId);
      if (!room || room.polls[data.pollIndex]?.active === false) return;
      const poll = room.polls[data.pollIndex];
      if (!poll) return;
      const uid = socket.user._id;
      poll.options.forEach((o) => {
        o.votes = o.votes.filter((v) => String(v) !== String(uid));
      });
      if (data.optionIndex !== undefined && data.optionIndex >= 0 && data.optionIndex < poll.options.length) {
        const opt = poll.options[data.optionIndex];
        if (!opt.votes.some((v) => String(v) === String(uid))) opt.votes.push(uid);
      }
      await room.save();
      io.to(roomId).emit('poll-update', { polls: room.polls });
    } catch {}
  });

  socket.on('poll-close', async (data) => {
    const roomId = socket.roomId;
    if (!roomId || data?.pollIndex === undefined) return;
    try {
      await persistRoomField(roomId, (room) => {
        if (room.polls[data.pollIndex]) room.polls[data.pollIndex].active = false;
      });
      const room = await Room.findById(roomId);
      io.to(roomId).emit('poll-update', { polls: room.polls });
    } catch {}
  });

  // --- To-do list ---
  socket.on('todo-add', async (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    try {
      await persistRoomField(roomId, (room) => {
        room.todos.push({
          text: String(data?.text || '').slice(0, 200),
          done: false,
          assignee: data?.assignee || null,
          createdBy: socket.user._id,
          createdAt: new Date(),
        });
      });
      const room = await Room.findById(roomId);
      io.to(roomId).emit('todo-update', { todos: room.todos });
    } catch {}
  });

  socket.on('todo-toggle', async (data) => {
    const roomId = socket.roomId;
    if (!roomId || data?.todoIndex === undefined) return;
    try {
      await persistRoomField(roomId, (room) => {
        if (room.todos[data.todoIndex]) room.todos[data.todoIndex].done = !room.todos[data.todoIndex].done;
      });
      const room = await Room.findById(roomId);
      io.to(roomId).emit('todo-update', { todos: room.todos });
    } catch {}
  });

  socket.on('todo-delete', async (data) => {
    const roomId = socket.roomId;
    if (!roomId || data?.todoIndex === undefined) return;
    try {
      await persistRoomField(roomId, (room) => {
        if (room.todos[data.todoIndex]) room.todos.splice(data.todoIndex, 1);
      });
      const room = await Room.findById(roomId);
      io.to(roomId).emit('todo-update', { todos: room.todos });
    } catch {}
  });

  // --- Agenda ---
  socket.on('agenda-add', async (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    try {
      await persistRoomField(roomId, (room) => {
        room.agenda.push({
          text: String(data?.text || '').slice(0, 200),
          done: false,
          createdBy: socket.user._id,
          createdAt: new Date(),
        });
      });
      const room = await Room.findById(roomId);
      io.to(roomId).emit('agenda-update', { agenda: room.agenda });
    } catch {}
  });

  socket.on('agenda-toggle', async (data) => {
    const roomId = socket.roomId;
    if (!roomId || data?.agendaIndex === undefined) return;
    try {
      await persistRoomField(roomId, (room) => {
        if (room.agenda[data.agendaIndex]) room.agenda[data.agendaIndex].done = !room.agenda[data.agendaIndex].done;
      });
      const room = await Room.findById(roomId);
      io.to(roomId).emit('agenda-update', { agenda: room.agenda });
    } catch {}
  });

  socket.on('agenda-delete', async (data) => {
    const roomId = socket.roomId;
    if (!roomId || data?.agendaIndex === undefined) return;
    try {
      await persistRoomField(roomId, (room) => {
        if (room.agenda[data.agendaIndex]) room.agenda.splice(data.agendaIndex, 1);
      });
      const room = await Room.findById(roomId);
      io.to(roomId).emit('agenda-update', { agenda: room.agenda });
    } catch {}
  });

  // --- Tab visibility indicator ---
  socket.on('tab-visibility', (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    io.to(roomId).emit('tab-visibility', {
      userId: socket.user._id,
      userName: socket.user.name,
      visible: !!data.visible,
    });
  });

  // --- Screen share cursor position ---
  socket.on('cursor-position', (data) => {
    const roomId = socket.roomId;
    if (!roomId || !screenViewers.has(roomId)) return;
    // Only forward to viewers of this sharer
    const viewers = screenViewers.get(roomId)?.get(socket.id);
    if (!viewers) return;
    viewers.forEach((viewerId) => {
      io.to(viewerId).emit('cursor-position', {
        userId: socket.user._id,
        socketId: socket.id,
        x: data.x,
        y: data.y,
      });
    });
  });

  // --- Speaker activity (audio level for spotlight) ---
  socket.on('speaker-level', (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    io.to(roomId).emit('speaker-level', {
      userId: socket.user._id,
      level: data.level || 0,
    });
  });

  // --- Activity log broadcast ---
  socket.on('activity-log', (data) => {
    const roomId = socket.roomId;
    if (!roomId || !data?.message) return;
    io.to(roomId).emit('activity-log', {
      message: data.message,
      userName: socket.user.name,
      timestamp: Date.now(),
    });
  });

  // --- YouTube watch-together (in-memory, real-time only) ---
  const youtubeStates = {};

  socket.on('youtube-set', (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    const url = String(data?.url || '').trim();
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    const videoId = match ? match[1] : null;
    if (!videoId) return;
    if (!youtubeStates[roomId]) youtubeStates[roomId] = { videoId, playing: false, currentTime: 0, setBy: socket.user.name };
    else { youtubeStates[roomId].videoId = videoId; youtubeStates[roomId].setBy = socket.user.name; }
    io.to(roomId).emit('youtube-state', youtubeStates[roomId]);
  });

  socket.on('youtube-play', (data) => {
    const roomId = socket.roomId;
    if (!roomId || !youtubeStates[roomId]) return;
    youtubeStates[roomId].playing = true;
    youtubeStates[roomId].currentTime = data?.currentTime || 0;
    io.to(roomId).emit('youtube-state', youtubeStates[roomId]);
  });

  socket.on('youtube-pause', (data) => {
    const roomId = socket.roomId;
    if (!roomId || !youtubeStates[roomId]) return;
    youtubeStates[roomId].playing = false;
    youtubeStates[roomId].currentTime = data?.currentTime || 0;
    io.to(roomId).emit('youtube-state', youtubeStates[roomId]);
  });

  socket.on('youtube-stop', () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    delete youtubeStates[roomId];
    io.to(roomId).emit('youtube-state', null);
  });

  // --- Sticky notes ---
  socket.on('sticky-add', async (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    try {
      await persistRoomField(roomId, (room) => {
        room.stickyNotes.push({
          text: String(data?.text || '').slice(0, 500),
          color: String(data?.color || '#fef08a'),
          x: Number(data?.x) || 0,
          y: Number(data?.y) || 0,
          createdBy: socket.user._id,
          createdAt: new Date(),
        });
      });
      const room = await Room.findById(roomId);
      io.to(roomId).emit('sticky-update', { notes: room.stickyNotes });
    } catch {}
  });

  socket.on('sticky-update', async (data) => {
    const roomId = socket.roomId;
    if (!roomId || data?.noteIndex === undefined) return;
    try {
      await persistRoomField(roomId, (room) => {
        const note = room.stickyNotes[data.noteIndex];
        if (!note) return;
        if (data.text !== undefined) note.text = String(data.text).slice(0, 500);
        if (data.color !== undefined) note.color = String(data.color);
        if (data.x !== undefined) note.x = Number(data.x);
        if (data.y !== undefined) note.y = Number(data.y);
      });
      const room = await Room.findById(roomId);
      io.to(roomId).emit('sticky-update', { notes: room.stickyNotes });
    } catch {}
  });

  socket.on('sticky-delete', async (data) => {
    const roomId = socket.roomId;
    if (!roomId || data?.noteIndex === undefined) return;
    try {
      await persistRoomField(roomId, (room) => {
        if (room.stickyNotes[data.noteIndex]) room.stickyNotes.splice(data.noteIndex, 1);
      });
      const room = await Room.findById(roomId);
      io.to(roomId).emit('sticky-update', { notes: room.stickyNotes });
    } catch {}
  });

  // --- Waiting room (host only) ---
  socket.on('waiting-join', () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    socket.to(roomId).emit('waiting-join', { userId: socket.user._id, name: socket.user.name });
  });

  socket.on('waiting-admit', async (data) => {
    const roomId = socket.roomId;
    if (!roomId || socket.roomHost !== true) return;
    const targetId = data?.userId;
    if (!targetId) return;
    try {
      await persistRoomField(roomId, (room) => {
        room.waitingRoom = (room.waitingRoom || []).filter((id) => String(id) !== String(targetId));
        if (!room.members.some((m) => String(m) === String(targetId))) room.members.push(targetId);
      });
      io.to(roomId).emit('waiting-update', { waiting: (await Room.findById(roomId)).waitingRoom || [] });
      io.to(roomId).emit('waiting-admitted', { userId: targetId });
    } catch {}
  });

  socket.on('waiting-deny', (data) => {
    const roomId = socket.roomId;
    if (!roomId || socket.roomHost !== true) return;
    io.to(roomId).emit('waiting-denied', { userId: data?.userId });
  });

  // --- Clean up viewer tracking on disconnect ---
  socket.on('disconnect', () => {
    const roomId = socket.roomId;
    if (roomId) {
      socket.to(roomId).emit('user-stopped-typing', {
        userId: socket.user._id,
      });
      // Abrupt disconnect (tab close/crash) must also clear share state.
      const userId = socket.user._id.toString();
      if (roomScreenShares.has(roomId) && roomScreenShares.get(roomId).has(userId)) {
        setScreenShareState(roomId, userId, socket.user.name, false);
        io.to(roomId).emit('screen-share-changed', {
          userId,
          sharing: false,
          userName: socket.user.name,
        });
      }
      // Clean up viewer tracking
      if (screenViewers.has(roomId)) {
        const rv = screenViewers.get(roomId);
        // Remove this socket as a viewer from all sharers
        rv.forEach((viewerSet, sharerId) => {
          if (viewerSet.has(socket.id)) {
            viewerSet.delete(socket.id);
            const count = viewerSet.size;
            io.to(sharerId).emit('viewer-count', { count });
            if (count <= 0) rv.delete(sharerId);
          }
        });
        // Remove this socket as a sharer
        if (rv.has(socket.id)) {
          const viewers = rv.get(socket.id);
          viewers.forEach((vId) => {
            io.to(vId).emit('cursor-position', { userId: socket.user._id, socketId: socket.id, x: -1, y: -1 });
          });
          rv.delete(socket.id);
        }
        if (rv.size === 0) screenViewers.delete(roomId);
      }
      // Broadcast tab away on disconnect
      io.to(roomId).emit('tab-visibility', {
        userId: socket.user._id,
        userName: socket.user.name,
        visible: false,
      });
      io.to(roomId).emit('speaker-level', { userId: socket.user._id, level: 0 });
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
