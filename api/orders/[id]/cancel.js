const { connectDB } = require('../../../lib/mongodb');
const Order = require('../../../models/Order');
const Product = require('../../../models/Product');
const { authenticate } = require('../../../lib/auth');

const CANCEL_ALLOWED = ['pending', 'confirmed'];

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
    await connectDB();
    const auth = await authenticate(req);
    if (auth.error) return res.status(auth.error.status).json({ success: false, message: auth.error.message });
    const id = req.query.id || require('../../../lib/getPathParam').getPathParam(req, 'api/orders/', 'id');
    if (!id) return res.status(400).json({ success: false, message: 'Order id required' });

    const order = await Order.findOne({ _id: id, user: auth.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!CANCEL_ALLOWED.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể hủy đơn khi trạng thái là Đang xử lý hoặc Đã xác nhận. Đơn đang giao hoặc đã giao không thể hủy.',
      });
    }
    const { cancel_reason } = req.body || {};
    const reason = cancel_reason == null ? '' : String(cancel_reason).trim();

    order.status = 'cancelled';
    order.cancelled_by = 'user';
    order.cancelled_by_user = auth.user.id;
    order.cancelled_at = new Date();
    order.cancel_reason = reason;
    await order.save();

    for (const it of order.items || []) {
      const productId = it.product?.toString?.() || it.product;
      if (productId) {
        await Product.findByIdAndUpdate(productId, { $inc: { stock: it.quantity } });
      }
    }

    const updated = await Order.findById(order._id).lean();
    const out = {
      id: updated._id.toString(),
      user_id: updated.user.toString(),
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
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
