const { connectDB } = require('../../lib/mongodb');
const { authenticate } = require('../../lib/auth');
const User = require('../../models/User');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await connectDB();
    const auth = await authenticate(req);
    if (auth.error) return res.status(auth.error.status).json({ success: false, message: auth.error.message });

    const { store_name, store_description } = req.body || {};
    const name = (store_name && String(store_name).trim()) || '';
    const desc = store_description == null ? '' : String(store_description).trim();
    if (!name) return res.status(400).json({ success: false, message: 'store_name is required' });

    const before = await User.findById(auth.user.id).select('store_status').lean();
    if (before?.store_status === 'pending') {
      return res.status(400).json({ success: false, message: 'Store application is pending' });
    }

    const u = await User.findByIdAndUpdate(
      auth.user.id,
      {
        $set: {
          store_name: name,
          store_description: desc,
          store_status: 'pending',
          store_applied_at: new Date(),
        },
      },
      { new: true }
    )
      .select('_id store_name store_description store_status store_applied_at')
      .lean();

    return res.status(201).json({
      success: true,
      store: {
        store_name: u.store_name || null,
        store_description: u.store_description || '',
        store_status: u.store_status || 'none',
        store_applied_at: u.store_applied_at || null,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
