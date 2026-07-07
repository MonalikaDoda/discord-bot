const express = require('express');
const router = express.Router();
const Interaction = require('../models/Interaction');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.redirect('/login');
}

router.get('/login', (req, res) => {
  const errorMessage = req.query.error ? decodeURIComponent(req.query.error) : '';
  res.render('login', { errorMessage });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect('/dashboard');
  }

  const error = encodeURIComponent('Invalid username or password.');
  return res.redirect(`/login?error=${error}`);
});

router.get('/dashboard', requireAdmin, (req, res) => {
  res.render('dashboard');
});

router.get('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(() => {
      res.redirect('/login');
    });
  } else {
    res.redirect('/login');
  }
});

router.get('/api/logs', requireAdmin, async (req, res) => {
  try {
    const logs = await Interaction.find()
      .sort({ timestamp: -1 })
      .limit(100)
      .lean()
      .exec();

    return res.json(logs.map(log => ({
      interactionId: log.interactionId,
      commandName: log.commandName,
      userId: log.userId,
      inputText: log.inputText,
      aiTag: log.aiTag || null,
      aiSummary: log.aiSummary || null,
      timestamp: log.timestamp,
      actionTaken: 'Logged + mirrored to Slack'
    })));
  } catch (err) {
    console.error('Failed to read logs:', err.message || err);
    return res.status(500).json({ error: 'Failed to read logs' });
  }
});

module.exports = router;
