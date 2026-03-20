const express = require('express');
const db = require('../database/init');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/orders - list current user's orders
router.get('/', (req, res) => {
  const orders = db.prepare(`
    SELECT id, status, total_amount, shipping_address, cancelled_by, cancelled_by_user_id, cancelled_at, cancel_reason, created_at
    FROM orders WHERE user_id = ? ORDER BY created_at DESC
  `).all(req.user.id);
  res.json({ success: true, orders });
});

// PUT /api/orders/:id/cancel - phải đặt TRƯỚC GET /:id để không bị /:id bắt nhầm
const CANCEL_ALLOWED = ['pending', 'confirmed'];
router.put('/:id/cancel', (req, res) => {
  const { cancel_reason } = req.body || {};
  const reason = cancel_reason == null ? '' : String(cancel_reason).trim();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (!CANCEL_ALLOWED.includes(order.status)) {
    return res.status(400).json({
      success: false,
      message: 'Chỉ có thể hủy đơn khi trạng thái là Đang xử lý hoặc Đã xác nhận. Đơn đang giao hoặc đã giao không thể hủy.',
    });
  }
  const run = db.transaction(() => {
    db.prepare(`
      UPDATE orders
      SET status = ?,
          cancelled_by = ?,
          cancelled_by_user_id = ?,
          cancelled_at = CURRENT_TIMESTAMP,
          cancel_reason = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run('cancelled', 'user', req.user.id, reason, req.params.id);
    const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(req.params.id);
    const updateStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
    for (const item of items) updateStock.run(item.quantity, item.product_id);
  });
  run();
  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
  res.json({ success: true, order: { ...updated, items } });
});

// GET /api/orders/:id - single order with items (sau route /:id/cancel)
router.get('/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({ success: true, order: { ...order, items } });
});

// POST /api/orders - create order from cart (checkout)
// Body: receiver_name, receiver_phone, shipping_address, payment_method
router.post('/', (req, res) => {
  let { receiver_name, receiver_phone, shipping_address, payment_method } = req.body;
  payment_method = payment_method || 'cod';
  const allowedPayment = ['cod', 'bank', 'wallet'];
  if (!allowedPayment.includes(payment_method)) payment_method = 'cod';
  const name = (receiver_name && String(receiver_name).trim()) || '';
  const phone = (receiver_phone && String(receiver_phone).trim()) || '';
  const address = (shipping_address && String(shipping_address).trim()) || '';
  if (!name) return res.status(400).json({ success: false, message: 'receiver_name is required' });
  if (!phone) return res.status(400).json({ success: false, message: 'receiver_phone is required' });
  if (!address) return res.status(400).json({ success: false, message: 'shipping_address is required' });
  const cartItems = db.prepare(`
    SELECT c.id, c.product_id, c.quantity, p.name, p.price, p.stock
    FROM cart_items c
    JOIN products p ON p.id = c.product_id
    WHERE c.user_id = ?
  `).all(req.user.id);
  if (cartItems.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty' });
  }
  let total = 0;
  for (const item of cartItems) {
    if (item.quantity > item.stock) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for ${item.name}. Available: ${item.stock}`,
      });
    }
    total += item.price * item.quantity;
  }
  const insertOrder = db.prepare(
    'INSERT INTO orders (user_id, status, total_amount, receiver_name, receiver_phone, shipping_address, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertItem = db.prepare(
    'INSERT INTO order_items (order_id, product_id, quantity, price_at_order, product_name) VALUES (?, ?, ?, ?, ?)'
  );
  const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
  const deleteCart = db.prepare('DELETE FROM cart_items WHERE id = ?');

  const run = db.transaction(() => {
    const result = insertOrder.run(req.user.id, 'pending', total, name, phone, address, payment_method);
    const orderId = result.lastInsertRowid;
    for (const item of cartItems) {
      insertItem.run(orderId, item.product_id, item.quantity, item.price, item.name);
      updateStock.run(item.quantity, item.product_id);
      deleteCart.run(item.id);
    }
    return orderId;
  });

  const orderId = run();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
  res.status(201).json({ success: true, order: { ...order, items } });
});

module.exports = router;
