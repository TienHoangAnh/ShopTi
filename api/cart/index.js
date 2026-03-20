const { connectDB } = require('../../lib/mongodb');
const CartItem = require('../../models/CartItem');
const Product = require('../../models/Product');
const { authenticate } = require('../../lib/auth');

function toItem(i) {
  return {
    id: i._id.toString(),
    product_id: i.product?._id?.toString() || i.product,
    quantity: i.quantity,
    name: i.product?.name,
    price: i.product?.price,
    image_url: i.product?.image_url,
    stock: i.product?.stock,
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
      const items = await CartItem.find({ user: userId }).populate('product').lean();
      res.json({ success: true, items: items.map(toItem) });
      return;
    }

    if (method === 'POST') {
      const { product_id, quantity = 1 } = req.body || {};
      if (!product_id || quantity < 1) {
        return res.status(400).json({ success: false, message: 'product_id and positive quantity required' });
      }
      const product = await Product.findById(product_id).select('stock').lean();
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
      const qty = Math.min(Number(quantity), product.stock);
      let item = await CartItem.findOne({ user: userId, product: product_id });
      if (item) {
        item.quantity += qty;
        item.quantity = Math.min(item.quantity, product.stock);
        await item.save();
      } else {
        item = await CartItem.create({ user: userId, product: product_id, quantity: qty });
      }
      const updated = await CartItem.findById(item._id).populate('product').lean();
      res.json({ success: true, quantity: updated.quantity });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
