const express = require('express');
const db = require('../database/init');

const router = express.Router();

// GET /api/categories - list all categories
router.get('/', (req, res) => {
  const categories = db.prepare('SELECT id, name FROM categories ORDER BY name').all();
  res.json({ success: true, categories });
});

module.exports = router;
