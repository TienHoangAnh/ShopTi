/**
 * Clear all vouchers and user-vouchers (MongoDB).
 * Run: node scripts/clear-vouchers.js
 */
const path = require('path');
const rootEnv = path.join(__dirname, '..', '.env');
const backendEnv = path.join(__dirname, '..', 'backend', '.env');
require('dotenv').config({ path: rootEnv });
require('dotenv').config({ path: backendEnv });

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Thiếu MONGODB_URI. Thêm vào ShopTi/.env hoặc ShopTi/backend/.env rồi chạy lại.');
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  const dbName = mongoose.connection.db?.databaseName;
  console.log('[clear-vouchers] Connected DB:', dbName || '(default)');

  const Voucher = require('../models/Voucher');
  const UserVoucher = require('../models/UserVoucher');

  const uv = await UserVoucher.deleteMany({});
  const v = await Voucher.deleteMany({});
  console.log('[clear-vouchers] Deleted user_vouchers:', uv.deletedCount);
  console.log('[clear-vouchers] Deleted vouchers:', v.deletedCount);

  await mongoose.disconnect();
  console.log('[clear-vouchers] Done.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

