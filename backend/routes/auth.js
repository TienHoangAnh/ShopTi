const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/init');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { email, password, full_name } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ success: false, message: 'Email, password and full_name are required' });
  }
  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)'
    ).run(email, hash, full_name, 'user');
    const user = db
      .prepare('SELECT id, email, full_name, phone, address, role, store_name, store_description, store_status, store_applied_at FROM users WHERE id = ?')
      .get(result.lastInsertRowid);
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ success: true, token, user });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    throw e;
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }
  const user = db
    .prepare('SELECT id, email, full_name, phone, address, role, store_name, store_description, store_status, store_applied_at, password_hash FROM users WHERE email = ?')
    .get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
  const { password_hash, ...safeUser } = user;
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, user: safeUser });
});

// GET /api/auth/me (current user, có phone + address cho checkout)
router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, user: req.user });
});

// PUT /api/auth/profile - cập nhật thông tin cá nhân (full_name, phone, address)
router.put('/profile', authenticate, (req, res) => {
  const { full_name, phone, address } = req.body;
  const updates = [];
  const params = [];
  if (full_name !== undefined) {
    updates.push('full_name = ?');
    params.push(String(full_name).trim());
  }
  if (phone !== undefined) {
    updates.push('phone = ?');
    params.push(phone === null || phone === '' ? null : String(phone).trim());
  }
  if (address !== undefined) {
    updates.push('address = ?');
    params.push(address === null || address === '' ? null : String(address).trim());
  }
  if (updates.length === 0) {
    return res.status(400).json({ success: false, message: 'No fields to update' });
  }
  params.push(req.user.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...params);
  const user = db
    .prepare('SELECT id, email, full_name, phone, address, role, store_name, store_description, store_status, store_applied_at FROM users WHERE id = ?')
    .get(req.user.id);
  res.json({ success: true, user });
});

module.exports = router;
