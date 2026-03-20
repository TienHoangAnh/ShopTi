const { connectDB } = require('../../../lib/mongodb');
const { normalizeSizesBody } = require('../../../lib/productSizesMongo');
const Product = require('../../../models/Product');
const { authenticate, requireAdmin } = require('../../../lib/auth');

function productOut(p) {
  const sizes = Array.isArray(p.sizes) && p.sizes.length ? p.sizes : p.size ? String(p.size).split(/[,/|]/).map((x) => x.trim()).filter(Boolean) : [];
  return {
    id: p._id.toString(),
    name: p.name,
    description: p.description,
    price: p.price,
    image_url: p.image_url,
    stock: p.stock,
    category_id: p.category ? p.category._id.toString() : null,
    category_name: p.category?.name ?? null,
    sizes,
    size: sizes.length ? sizes.join(', ') : p.size,
    color: p.color,
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
    const adminCheck = requireAdmin(auth.user);
    if (adminCheck.error) return res.status(adminCheck.error.status).json({ success: false, message: adminCheck.error.message });

    if (method === 'GET') {
      const products = await Product.find().populate('category', 'name').sort({ createdAt: -1 }).lean();
      const out = products.map((p) => productOut(p));
      return res.json({ success: true, products: out });
    }

    if (method === 'POST') {
      const { name, description, price, image_url, stock, category_id, color } = req.body || {};
      if (!name || price === undefined) {
        return res.status(400).json({ success: false, message: 'name and price required' });
      }
      const sz = normalizeSizesBody(req.body || {});
      const product = await Product.create({
        name,
        description: description ?? '',
        price: parseFloat(price),
        image_url: image_url || '/images/placeholder.svg',
        stock: parseInt(stock, 10) || 0,
        category: category_id || null,
        sizes: sz.sizes,
        size_tags: sz.size_tags,
        size: sz.size,
        color: color && String(color).trim() ? String(color).trim() : null,
      });
      const p = await Product.findById(product._id).populate('category', 'name').lean();
      res.status(201).json({ success: true, product: productOut(p) });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
