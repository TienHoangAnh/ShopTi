const express = require('express');
const db = require('../database/init');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/store/me - current user's store registration status
router.get('/me', (req, res) => {
  const row = db
    .prepare('SELECT store_name, store_description, store_status, store_applied_at FROM users WHERE id = ?')
    .get(req.user.id);
  res.json({ success: true, store: row || { store_status: 'none' } });
});

// POST /api/store/apply - apply to open a store
router.post('/apply', (req, res) => {
  const { store_name, store_description } = req.body || {};
  const name = (store_name && String(store_name).trim()) || '';
  const desc = store_description == null ? '' : String(store_description).trim();
  if (!name) return res.status(400).json({ success: false, message: 'store_name is required' });

  const existing = db.prepare('SELECT store_status FROM users WHERE id = ?').get(req.user.id);
  if (existing && existing.store_status === 'pending') {
    return res.status(400).json({ success: false, message: 'Store application is pending' });
  }

  db.prepare(
    `UPDATE users
     SET store_name = ?,
         store_description = ?,
         store_status = 'pending',
         store_applied_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(name, desc, req.user.id);

  const out = db
    .prepare('SELECT store_name, store_description, store_status, store_applied_at FROM users WHERE id = ?')
    .get(req.user.id);
  res.status(201).json({ success: true, store: out });
});

module.exports = router;

