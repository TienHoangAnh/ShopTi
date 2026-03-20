/**
 * Seed MongoDB: admin (nếu chưa có), categories, sample products.
 * Chạy từ root: npm run seed
 * Cần MONGODB_URI trong .env (root hoặc backend/.env)
 */
const path = require('path');
const rootEnv = path.join(__dirname, '..', '.env');
const backendEnv = path.join(__dirname, '..', 'backend', '.env');
require('dotenv').config({ path: rootEnv });
require('dotenv').config({ path: backendEnv });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Thiếu MONGODB_URI. Thêm vào ShopTi/.env hoặc ShopTi/backend/.env rồi chạy lại.');
  process.exit(1);
}

const ADMIN_EMAIL = 'admin@shopti.com';
const ADMIN_PASSWORD = 'admin123';

const UserSchema = new mongoose.Schema(
  { email: String, password_hash: String, full_name: String, phone: String, address: String, role: String },
  { timestamps: true }
);
const CategorySchema = new mongoose.Schema({ name: { type: String, unique: true } }, { timestamps: true });
const ProductSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    price: Number,
    image_url: String,
    stock: Number,
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    brand: String,
    sizes: [String],
    size_tags: String,
    size: String,
    color: String,
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const { demoProductRows } = require('./demo-products-catalog');

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const dbName = mongoose.connection.db?.databaseName;
  console.log('[seed] Đã kết nối MongoDB, database:', dbName || '(default)');

  const totalUsers = await User.countDocuments();
  const admin = await User.findOne({ email: ADMIN_EMAIL });
  if (!admin) {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    await User.create({
      email: ADMIN_EMAIL,
      password_hash: hash,
      full_name: 'Admin',
      role: 'admin',
    });
    console.log(`[seed] Đã tạo admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } else {
    console.log(`[seed] Admin đã tồn tại (${ADMIN_EMAIL}), bỏ qua. Tổng user trong DB: ${totalUsers}`);
  }

  const REQUIRED_CATEGORIES = [
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
  ];

  // Bổ sung các category còn thiếu (không chỉ khi DB rỗng)
  const existing = await Category.find().select('name').lean();
  const existingSet = new Set((existing || []).map((c) => c.name));
  const missingNames = REQUIRED_CATEGORIES.filter((n) => !existingSet.has(n));
  if (missingNames.length) {
    await Category.insertMany(missingNames.map((name) => ({ name })), { ordered: false });
    console.log('[seed] Đã bổ sung categories còn thiếu:', missingNames.length);
  } else {
    console.log('[seed] categories đã đầy đủ');
  }

  // dùng lại biến categories cho phần seed product
  let categories = await Category.find().lean();
  const productCount = await Product.countDocuments();
  if (productCount === 0) {
    const nameToId = {};
    categories.forEach((c) => {
      nameToId[c.name] = c._id;
    });
    const rows = demoProductRows(nameToId);
    if (rows.length) {
      await Product.insertMany(rows);
      console.log('[seed] Đã tạo', rows.length, 'sản phẩm mẫu (theo danh mục + hãng)');
    }
  }

  await mongoose.disconnect();
  console.log('[seed] Xong.');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
