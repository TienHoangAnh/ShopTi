const CartItem = require('../../models/CartItem');
const Product = require('../../models/Product');

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

async function list(req, res) {
  const items = await CartItem.find({ user: req.user.id }).populate('product').lean();
  res.json({ success: true, items: items.map(toItem) });
}

async function add(req, res) {
  const { product_id, quantity = 1 } = req.body || {};
  if (!product_id || quantity < 1) {
    return res.status(400).json({ success: false, message: 'product_id and positive quantity required' });
  }
  const product = await Product.findById(product_id).select('stock').lean();
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  const qty = Math.min(Number(quantity), product.stock);

  let item = await CartItem.findOne({ user: req.user.id, product: product_id });
  if (item) {
    item.quantity += qty;
    item.quantity = Math.min(item.quantity, product.stock);
    await item.save();
  } else {
    item = await CartItem.create({ user: req.user.id, product: product_id, quantity: qty });
  }
  const updated = await CartItem.findById(item._id).populate('product').lean();
  res.json({ success: true, quantity: updated.quantity });
}

async function updateQty(req, res) {
  const { quantity } = req.body || {};
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty < 1) {
    return res.status(400).json({ success: false, message: 'Positive quantity required' });
  }
  const item = await CartItem.findOne({ _id: req.params.id, user: req.user.id }).populate('product').lean();
  if (!item) return res.status(404).json({ success: false, message: 'Cart item not found' });
  const stock = item.product?.stock ?? 0;
  const newQty = Math.min(qty, stock);
  await CartItem.updateOne({ _id: item._id }, { $set: { quantity: newQty } });
  res.json({ success: true, quantity: newQty });
}

async function remove(req, res) {
  const result = await CartItem.deleteOne({ _id: req.params.id, user: req.user.id });
  if (result.deletedCount === 0) return res.status(404).json({ success: false, message: 'Cart item not found' });
  res.json({ success: true });
}

module.exports = { list, add, updateQty, remove };

