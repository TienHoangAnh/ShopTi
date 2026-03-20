const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/init');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { normalizeSizesInput, enrichProductRow } = require('../utils/productSizes');

const router = express.Router();
router.use(authenticate);
router.use(requireAdmin);

// Dashboard stats
router.get('/dashboard', (req, res) => {
  const ordersCount = db.prepare('SELECT COUNT(*) as count FROM orders').get();
  const productsCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
  const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  const completedOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'delivered'").get();
  const cancelledOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'cancelled'").get();
  const totalRevenueEstimated = db.prepare('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders').get();
  const actualRevenue = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'delivered'").get();
  const recentOrders = db.prepare(`
    SELECT o.id, o.status, o.total_amount, o.created_at, u.email
    FROM orders o JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC LIMIT 10
  `).all();
  res.json({
    success: true,
    dashboard: {
      totalOrders: ordersCount.count,
      totalProducts: productsCount.count,
      totalUsers: usersCount.count,
      completedOrders: completedOrders.count,
      cancelledOrders: cancelledOrders.count,
      totalRevenueEstimated: totalRevenueEstimated.total,
      actualRevenue: actualRevenue.total,
      recentOrders,
    },
  });
});

// Categories (for product form)
router.get('/categories', (req, res) => {
  const categories = db.prepare('SELECT id, name FROM categories ORDER BY name').all();
  res.json({ success: true, categories });
});

// Products CRUD
router.get('/products', (req, res) => {
  const products = db.prepare(`
    SELECT p.*, c.name AS category_name FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    ORDER BY p.created_at DESC
  `).all();
  res.json({ success: true, products: products.map(enrichProductRow) });
});

router.post('/products', (req, res) => {
  const { name, description, price, image_url, stock, category_id, color } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ success: false, message: 'name and price required' });
  }
  const sz = normalizeSizesInput(req.body);
  const result = db.prepare(
    'INSERT INTO products (name, description, price, image_url, stock, category_id, size, sizes_json, size_tags, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    name,
    description || '',
    parseFloat(price),
    image_url || '/images/placeholder.svg',
    parseInt(stock, 10) || 0,
    category_id ? parseInt(category_id, 10) : null,
    sz.size,
    sz.sizes_json,
    sz.size_tags,
    color && String(color).trim() ? String(color).trim() : null
  );
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, product: enrichProductRow(product) });
});

router.get('/products/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, product: enrichProductRow(product) });
});

router.put('/products/:id', (req, res) => {
  const { name, description, price, image_url, stock, category_id, color } = req.body;
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });
  const sz =
    req.body.sizes !== undefined || req.body.size !== undefined
      ? normalizeSizesInput(req.body)
      : null;
  db.prepare(`
    UPDATE products SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      price = COALESCE(?, price),
      image_url = COALESCE(?, image_url),
      stock = COALESCE(?, stock),
      category_id = ?,
      size = ?,
      sizes_json = ?,
      size_tags = ?,
      color = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name ?? existing.name,
    description !== undefined ? description : existing.description,
    price !== undefined ? parseFloat(price) : existing.price,
    image_url ?? existing.image_url,
    stock !== undefined ? parseInt(stock, 10) : existing.stock,
    category_id !== undefined ? (category_id ? parseInt(category_id, 10) : null) : existing.category_id,
    sz ? sz.size : existing.size,
    sz ? sz.sizes_json : existing.sizes_json,
    sz ? sz.size_tags : existing.size_tags,
    color !== undefined ? (color && String(color).trim() ? String(color).trim() : null) : existing.color,
    req.params.id
  );
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json({ success: true, product: enrichProductRow(product) });
});

router.delete('/products/:id', (req, res) => {
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true });
});

// Orders management
router.get('/orders', (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, u.email, u.full_name
    FROM orders o JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC
  `).all();
  res.json({ success: true, orders });
});

router.get('/orders/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const user = db.prepare('SELECT email, full_name FROM users WHERE id = ?').get(order.user_id);
  res.json({ success: true, order: { ...order, items, user } });
});

router.put('/orders/:id', (req, res) => {
  const { status, cancel_reason } = req.body;
  const reason = cancel_reason == null ? '' : String(cancel_reason).trim();
  const valid = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!status || !valid.includes(status)) {
    return res.status(400).json({ success: false, message: 'Valid status required' });
  }
  const orderBefore = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!orderBefore) return res.status(404).json({ success: false, message: 'Order not found' });

  const run = db.transaction(() => {
    if (status === 'cancelled' && orderBefore.status !== 'cancelled') {
      db.prepare(`
        UPDATE orders
        SET status = ?,
            cancelled_by = ?,
            cancelled_by_user_id = ?,
            cancelled_at = CURRENT_TIMESTAMP,
            cancel_reason = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, 'admin', req.user.id, reason, req.params.id);
    } else {
      db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
    }
    // Khi hủy đơn: hoàn lại số lượng hàng vào kho (chỉ khi chuyển sang cancelled lần đầu)
    if (status === 'cancelled' && orderBefore.status !== 'cancelled') {
      const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(req.params.id);
      const updateStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
      for (const item of items) {
        updateStock.run(item.quantity, item.product_id);
      }
    }
  });
  run();

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  res.json({ success: true, order });
});

// Users management
router.get('/users', (req, res) => {
  const users = db.prepare('SELECT id, email, full_name, role, created_at FROM users ORDER BY created_at DESC').all();
  res.json({ success: true, users });
});

router.get('/users/:id', (req, res) => {
  const user = db.prepare('SELECT id, email, full_name, role, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user });
});

router.put('/users/:id', (req, res) => {
  const { full_name, role } = req.body;
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, message: 'User not found' });
  if (role && !['user', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }
  db.prepare(`
    UPDATE users SET
      full_name = COALESCE(?, full_name),
      role = COALESCE(?, role),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(full_name ?? existing.full_name, role ?? existing.role, req.params.id);
  const user = db.prepare('SELECT id, email, full_name, role, created_at FROM users WHERE id = ?').get(req.params.id);
  res.json({ success: true, user });
});

router.delete('/users/:id', (req, res) => {
  if (parseInt(req.params.id, 10) === req.user.id) {
    return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
  }
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true });
});

module.exports = router;
