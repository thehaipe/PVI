const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  id:           { type: String, required: true, unique: true, index: true },
  senderId:     { type: String, required: true },
  senderName:   { type: String, required: true },
  roomId:       { type: String, default: null, index: true },
  recipientIds: [String],
  allStudents:  { type: Boolean, default: false },
  text:         { type: String, required: true },
  read:         { type: Boolean, default: false },
  createdAt:    { type: String, required: true },
}, { timestamps: false });

module.exports = mongoose.model('Message', messageSchema);
