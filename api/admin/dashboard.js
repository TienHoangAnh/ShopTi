const { connectDB } = require('../../lib/mongodb');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const User = require('../../models/User');
const { authenticate, requireAdmin } = require('../../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
    await connectDB();
    const auth = await authenticate(req);
    if (auth.error) return res.status(auth.error.status).json({ success: false, message: auth.error.message });
    const adminCheck = requireAdmin(auth.user);
    if (adminCheck.error) return res.status(adminCheck.error.status).json({ success: false, message: adminCheck.error.message });

    const [
      totalOrders,
      totalProducts,
      totalUsers,
      completedOrders,
      cancelledOrders,
      totalRevenueEstimated,
      actualRevenue,
      recentOrdersRaw,
    ] = await Promise.all([
      Order.countDocuments(),
      Product.countDocuments(),
      User.countDocuments(),
      Order.countDocuments({ status: 'delivered' }),
      Order.countDocuments({ status: 'cancelled' }),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$total_amount' } } }]).then((r) => (r[0]?.total ?? 0)),
      Order.aggregate([{ $match: { status: 'delivered' } }, { $group: { _id: null, total: { $sum: '$total_amount' } } }]).then((r) => (r[0]?.total ?? 0)),
      Order.find().sort({ createdAt: -1 }).limit(10).populate('user', 'email').lean(),
    ]);

    const recentOrders = recentOrdersRaw.map((o) => ({
      id: o._id.toString(),
      status: o.status,
      total_amount: o.total_amount,
      created_at: o.createdAt,
      email: o.user?.email,
    }));

    res.json({
      success: true,
      dashboard: {
        totalOrders,
        totalProducts,
        totalUsers,
        completedOrders,
        cancelledOrders,
        totalRevenueEstimated,
        actualRevenue,
        recentOrders,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
