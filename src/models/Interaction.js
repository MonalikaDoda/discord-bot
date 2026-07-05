const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
  interactionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  commandName: {
    type: String,
    required: true,
  },
  inputText: {
    type: String,
    required: false,
  },
  userId: {
    type: String,
    required: true,
  },
  guildId: {
    type: String,
    required: true,
  },
  channelId: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Interaction', interactionSchema);
