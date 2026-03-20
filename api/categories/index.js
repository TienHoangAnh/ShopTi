const { connectDB } = require('../../lib/mongodb');
const Category = require('../../models/Category');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
    await connectDB();
    const categories = await Category.find().sort({ name: 1 }).select('_id name').lean();
    const out = categories.map((c) => ({ id: c._id.toString(), name: c.name }));
    res.json({ success: true, categories: out });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
