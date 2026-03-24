const { connectDB } = require('../../lib/mongodb');
const { authenticate } = require('../../lib/auth');
const User = require('../../models/User');
const Shop = require('../../models/Shop');
const { mapShopStatus } = require('./_utils');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
    await connectDB();
    const auth = await authenticate(req);
    if (auth.error) return res.status(auth.error.status).json({ success: false, message: auth.error.message });

    const u = await User.findById(auth.user.id)
      .select('_id store_name store_description store_status store_applied_at')
      .lean();
    const shop = await Shop.findOne({ user: auth.user.id }).lean();

    if (shop) {
      return res.json({
        success: true,
        store: {
          store_name: shop.shop_name || null,
          store_description: shop.description || '',
          store_status: mapShopStatus(shop.status),
          store_applied_at: shop.applied_at || shop.createdAt || null,
        },
      });
    }

    return res.json({
      success: true,
      store: {
        store_name: u?.store_name || null,
        store_description: u?.store_description || '',
        store_status: u?.store_status || 'none',
        store_applied_at: u?.store_applied_at || null,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
