/**
 * Thêm sản phẩm mẫu (theo catalog) nếu chưa có cùng name + brand.
 * Chạy: npm run seed:demo-products
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const mongoose = require('mongoose');
const { demoProductRows } = require('./demo-products-catalog');
const Category = require('../models/Category');
const Product = require('../models/Product');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Thiếu MONGODB_URI');
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  const categories = await Category.find().lean();
  const nameToId = {};
  categories.forEach((c) => {
    nameToId[c.name] = c._id;
  });
  const rows = demoProductRows(nameToId);
  let inserted = 0;
  let skipped = 0;
  for (const r of rows) {
    const exists = await Product.findOne({ name: r.name, brand: r.brand || null }).lean();
    if (exists) {
      skipped++;
      continue;
    }
    await Product.create(r);
    inserted++;
  }
  console.log('[seed:demo-products] Thêm mới:', inserted, '| Bỏ qua (đã có):', skipped);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
