const { connectDB } = require('../../lib/mongodb');
const CartItem = require('../../models/CartItem');
const Product = require('../../models/Product');
const { authenticate } = require('../../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const method = req.method;
  if (method !== 'PUT' && method !== 'DELETE') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
    await connectDB();
    const auth = await authenticate(req);
    if (auth.error) return res.status(auth.error.status).json({ success: false, message: auth.error.message });
    const id = req.query.id || require('../../lib/getPathParam').getPathParam(req, 'api/cart/', 'id');
    if (!id) return res.status(400).json({ success: false, message: 'Cart item id required' });

    const item = await CartItem.findOne({ _id: id, user: auth.user.id });
    if (!item) return res.status(404).json({ success: false, message: 'Cart item not found' });

    if (method === 'DELETE') {
      await CartItem.deleteOne({ _id: id, user: auth.user.id });
      return res.json({ success: true });
    }

    const { quantity } = req.body || {};
    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({ success: false, message: 'Valid quantity required' });
    }
    if (quantity === 0) {
      await CartItem.deleteOne({ _id: id, user: auth.user.id });
      return res.json({ success: true, quantity: 0 });
    }
    const product = await Product.findById(item.product).select('stock').lean();
    const qty = Math.min(Number(quantity), product?.stock ?? quantity);
    item.quantity = qty;
    await item.save();
    res.json({ success: true, quantity: qty });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
