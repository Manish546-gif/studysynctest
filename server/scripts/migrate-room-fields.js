require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Room = require('./models/Room');
  const r1 = await Room.updateMany({ isPublic: { $exists: false } }, { $set: { isPublic: false, subject: '', inviteLinkCode: '', breakoutRooms: [] } });
  console.log('Rooms migrated:', r1.modifiedCount);
  process.exit();
}).catch(e => { console.error(e.message); process.exit(1); });
