const { connectDB } = require('../../lib/mongodb');
const { getPathParam } = require('../../lib/getPathParam');
const Product = require('../../models/Product');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
    await connectDB();
    const id = req.query.id || getPathParam(req, 'api/products/', 'id');
    if (!id) return res.status(400).json({ success: false, message: 'Product id required' });
    const p = await Product.findById(id).populate('category', 'name').lean();
    if (!p) return res.status(404).json({ success: false, message: 'Product not found' });
    const sizes = Array.isArray(p.sizes) && p.sizes.length ? p.sizes : p.size ? String(p.size).split(/[,/|]/).map((x) => x.trim()).filter(Boolean) : [];
    const product = {
      id: p._id.toString(),
      name: p.name,
      description: p.description,
      price: p.price,
      image_url: p.image_url,
      stock: p.stock,
      category_id: p.category ? p.category._id.toString() : null,
      category_name: p.category?.name || null,
      brand: p.brand || null,
      sizes,
      size: sizes.length ? sizes.join(', ') : p.size,
      color: p.color,
      created_at: p.createdAt,
    };
    res.json({ success: true, product });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
