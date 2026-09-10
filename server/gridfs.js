const mongoose = require('mongoose');

const BUCKET_NAME = 'files';

function getBucket() {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database not connected');
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
}

function uploadToGridFS(buffer, { filename, contentType }) {
  return new Promise((resolve, reject) => {
    const bucket = getBucket();
    const uploadStream = bucket.openUploadStream(filename, { contentType });
    uploadStream.on('error', reject);
    uploadStream.on('finish', (file) => resolve(file));
    uploadStream.end(buffer);
  });
}

async function findGridFSFile(identifier) {
  if (!identifier) return null;
  const bucket = getBucket();
  const nameStr = String(identifier).trim();

  // Try finding by filename first
  const byName = await bucket.find({ filename: nameStr }).toArray();
  if (byName && byName.length > 0) return byName[0];

  // If valid ObjectId, try finding by _id
  if (mongoose.Types.ObjectId.isValid(nameStr)) {
    const byId = await bucket.find({ _id: new mongoose.Types.ObjectId(nameStr) }).toArray();
    if (byId && byId.length > 0) return byId[0];
  }

  return null;
}

async function deleteFromGridFS(identifier) {
  if (!identifier) return;
  try {
    const file = await findGridFSFile(identifier);
    if (!file) return;
    const bucket = getBucket();
    await bucket.delete(file._id);
  } catch (err) {
    console.error('deleteFromGridFS error:', err.message);
  }
}

module.exports = { getBucket, uploadToGridFS, findGridFSFile, deleteFromGridFS };
