const { connectDB } = require('../../../lib/mongodb');
const Order = require('../../../models/Order');
const Product = require('../../../models/Product');
const { authenticate, requireAdmin } = require('../../../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const method = req.method;
  if (method !== 'GET' && method !== 'PUT') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
    await connectDB();
    const auth = await authenticate(req);
    if (auth.error) return res.status(auth.error.status).json({ success: false, message: auth.error.message });
    const adminCheck = requireAdmin(auth.user);
    if (adminCheck.error) return res.status(adminCheck.error.status).json({ success: false, message: adminCheck.error.message });

    const id = req.query.id || require('../../../lib/getPathParam').getPathParam(req, 'api/admin/orders/', 'id');
    if (!id) return res.status(400).json({ success: false, message: 'Order id required' });

    const order = await Order.findById(id).populate('user', 'email full_name').lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (method === 'GET') {
      const out = {
        id: order._id.toString(),
        user_id: order.user?._id?.toString?.() || order.user?.toString?.(),
        user: { email: order.user?.email, full_name: order.user?.full_name },
        status: order.status,
        total_amount: order.total_amount,
        receiver_name: order.receiver_name,
        receiver_phone: order.receiver_phone,
        shipping_address: order.shipping_address,
        payment_method: order.payment_method,
        cancelled_by: order.cancelled_by || null,
        cancelled_by_user_id: order.cancelled_by_user?.toString?.() || null,
        cancelled_at: order.cancelled_at || null,
        cancel_reason: order.cancel_reason || '',
        created_at: order.createdAt,
        items: (order.items || []).map((i) => ({
          id: i._id?.toString(),
          product_id: i.product?.toString?.(),
          quantity: i.quantity,
          price_at_order: i.price_at_order,
          product_name: i.product_name,
        })),
      };
      return res.json({ success: true, order: out });
    }

    if (method === 'PUT') {
      const { status, cancel_reason } = req.body || {};
      const reason = cancel_reason == null ? '' : String(cancel_reason).trim();
      const valid = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
      if (!status || !valid.includes(status)) {
        return res.status(400).json({ success: false, message: 'Valid status required' });
      }
      const orderDoc = await Order.findById(id);
      const previousStatus = orderDoc.status;
      orderDoc.status = status;
      if (status === 'cancelled' && previousStatus !== 'cancelled') {
        orderDoc.cancelled_by = 'admin';
        orderDoc.cancelled_by_user = auth.user.id;
        orderDoc.cancelled_at = new Date();
        orderDoc.cancel_reason = reason;
      }
      await orderDoc.save();

      if (status === 'cancelled' && previousStatus !== 'cancelled') {
        for (const it of orderDoc.items || []) {
          const productId = it.product?.toString?.() || it.product;
          if (productId) {
            await Product.findByIdAndUpdate(productId, { $inc: { stock: it.quantity } });
          }
        }
      }

      const updated = await Order.findById(id).lean();
      const out = {
        id: updated._id.toString(),
        user_id: updated.user?.toString?.(),
        status: updated.status,
        total_amount: updated.total_amount,
        receiver_name: updated.receiver_name,
        receiver_phone: updated.receiver_phone,
        shipping_address: updated.shipping_address,
        payment_method: updated.payment_method,
        created_at: updated.createdAt,
        items: (updated.items || []).map((i) => ({
          id: i._id?.toString(),
          product_id: i.product?.toString?.(),
          quantity: i.quantity,
          price_at_order: i.price_at_order,
          product_name: i.product_name,
        })),
      };
      res.json({ success: true, order: out });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
