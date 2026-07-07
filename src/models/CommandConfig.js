const mongoose = require('mongoose');

const commandConfigSchema = new mongoose.Schema({
  keyword: {
    type: String,
    required: true,
  },
  tag: {
    type: String,
    required: true,
  },
}, {
  collection: 'command_config',
});

module.exports = mongoose.model('CommandConfig', commandConfigSchema, 'command_config');
