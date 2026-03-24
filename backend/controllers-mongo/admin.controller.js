const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const Category = require('../../models/Category');
const Shop = require('../../models/Shop');
const ShopPayment = require('../../models/ShopPayment');

function toNumber(n) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? x : 0;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function buildDashboardRange(query) {
  const now = new Date();
  const mode = String(query?.mode || 'month').toLowerCase() === 'year' ? 'year' : 'month';
  const year = Number.parseInt(query?.year, 10) || now.getFullYear();
  const monthRaw = Number.parseInt(query?.month, 10);
  const month = Number.isInteger(monthRaw) && monthRaw >= 1 && monthRaw <= 12 ? monthRaw : now.getMonth() + 1;

  if (mode === 'year') {
    const start = new Date(year, 0, 1, 0, 0, 0, 0);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);
    const labels = Array.from({ length: 12 }, (_, i) => `T${i + 1}`);
    return {
      mode,
      year,
      month,
      start,
      end,
      labels,
      bucketKey: (d) => d.getMonth(),
      bucketCount: 12,
    };
  }

  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  const daysInMonth = new Date(year, month, 0).getDate();
  const labels = Array.from({ length: daysInMonth }, (_, i) => pad2(i + 1));
  return {
    mode,
    year,
    month,
    start,
    end,
    labels,
    bucketKey: (d) => d.getDate() - 1,
    bucketCount: daysInMonth,
  };
}

async function dashboard(req, res) {
  const range = buildDashboardRange(req.query || {});
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);

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

  const [
    totalStores,
    activeStores,
    lockedStores,
    registrationsToday,
    registrationsThisMonth,
    filteredRegistrations,
    shopActivationRevenueAgg,
    filteredOrders,
    filteredShops,
    deliveredItemsAgg,
    trustedUsersAgg,
    currentMonthRevenueAgg,
    storeApplicantsCount,
  ] = await Promise.all([
    Shop.countDocuments({}),
    Shop.countDocuments({ status: 'active' }),
    Shop.countDocuments({ status: 'locked' }),
    Shop.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
    Shop.countDocuments({ createdAt: { $gte: monthStart, $lte: monthEnd } }),
    Shop.countDocuments({ createdAt: { $gte: range.start, $lte: range.end } }),
    ShopPayment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Order.find({ createdAt: { $gte: range.start, $lte: range.end }, status: 'delivered' }).select('createdAt total_amount').lean(),
    Shop.find({ createdAt: { $gte: range.start, $lte: range.end } }).select('createdAt').lean(),
    Order.aggregate([
      { $match: { status: 'delivered' } },
      { $unwind: '$items' },
      { $group: { _id: null, total: { $sum: '$items.quantity' } } },
    ]),
    Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: '$user' } },
      { $count: 'total' },
    ]),
    Order.aggregate([
      { $match: { status: 'delivered', createdAt: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } },
    ]),
    User.countDocuments({ store_status: { $in: ['pending', 'approved', 'locked'] } }),
  ]);

  const revenueSeries = Array.from({ length: range.bucketCount }, () => 0);
  for (const o of filteredOrders) {
    const d = new Date(o.createdAt);
    const idx = range.bucketKey(d);
    if (idx >= 0 && idx < revenueSeries.length) revenueSeries[idx] += toNumber(o.total_amount);
  }

  const registrationSeries = Array.from({ length: range.bucketCount }, () => 0);
  for (const s of filteredShops) {
    const d = new Date(s.createdAt);
    const idx = range.bucketKey(d);
    if (idx >= 0 && idx < registrationSeries.length) registrationSeries[idx] += 1;
  }

  const filteredRevenue = revenueSeries.reduce((acc, n) => acc + toNumber(n), 0);
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
      totalStores,
      activeStores,
      lockedStores,
      registrationsToday,
      registrationsThisMonth,
      shopActivationRevenueVnd: shopActivationRevenueAgg[0]?.total || 0,
      productsSold: deliveredItemsAgg[0]?.total || 0,
      trustedUsers: trustedUsersAgg[0]?.total || 0,
      currentMonthRevenue: currentMonthRevenueAgg[0]?.total || 0,
      storeApplicants: storeApplicantsCount || 0,
      filter: {
        mode: range.mode,
        year: range.year,
        month: range.month,
        start: range.start,
        end: range.end,
      },
      filtered: {
        registrations: filteredRegistrations,
        deliveredRevenue: filteredRevenue,
      },
      chart: {
        labels: range.labels,
        revenueSeries,
        registrationSeries,
      },
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
  const roleFilter = String(req.query?.role || '').trim().toLowerCase();
  const query = {};
  if (['user', 'store', 'admin'].includes(roleFilter)) query.role = roleFilter;
  const users = await User.find(query).sort({ createdAt: -1 }).select('_id email full_name role store_status createdAt').lean();
  res.json({
    success: true,
    users: users.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      store_status: u.store_status || 'none',
      created_at: u.createdAt,
    })),
  });
}

