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

function findGridFSFile(filename) {
  return new Promise((resolve, reject) => {
    getBucket().find({ filename }).toArray((err, docs) => {
      if (err) return reject(err);
      resolve(docs[0] || null);
    });
  });
}

function deleteFromGridFS(filename) {
  return new Promise(async (resolve, reject) => {
    try {
      const file = await findGridFSFile(filename);
      if (!file) return resolve();
      getBucket().delete(file._id, (err) => (err ? reject(err) : resolve()));
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { getBucket, uploadToGridFS, findGridFSFile, deleteFromGridFS };
