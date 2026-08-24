require('dotenv').config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const coll = mongoose.connection.collection('whiteboards');
  const docs = await coll.find({}).toArray();
  let migrated = 0;
  for (const doc of docs) {
    const sw = doc.sharedWith;
    if (!Array.isArray(sw) || sw.length === 0) continue;
    if (sw.every((u) => u && typeof u === 'object' && u.user)) continue;
    const converted = sw.map((u) =>
      u && typeof u === 'object' && u.user ? u : { user: u, role: 'editor' }
    );
    await coll.updateOne({ _id: doc._id }, { $set: { sharedWith: converted } });
    migrated += 1;
    console.log(`Migrated whiteboard ${doc._id} (${doc.title})`);
  }
  console.log(`Done. ${migrated} whiteboard(s) migrated.`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
