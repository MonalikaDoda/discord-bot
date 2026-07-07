const ErrorLog = require('../models/ErrorLog');

async function logError(source, message) {
  try {
    if (!source) source = 'unknown';
    if (!message) message = '';
    await ErrorLog.create({ source: String(source), message: String(message) });
  } catch (err) {
    // last-resort: don't throw, just log to console
    try {
      console.error('Failed to write ErrorLog:', err && err.message ? err.message : err);
    } catch (e) {
      // ignore
    }
  }
}

module.exports = logError;
