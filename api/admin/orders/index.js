const { connectDB } = require('../../../lib/mongodb');
const Order = require('../../../models/Order');
const { authenticate, requireAdmin } = require('../../../lib/auth');

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

    const orders = await Order.find().populate('user', 'email full_name').sort({ createdAt: -1 }).lean();
    const out = orders.map((o) => ({
      id: o._id.toString(),
      user_id: o.user?._id?.toString?.() || o.user?.toString?.(),
      email: o.user?.email,
      full_name: o.user?.full_name,
      status: o.status,
      total_amount: o.total_amount,
      receiver_name: o.receiver_name,
      receiver_phone: o.receiver_phone,
      shipping_address: o.shipping_address,
      payment_method: o.payment_method,
      created_at: o.createdAt,
    }));
    res.json({ success: true, orders: out });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
