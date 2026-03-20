const { connectDB } = require('../../lib/mongodb');
const Category = require('../../models/Category');
const { authenticate, requireAdmin } = require('../../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
    await connectDB();
    const auth = await authenticate(req);
    if (auth.error) return res.status(auth.error.status).json({ success: false, message: auth.error.message });
    const adminCheck = requireAdmin(auth.user);
    if (adminCheck.error) return res.status(adminCheck.error.status).json({ success: false, message: adminCheck.error.message });

    const categories = await Category.find().sort({ name: 1 }).select('_id name').lean();
    res.json({ success: true, categories: categories.map((c) => ({ id: c._id.toString(), name: c.name })) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
