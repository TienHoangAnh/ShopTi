const { connectDB } = require('../../lib/mongodb');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const { authenticate } = require('../../lib/auth');

function orderToOut(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: o._id.toString(),
    user_id: o.user?.toString?.() || o.user,
    status: o.status,
    total_amount: o.total_amount,
    receiver_name: o.receiver_name,
    receiver_phone: o.receiver_phone,
    shipping_address: o.shipping_address,
    payment_method: o.payment_method,
    cancelled_by: o.cancelled_by || null,
    cancelled_by_user_id: o.cancelled_by_user?.toString?.() || null,
    cancelled_at: o.cancelled_at || null,
    cancel_reason: o.cancel_reason || '',
    created_at: o.createdAt,
    items: (o.items || []).map((it) => ({
      id: it._id?.toString(),
      product_id: it.product?.toString?.() || it.product,
      quantity: it.quantity,
      price_at_order: it.price_at_order,
      product_name: it.product_name,
    })),
  };
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
    await connectDB();
    const auth = await authenticate(req);
    if (auth.error) return res.status(auth.error.status).json({ success: false, message: auth.error.message });
    const id = req.query.id || require('../../lib/getPathParam').getPathParam(req, 'api/orders/', 'id');
    if (!id) return res.status(400).json({ success: false, message: 'Order id required' });

    const order = await Order.findOne({ _id: id, user: auth.user.id }).lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    res.json({ success: true, order: orderToOut(order) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
