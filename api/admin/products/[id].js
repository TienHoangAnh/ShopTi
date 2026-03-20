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
  if (method !== 'GET' && method !== 'PUT' && method !== 'DELETE') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
    await connectDB();
    const auth = await authenticate(req);
    if (auth.error) return res.status(auth.error.status).json({ success: false, message: auth.error.message });
    const adminCheck = requireAdmin(auth.user);
    if (adminCheck.error) return res.status(adminCheck.error.status).json({ success: false, message: adminCheck.error.message });

    const id = req.query.id || require('../../../lib/getPathParam').getPathParam(req, 'api/admin/products/', 'id');
    if (!id) return res.status(400).json({ success: false, message: 'Product id required' });

    if (method === 'GET') {
      const p = await Product.findById(id).populate('category', 'name').lean();
      if (!p) return res.status(404).json({ success: false, message: 'Product not found' });
      return res.json({ success: true, product: productOut(p) });
    }

    if (method === 'PUT') {
      const existing = await Product.findById(id);
      if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });
      const { name, description, price, image_url, stock, category_id, color } = req.body || {};
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (price !== undefined) updates.price = parseFloat(price);
      if (image_url !== undefined) updates.image_url = image_url;
      if (stock !== undefined) updates.stock = parseInt(stock, 10);
      if (category_id !== undefined) updates.category = category_id || null;
      if (req.body.sizes !== undefined || req.body.size !== undefined) {
        const sz = normalizeSizesBody(req.body || {});
        updates.sizes = sz.sizes;
        updates.size_tags = sz.size_tags;
        updates.size = sz.size;
      }
      if (color !== undefined) updates.color = color && String(color).trim() ? String(color).trim() : null;
      const p = await Product.findByIdAndUpdate(id, { $set: updates }, { new: true }).populate('category', 'name').lean();
      return res.json({ success: true, product: productOut(p) });
    }

    if (method === 'DELETE') {
      const result = await Product.deleteOne({ _id: id });
      if (result.deletedCount === 0) return res.status(404).json({ success: false, message: 'Product not found' });
      return res.json({ success: true });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
