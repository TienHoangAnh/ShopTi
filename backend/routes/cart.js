const express = require('express');
const db = require('../database/init');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/cart - get current user's cart with product details
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.product_id, c.quantity, p.name, p.price, p.image_url, p.stock
    FROM cart_items c
    JOIN products p ON p.id = c.product_id
    WHERE c.user_id = ?
  `).all(req.user.id);
  res.json({ success: true, items: rows });
});

// POST /api/cart - add or update cart item
router.post('/', (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  if (!product_id || quantity < 1) {
    return res.status(400).json({ success: false, message: 'product_id and positive quantity required' });
  }
  const product = db.prepare('SELECT id, stock FROM products WHERE id = ?').get(product_id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  const qty = Math.min(quantity, product.stock);
  db.prepare(`
    INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)
    ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity
  `).run(req.user.id, product_id, qty);
  const updated = db.prepare('SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?')
    .get(req.user.id, product_id);
  res.json({ success: true, quantity: updated.quantity });
});

// PUT /api/cart/:id - update cart item quantity
router.put('/:id', (req, res) => {
  const { quantity } = req.body;
  if (quantity === undefined || quantity < 0) {
    return res.status(400).json({ success: false, message: 'Valid quantity required' });
  }
  const item = db.prepare('SELECT * FROM cart_items WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Cart item not found' });
  }
  if (quantity === 0) {
    db.prepare('DELETE FROM cart_items WHERE id = ?').run(req.params.id);
    return res.json({ success: true, quantity: 0 });
  }
  const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(item.product_id);
  const qty = Math.min(quantity, product.stock);
  db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(qty, req.params.id);
  res.json({ success: true, quantity: qty });
});

// DELETE /api/cart/:id - remove cart item
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) {
    return res.status(404).json({ success: false, message: 'Cart item not found' });
  }
  res.json({ success: true });
});

module.exports = router;
