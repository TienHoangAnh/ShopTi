const { connectDB } = require('../../lib/mongodb');
const Category = require('../../models/Category');
const Product = require('../../models/Product');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
    await connectDB();
    const [categories, brandDocs, colorDocs, sizeRows] = await Promise.all([
      Category.find().sort({ name: 1 }).select('_id name').lean(),
      Product.distinct('brand', { brand: { $nin: [null, ''] } }),
      Product.distinct('color', { color: { $nin: [null, ''] } }),
      Product.find().select('sizes size').lean(),
    ]);
    const catOut = categories.map((c) => ({ id: c._id.toString(), name: c.name }));
    const sizeSet = new Set();
    (sizeRows || []).forEach((p) => {
      (p.sizes || []).forEach((s) => { if (s) sizeSet.add(String(s).trim()); });
      if (p.size) String(p.size).split(/[,/|]/).forEach((s) => { const t = s.trim(); if (t) sizeSet.add(t); });
    });
    const sizes = [...sizeSet].sort();
    const colors = (colorDocs || []).sort();
    const brands = (brandDocs || []).filter(Boolean).sort();
    res.json({ success: true, filters: { categories: catOut, brands, sizes, colors } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Failed to load filters' });
  }
};
