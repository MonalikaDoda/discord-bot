const mongoose = require('mongoose');

const errorLogSchema = new mongoose.Schema({
  source: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  collection: 'error_logs',
});

module.exports = mongoose.model('ErrorLog', errorLogSchema, 'error_logs');
