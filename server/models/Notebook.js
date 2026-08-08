const mongoose = require('mongoose');

const notebookSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

notebookSchema.index({ owner: 1 });

module.exports = mongoose.model('Notebook', notebookSchema);
