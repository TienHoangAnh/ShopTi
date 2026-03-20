const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const Category = require('../../models/Category');
const Shop = require('../../models/Shop');
const ShopPayment = require('../../models/ShopPayment');

async function dashboard(req, res) {
  const [totalOrders, totalProducts, totalUsers, completedOrders, cancelledOrders] = await Promise.all([
    Order.countDocuments({}),
    Product.countDocuments({}),
    User.countDocuments({}),
    Order.countDocuments({ status: 'delivered' }),
    Order.countDocuments({ status: 'cancelled' }),
  ]);

  const revenueAgg = await Order.aggregate([{ $group: { _id: null, total: { $sum: '$total_amount' } } }]);
  const actualAgg = await Order.aggregate([
    { $match: { status: 'delivered' } },
    { $group: { _id: null, total: { $sum: '$total_amount' } } },
  ]);
  const recentOrders = await Order.find({})
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('user', 'email')
    .select('_id status total_amount createdAt user')
    .lean();

  res.json({
    success: true,
    dashboard: {
      totalOrders,
      totalProducts,
      totalUsers,
      completedOrders,
      cancelledOrders,
      totalRevenueEstimated: revenueAgg[0]?.total || 0,
      actualRevenue: actualAgg[0]?.total || 0,
      recentOrders: recentOrders.map((o) => ({
        id: o._id.toString(),
        status: o.status,
        total_amount: o.total_amount,
        created_at: o.createdAt,
        email: o.user?.email || null,
      })),
    },
  });
}

async function categories(req, res) {
  const categories = await Category.find({}).sort({ name: 1 }).select('_id name').lean();
  res.json({ success: true, categories: categories.map((c) => ({ id: c._id.toString(), name: c.name })) });
}

async function usersList(req, res) {
  const users = await User.find({}).sort({ createdAt: -1 }).select('_id email full_name role createdAt').lean();
  res.json({
    success: true,
    users: users.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      created_at: u.createdAt,
    })),
  });
}

async function usersGet(req, res) {
  const u = await User.findById(req.params.id).select('_id email full_name role createdAt').lean();
  if (!u) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({
    success: true,
    user: { id: u._id.toString(), email: u.email, full_name: u.full_name, role: u.role, created_at: u.createdAt },
  });
}

async function usersUpdate(req, res) {
  const { full_name, role, password } = req.body || {};
  if (role && !['user', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }
  const patch = {};
  if (full_name !== undefined) patch.full_name = String(full_name).trim();
  if (role !== undefined) patch.role = role;
  if (password) patch.password_hash = bcrypt.hashSync(String(password), 10);
  const u = await User.findByIdAndUpdate(req.params.id, patch, { new: true })
    .select('_id email full_name role createdAt')
    .lean();
  if (!u) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({
    success: true,
    user: { id: u._id.toString(), email: u.email, full_name: u.full_name, role: u.role, created_at: u.createdAt },
  });
}

async function usersDelete(req, res) {
  if (String(req.params.id) === String(req.user.id)) {
    return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
  }
  const r = await User.deleteOne({ _id: req.params.id });
  if (r.deletedCount === 0) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true });
}

async function ordersList(req, res) {
  const orders = await Order.find({})
    .sort({ createdAt: -1 })
    .populate('user', 'email full_name')
    .lean();
  res.json({
    success: true,
    orders: orders.map((o) => ({
      id: o._id.toString(),
      status: o.status,
      total_amount: o.total_amount,
      created_at: o.createdAt,
      email: o.user?.email || null,
      full_name: o.user?.full_name || null,
      shipping_address: o.shipping_address,
      cancelled_by: o.cancelled_by || null,
      cancel_reason: o.cancel_reason || '',
    })),
  });
}

async function ordersGet(req, res) {
  const o = await Order.findById(req.params.id).populate('user', 'email full_name').lean();
  if (!o) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json({
    success: true,
    order: {
      id: o._id.toString(),
      status: o.status,
      total_amount: o.total_amount,
      receiver_name: o.receiver_name,
      receiver_phone: o.receiver_phone,
      shipping_address: o.shipping_address,
      payment_method: o.payment_method,
      cancelled_by: o.cancelled_by || null,
      cancel_reason: o.cancel_reason || '',
      created_at: o.createdAt,
      items: (o.items || []).map((it) => ({
        id: it._id?.toString(),
        product_id: it.product?.toString?.() || it.product,
        quantity: it.quantity,
        price_at_order: it.price_at_order,
        product_name: it.product_name,
      })),
      user: { email: o.user?.email || null, full_name: o.user?.full_name || null },
    },
  });
}

async function ordersUpdate(req, res) {
  const { status, cancel_reason } = req.body || {};
  const valid = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!status || !valid.includes(status)) {
    return res.status(400).json({ success: false, message: 'Valid status required' });
  }
  const reason = cancel_reason == null ? '' : String(cancel_reason).trim();
  const before = await Order.findById(req.params.id).lean();
  if (!before) return res.status(404).json({ success: false, message: 'Order not found' });

  // If cancelling for first time -> restock
  if (status === 'cancelled' && before.status !== 'cancelled') {
    for (const it of before.items || []) {
      await Product.findByIdAndUpdate(it.product, { $inc: { stock: it.quantity } });
    }
  }

  const patch =
    status === 'cancelled' && before.status !== 'cancelled'
      ? {
          status,
          cancelled_by: 'admin',
          cancelled_by_user: req.user.id,
          cancelled_at: new Date(),
          cancel_reason: reason,
        }
      : { status };

  const updated = await Order.findByIdAndUpdate(req.params.id, patch, { new: true }).lean();
  res.json({ success: true, order: { id: updated._id.toString(), status: updated.status } });
}

module.exports = {
  dashboard,
  categories,
  usersList,
  usersGet,
  usersUpdate,
  usersDelete,
  ordersList,
  ordersGet,
  ordersUpdate,
  confirmPayment,
};

async function confirmPayment(req, res) {
  const { payment_code } = req.body || {};
  if (!payment_code) return res.status(400).json({ success: false, message: 'payment_code is required' });

  const payment = await ShopPayment.findOne({ payment_code }).populate('shop').lean();
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
  if (payment.status === 'paid') return res.json({ success: true, payment: { payment_code, status: 'paid' } });

  if (!payment.otp_store_verified || !payment.otp_phone_verified) {
    return res.status(400).json({ success: false, message: 'OTP not verified yet' });
  }

  await ShopPayment.updateOne({ payment_code }, { $set: { status: 'paid', paid_at: new Date() } });
  await Shop.updateOne({ _id: payment.shop._id }, { $set: { status: 'active' } });

  await User.findByIdAndUpdate(payment.user, {
    $set: {
      store_name: payment.shop.shop_name,
      store_description: payment.shop.description,
      store_status: 'approved',
    },
  });

  res.json({ success: true, payment: { payment_code, status: 'paid' }, shop: { store_status: 'approved' } });
}

