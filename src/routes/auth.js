const express = require('express');
const router = express.Router();

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

module.exports = router;
