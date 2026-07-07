const express = require('express');
const router = express.Router();
const ErrorLog = require('../models/ErrorLog');
const auth = require('./auth');
const requireAdmin = auth.requireAdmin;

router.get('/api/errors', requireAdmin, async (req, res) => {
  try {
    const errors = await ErrorLog.find().sort({ timestamp: -1 }).limit(50).lean().exec();
    res.json(errors);
  } catch (err) {
    console.error('Failed to fetch error logs:', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch error logs' });
  }
});

module.exports = router;
