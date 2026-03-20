const { connectDB } = require('../../lib/mongodb');
const Order = require('../../models/Order');
const CartItem = require('../../models/CartItem');
const Product = require('../../models/Product');
const { authenticate } = require('../../lib/auth');

const ALLOWED_PAYMENT = ['cod', 'bank', 'wallet'];

function orderToOut(order) {
  const o = order.toObject ? order.toObject() : order;
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
  const method = req.method;
  if (method !== 'GET' && method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
    await connectDB();
    const auth = await authenticate(req);
    if (auth.error) return res.status(auth.error.status).json({ success: false, message: auth.error.message });
    const userId = auth.user.id;

    if (method === 'GET') {
      const orders = await Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .select('status total_amount shipping_address createdAt cancelled_by cancel_reason')
        .lean();
      res.json({
        success: true,
        orders: orders.map((o) => ({
          id: o._id.toString(),
          status: o.status,
          total_amount: o.total_amount,
          shipping_address: o.shipping_address,
          created_at: o.createdAt,
          cancelled_by: o.cancelled_by || null,
          cancel_reason: o.cancel_reason || '',
        })),
      });
      return;
    }

    if (method === 'POST') {
      let { receiver_name, receiver_phone, shipping_address, payment_method } = req.body || {};
      payment_method = ALLOWED_PAYMENT.includes(payment_method) ? payment_method : 'cod';
      const name = (receiver_name && String(receiver_name).trim()) || '';
      const phone = (receiver_phone && String(receiver_phone).trim()) || '';
      const address = (shipping_address && String(shipping_address).trim()) || '';
      if (!name) return res.status(400).json({ success: false, message: 'receiver_name is required' });
      if (!phone) return res.status(400).json({ success: false, message: 'receiver_phone is required' });
      if (!address) return res.status(400).json({ success: false, message: 'shipping_address is required' });

      const cartItems = await CartItem.find({ user: userId }).populate('product').lean();
      if (cartItems.length === 0) {
        return res.status(400).json({ success: false, message: 'Cart is empty' });
      }
      let total = 0;
      for (const it of cartItems) {
        const p = it.product;
        if (!p || it.quantity > p.stock) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${p?.name || 'product'}. Available: ${p?.stock ?? 0}`,
          });
        }
        total += p.price * it.quantity;
      }

      const orderItems = cartItems.map((it) => ({
        product: it.product._id,
        quantity: it.quantity,
        price_at_order: it.product.price,
        product_name: it.product.name,
      }));

      const order = await Order.create({
        user: userId,
        status: 'pending',
        total_amount: total,
        receiver_name: name,
        receiver_phone: phone,
        shipping_address: address,
        payment_method,
        items: orderItems,
      });

      for (const it of cartItems) {
        await Product.findByIdAndUpdate(it.product._id, { $inc: { stock: -it.quantity } });
        await CartItem.deleteOne({ _id: it._id });
      }

      const created = await Order.findById(order._id).lean();
      const out = {
        id: created._id.toString(),
        user_id: created.user.toString(),
        status: created.status,
        total_amount: created.total_amount,
        receiver_name: created.receiver_name,
        receiver_phone: created.receiver_phone,
        shipping_address: created.shipping_address,
        payment_method: created.payment_method,
        created_at: created.createdAt,
        items: (created.items || []).map((i) => ({
          id: i._id?.toString(),
          product_id: i.product?.toString(),
          quantity: i.quantity,
          price_at_order: i.price_at_order,
          product_name: i.product_name,
        })),
      };
      res.status(201).json({ success: true, order: out });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
