const path = require('path');
// Đọc root .env trước, rồi backend/.env (chỉ thêm biến chưa có)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const DB_TYPE = String(process.env.DB_TYPE || 'sqlite').toLowerCase();
const dbTypeRaw = process.env.DB_TYPE;
console.log(
  `[DB] DB_TYPE=${dbTypeRaw == null || dbTypeRaw === '' ? '(unset → sqlite)' : dbTypeRaw} → ${DB_TYPE === 'mongodb' ? 'MongoDB + connectDB()' : 'SQLite'}`
);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Public config for frontend (Mapbox token for checkout map)
app.get('/api/config', (req, res) => {
  res.json({
    mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN || '',
  });
});

function mountSqliteRoutes() {
  require('./database/init');

  const authRoutes = require('./routes/auth');
  const productRoutes = require('./routes/products');
  const categoriesRoutes = require('./routes/categories');
  const cartRoutes = require('./routes/cart');
  const orderRoutes = require('./routes/orders');
  const adminRoutes = require('./routes/admin');
  const storeRoutes = require('./routes/store');

  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoriesRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/store', storeRoutes);
}

function mountMongoRoutes() {
  const authRoutes = require('./routes-mongo/auth');
  const productRoutes = require('./routes-mongo/products');
  const categoriesRoutes = require('./routes-mongo/categories');
  const cartRoutes = require('./routes-mongo/cart');
  const orderRoutes = require('./routes-mongo/orders');
  const voucherRoutes = require('./routes-mongo/vouchers');
  const adminRoutes = require('./routes-mongo/admin');
  const storeRoutes = require('./routes-mongo/store');

  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoriesRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/vouchers', voucherRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/store', storeRoutes);
}

/** Phải gọi SAU khi mount mọi route /api/* (SQLite hoặc Mongo) */
function mountApi404StaticAndSpa() {
  app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: 'Not found' });
  });

  app.use(express.static(path.join(__dirname, '..', 'frontend')));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  });

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error',
    });
  });
}

function start() {
  app.listen(PORT, () => {
    console.log(`ShopTi server running at http://localhost:${PORT}`);
  });
}

if (DB_TYPE === 'mongodb') {
  const { connectDB } = require('../lib/mongodb');
  connectDB()
    .then(() => {
      const mongoose = require('mongoose');
      const dbName = mongoose.connection.db?.databaseName;
      console.log('[DB] MongoDB connected (lib/mongodb connectDB OK)', dbName || mongoose.connection.host || '');
      mountMongoRoutes();
      mountApi404StaticAndSpa();
      start();
    })
    .catch((err) => {
      console.error('Failed to connect MongoDB', err);
      process.exit(1);
    });
} else {
  console.log('[DB] SQLite (connectDB không gọi – chỉ dùng better-sqlite3)');
  mountSqliteRoutes();
  mountApi404StaticAndSpa();
  start();
}