async function usersGet(req, res) {
  const u = await User.findById(req.params.id).select('_id email full_name role store_status createdAt').lean();
  if (!u) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({
    success: true,
    user: { id: u._id.toString(), email: u.email, full_name: u.full_name, role: u.role, store_status: u.store_status || 'none', created_at: u.createdAt },
  });
}

async function usersUpdate(req, res) {
  const { full_name, role, password } = req.body || {};
  if (role && !['user', 'store', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }
  const patch = {};
  if (full_name !== undefined) patch.full_name = String(full_name).trim();
  if (role !== undefined) patch.role = role;
  if (password) patch.password_hash = bcrypt.hashSync(String(password), 10);
  const u = await User.findByIdAndUpdate(req.params.id, patch, { new: true })
    .select('_id email full_name role store_status createdAt')
    .lean();
  if (!u) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({
    success: true,
    user: { id: u._id.toString(), email: u.email, full_name: u.full_name, role: u.role, store_status: u.store_status || 'none', created_at: u.createdAt },
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

async function usersStoreLock(req, res) {
  const userId = req.params.id;
  if (!userId) return res.status(400).json({ success: false, message: 'User id is required' });
  const lockRequested = !!(req.body && req.body.locked);

  const user = await User.findById(userId).lean();
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.role !== 'store') {
    return res.status(400).json({ success: false, message: 'Only store accounts can be locked/unlocked' });
  }

  const shop = await Shop.findOne({ user: userId }).exec();
  if (!shop) return res.status(404).json({ success: false, message: 'Shop not found for this user' });

  if (lockRequested) {
    shop.status = 'locked';
    await shop.save();
    await User.findByIdAndUpdate(userId, { $set: { store_status: 'locked' } });
    return res.json({ success: true, locked: true });
  }

  shop.status = 'active';
  await shop.save();
  await User.findByIdAndUpdate(userId, { $set: { store_status: 'approved' } });
  return res.json({ success: true, locked: false });
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
  usersStoreLock,
  ordersList,
  ordersGet,
  ordersUpdate,
  storeRequestsList,
  storeRequestsHistory,
  storeRequestApprove,
  storeRequestReject,
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

async function storeRequestsList(req, res) {
  const payments = await ShopPayment.find({ status: 'pending', user_marked_paid_at: { $ne: null } })
    .populate('user', '_id email full_name role')
    .populate('shop')
    .sort({ user_marked_paid_at: -1 })
    .lean();

  const requests = payments
    .filter((p) => p?.shop?.status !== 'rejected')
    .map((p) => ({
    payment_id: p._id.toString(),
    payment_code: p.payment_code,
    amount: p.amount,
    transfer_content: p.transfer_content,
    user_marked_paid_at: p.user_marked_paid_at || null,
    user: p.user
      ? {
          id: p.user._id.toString(),
          email: p.user.email,
          full_name: p.user.full_name,
          role: p.user.role,
        }
      : null,
    shop: p.shop
      ? {
          id: p.shop._id.toString(),
          shop_name: p.shop.shop_name,
          description: p.shop.description || '',
          sender_name: p.shop.sender_name,
          sender_phone: p.shop.sender_phone,
          province: p.shop.province,
          district: p.shop.district,
          ward: p.shop.ward,
          detail_address: p.shop.detail_address,
          shipping_providers: p.shop.shipping_providers || [],
          bank_account_name: p.shop.bank_account_name,
          bank_account_number: p.shop.bank_account_number,
          bank_name: p.shop.bank_name,
          terms_accepted: !!p.shop.terms_accepted,
          terms_accepted_at: p.shop.terms_accepted_at || null,
          status: p.shop.status,
          applied_at: p.shop.applied_at || null,
        }
      : null,
  }));

  res.json({ success: true, requests });
}

function mapStoreRequestStatus(payment, nowMs = Date.now()) {
  if (!payment) return 'unknown';
  if (payment.status === 'paid') return 'approved';
  if (payment.shop?.status === 'rejected') return 'rejected';
  if (payment.status === 'pending' && payment.expires_at && new Date(payment.expires_at).getTime() < nowMs) return 'cancelled';
  if (payment.status === 'pending') return 'pending';
  return 'unknown';
}

async function storeRequestsHistory(req, res) {
  const statusFilter = String(req.query?.status || 'all').trim().toLowerCase();
  const nowMs = Date.now();

  const payments = await ShopPayment.find({})
    .populate('user', '_id email full_name role')
    .populate('shop')
    .sort({ createdAt: -1 })
    .lean();

  const rows = payments
    .filter((p) => p.user_marked_paid_at || p.status === 'paid' || p.shop?.status === 'rejected')
    .map((p) => {
      const requestStatus = mapStoreRequestStatus(p, nowMs);
      return {
        payment_id: p._id.toString(),
        payment_code: p.payment_code,
        amount: p.amount,
        request_status: requestStatus,
        created_at: p.createdAt,
        user_marked_paid_at: p.user_marked_paid_at || null,
        paid_at: p.paid_at || null,
        admin_reviewed_at: p.admin_reviewed_at || null,
        user: p.user
          ? {
              id: p.user._id.toString(),
              email: p.user.email,
              full_name: p.user.full_name,
              role: p.user.role,
            }
          : null,
        shop: p.shop
          ? {
              id: p.shop._id.toString(),
              shop_name: p.shop.shop_name,
              status: p.shop.status,
              sender_name: p.shop.sender_name,
              sender_phone: p.shop.sender_phone,
            }
          : null,
      };
    })
    .filter((row) => statusFilter === 'all' || row.request_status === statusFilter);

  res.json({ success: true, requests: rows });
}

async function storeRequestApprove(req, res) {
  const payment = await ShopPayment.findById(req.params.id).populate('shop').exec();
  if (!payment) return res.status(404).json({ success: false, message: 'Request not found' });
  if (payment.status !== 'pending') {
    return res.status(400).json({ success: false, message: 'Request already processed' });
  }
  if (!payment.user_marked_paid_at) {
    return res.status(400).json({ success: false, message: 'User has not marked payment yet' });
  }

  payment.status = 'paid';
  payment.paid_at = new Date();
  payment.admin_reviewed_at = new Date();
  payment.otp_store_verified = true;
  payment.otp_phone_verified = true;
  await payment.save();

  if (payment.shop) {
    payment.shop.status = 'active';
    await payment.shop.save();
  }

  await User.findByIdAndUpdate(payment.user, {
    $set: {
      role: 'store',
      store_status: 'approved',
      store_name: payment.shop?.shop_name || null,
      store_description: payment.shop?.description || '',
    },
  });

  res.json({ success: true });
}

async function storeRequestReject(req, res) {
  const payment = await ShopPayment.findById(req.params.id).populate('shop').exec();
  if (!payment) return res.status(404).json({ success: false, message: 'Request not found' });
  if (payment.status === 'paid') {
    return res.status(400).json({ success: false, message: 'Request already approved' });
  }
  if (!payment.user_marked_paid_at) {
    return res.status(400).json({ success: false, message: 'User has not marked payment yet' });
  }

  payment.admin_reviewed_at = new Date();
  await payment.save();

  if (payment.shop) {
    payment.shop.status = 'rejected';
    await payment.shop.save();
  }

  await User.findByIdAndUpdate(payment.user, {
    $set: {
      role: 'user',
      store_status: 'rejected',
    },
  });

  res.json({ success: true });
}

