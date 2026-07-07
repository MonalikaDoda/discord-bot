const express = require('express');
const router = express.Router();
const CommandConfig = require('../models/CommandConfig');
const auth = require('./auth');
const requireAdmin = auth.requireAdmin;

router.get('/api/config', requireAdmin, async (req, res) => {
  try {
    const configs = await CommandConfig.find().lean().exec();
    res.json(configs);
  } catch (err) {
    console.error('Failed to fetch command config:', err.message || err);
    res.status(500).json({ error: 'Failed to fetch command config' });
  }
});

router.post('/api/config', requireAdmin, async (req, res) => {
  const { keyword, tag } = req.body || {};
  if (!keyword || !tag) return res.status(400).json({ error: 'keyword and tag are required' });

  try {
    const created = await CommandConfig.create({ keyword, tag });
    res.status(201).json(created);
  } catch (err) {
    console.error('Failed to create command config:', err.message || err);
    res.status(500).json({ error: 'Failed to create command config' });
  }
});

router.delete('/api/config/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await CommandConfig.findByIdAndDelete(id).exec();
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete command config:', err.message || err);
    res.status(500).json({ error: 'Failed to delete command config' });
  }
});

module.exports = router;
