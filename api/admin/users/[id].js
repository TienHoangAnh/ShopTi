const { connectDB } = require('../../../lib/mongodb');
const User = require('../../../models/User');
const { authenticate, requireAdmin } = require('../../../lib/auth');

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

    const id = req.query.id || require('../../../lib/getPathParam').getPathParam(req, 'api/admin/users/', 'id');
    if (!id) return res.status(400).json({ success: false, message: 'User id required' });

    if (id === auth.user.id) {
      if (method === 'DELETE') {
        return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
      }
    }

    if (method === 'GET') {
      const user = await User.findById(id).select('_id email full_name role createdAt').lean();
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      return res.json({
        success: true,
        user: {
          id: user._id.toString(),
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          created_at: user.createdAt,
        },
      });
    }

    if (method === 'PUT') {
      const { full_name, role } = req.body || {};
      const existing = await User.findById(id);
      if (!existing) return res.status(404).json({ success: false, message: 'User not found' });
      if (role && !['user', 'admin'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role' });
      }
      const updates = {};
      if (full_name !== undefined) updates.full_name = full_name;
      if (role !== undefined) updates.role = role;
      const user = await User.findByIdAndUpdate(id, { $set: updates }, { new: true })
        .select('_id email full_name role createdAt')
        .lean();
      return res.json({
        success: true,
        user: {
          id: user._id.toString(),
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          created_at: user.createdAt,
        },
      });
    }

    if (method === 'DELETE') {
      const result = await User.deleteOne({ _id: id });
      if (result.deletedCount === 0) return res.status(404).json({ success: false, message: 'User not found' });
      return res.json({ success: true });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
