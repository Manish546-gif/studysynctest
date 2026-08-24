const Notification = require('./models/Notification');

let io = null;

function setSocketIO(socketIO) {
  io = socketIO;
}

async function notify(userId, { type, title, body = '', from = null, roomId = null }) {
  try {
    const notif = await Notification.create({ user: userId, type, title, body, from, roomId });
    const populated = await notif.populate('from', 'name avatar');
    if (io) {
      io.to(`user:${userId.toString()}`).emit('notification', {
        notification: populated,
        unreadCount: await Notification.countDocuments({ user: userId, read: false }),
      });
    }
    return populated;
  } catch (err) {
    console.error('Notification error:', err.message);
    return null;
  }
}

module.exports = { setSocketIO, notify };
