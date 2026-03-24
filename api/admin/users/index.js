const { connectDB } = require('../../../lib/mongodb');
const User = require('../../../models/User');
const { authenticate, requireAdmin } = require('../../../lib/auth');

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

    const roleFilter = String(req.query?.role || '').trim().toLowerCase();
    const query = {};
    if (['user', 'store', 'admin'].includes(roleFilter)) query.role = roleFilter;

    const users = await User.find(query).select('_id email full_name role store_status createdAt').sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      users: users.map((u) => ({
        id: u._id.toString(),
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        store_status: u.store_status || 'none',
        created_at: u.createdAt,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
