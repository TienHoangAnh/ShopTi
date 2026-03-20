const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'shopti.db');
const schemaPath = path.join(__dirname, 'schema.sql');

const db = new Database(dbPath);
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

// Migration: add new columns to existing DB
const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!userCols.includes('phone')) db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
if (!userCols.includes('address')) db.exec('ALTER TABLE users ADD COLUMN address TEXT');
// Seller/store fields (optional feature)
if (!userCols.includes('store_name')) db.exec('ALTER TABLE users ADD COLUMN store_name TEXT');
if (!userCols.includes('store_description')) db.exec('ALTER TABLE users ADD COLUMN store_description TEXT');
if (!userCols.includes('store_status')) db.exec("ALTER TABLE users ADD COLUMN store_status TEXT DEFAULT 'none'");
if (!userCols.includes('store_applied_at')) db.exec('ALTER TABLE users ADD COLUMN store_applied_at DATETIME');
const orderCols = db.prepare('PRAGMA table_info(orders)').all().map((c) => c.name);
if (!orderCols.includes('payment_method')) {
  db.exec("ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'cod'");
  db.exec("UPDATE orders SET payment_method = 'cod' WHERE payment_method IS NULL");
}
if (!orderCols.includes('receiver_name')) db.exec('ALTER TABLE orders ADD COLUMN receiver_name TEXT DEFAULT ""');
if (!orderCols.includes('receiver_phone')) db.exec('ALTER TABLE orders ADD COLUMN receiver_phone TEXT DEFAULT ""');
if (!orderCols.includes('cancelled_by')) db.exec("ALTER TABLE orders ADD COLUMN cancelled_by TEXT");
if (!orderCols.includes('cancelled_by_user_id')) db.exec('ALTER TABLE orders ADD COLUMN cancelled_by_user_id INTEGER');
if (!orderCols.includes('cancelled_at')) db.exec('ALTER TABLE orders ADD COLUMN cancelled_at DATETIME');
if (!orderCols.includes('cancel_reason')) db.exec('ALTER TABLE orders ADD COLUMN cancel_reason TEXT');

// Backfill for existing cancelled orders
try {
  db.exec("UPDATE orders SET cancelled_by = COALESCE(cancelled_by, 'user') WHERE status = 'cancelled' AND cancelled_by IS NULL");
  db.exec("UPDATE orders SET cancelled_at = COALESCE(cancelled_at, updated_at) WHERE status = 'cancelled' AND cancelled_at IS NULL");
  db.exec("UPDATE orders SET cancel_reason = COALESCE(cancel_reason, '') WHERE status = 'cancelled' AND cancel_reason IS NULL");
} catch (e) {}

const productCols = db.prepare('PRAGMA table_info(products)').all().map((c) => c.name);
if (!productCols.includes('category_id')) db.exec('ALTER TABLE products ADD COLUMN category_id INTEGER');
if (!productCols.includes('size')) db.exec('ALTER TABLE products ADD COLUMN size TEXT');
if (!productCols.includes('color')) db.exec('ALTER TABLE products ADD COLUMN color TEXT');
if (!productCols.includes('sizes_json')) db.exec('ALTER TABLE products ADD COLUMN sizes_json TEXT');
if (!productCols.includes('size_tags')) db.exec('ALTER TABLE products ADD COLUMN size_tags TEXT');

const { productSizesFromRow } = require('../utils/productSizes');

db.prepare('SELECT id, size, sizes_json, size_tags FROM products').all().forEach((row) => {
  const tags = productSizesFromRow(row).join('|');
  if (tags && (!row.size_tags || row.size_tags !== tags)) {
    db.prepare('UPDATE products SET size_tags = ? WHERE id = ?').run(tags, row.id);
  }
  if (!row.sizes_json && row.size) {
    const arr = productSizesFromRow(row);
    if (arr.length) {
      db.prepare('UPDATE products SET sizes_json = ? WHERE id = ?').run(JSON.stringify(arr), row.id);
    }
  }
});
if (productCols.includes('category_id')) {
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)');
  } catch (e) {}
}

// Ensure categories table exists (schema may have created it)
try {
  db.exec('CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
} catch (e) {}
const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
if (categoryCount.count === 0) {
  [
    'Thời Trang Nam',
    'Thời Trang Nữ',
    'Điện Thoại & Phụ Kiện',
    'Mẹ & Bé',
    'Thiết Bị Điện Tử',
    'Nhà Cửa & Đời Sống',
    'Máy Tính & Laptop',
    'Sắc Đẹp',
    'Máy Ảnh & Máy Quay Phim',
    'Sức Khỏe',
    'Đồng Hồ',
    'Giày Dép Nữ',
    'Giày Dép Nam',
    'Túi Ví Nữ',
    'Thiết Bị Điện Gia Dụng',
    'Phụ Kiện & Trang Sức Nữ',
    'Thể Thao & Du Lịch',
    'Bách Hóa Online',
    'Ô Tô & Xe Máy & Xe Đạp',
    'Nhà Sách Online',
    'Balo & Túi Ví Nam',
    'Thời Trang Trẻ Em',
    'Đồ Chơi',
    'Giặt Giũ & Chăm Sóc Nhà Cửa',
    'Chăm Sóc Thú Cưng',
    'Dụng cụ và thiết bị tiện ích',
  ].forEach((name) => {
    db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
  });
}

// Seed default admin if no users exist
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(
    'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)'
  ).run('admin@shopti.com', hash, 'Admin', 'admin');
}

// Seed sample products if none exist
const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
if (productCount.count === 0) {
  const cat = db.prepare('SELECT id FROM categories LIMIT 1').get();
  const cid = cat ? cat.id : null;
  const products = [
    ['Wireless Headphones', 'Premium noise-cancelling wireless headphones', 99.99, '/images/placeholder.svg', 50, cid, 'Free', 'Đen'],
    ['Smart Watch', 'Fitness and health tracking smartwatch', 149.99, '/images/placeholder.svg', 30, cid, 'One size', 'Đen'],
    ['Portable Speaker', 'Waterproof Bluetooth speaker', 79.99, '/images/placeholder.svg', 40, cid, null, 'Xanh'],
    ['USB-C Hub', '7-in-1 USB-C adapter', 49.99, '/images/placeholder.svg', 100, cid, null, 'Bạc'],
    ['Mechanical Keyboard', 'RGB mechanical gaming keyboard', 129.99, '/images/placeholder.svg', 25, cid, null, 'Đen'],
    ['Wireless Mouse', 'Ergonomic wireless mouse', 39.99, '/images/placeholder.svg', 80, cid, null, 'Trắng'],
  ];
  const insert = db.prepare('INSERT INTO products (name, description, price, image_url, stock, category_id, size, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (const p of products) {
    insert.run(...p);
  }
}

module.exports = db;
