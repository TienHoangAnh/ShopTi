const { connectDB } = require('../../../lib/mongodb');
const { authenticate, requireAdmin } = require('../../../lib/auth');
const Shop = require('../../../models/Shop');
const ShopPayment = require('../../../models/ShopPayment');

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

    const payments = await ShopPayment.find({ status: 'pending', user_marked_paid_at: { $ne: null } })
      .populate('user', '_id email full_name role')
      .populate('shop')
      .sort({ user_marked_paid_at: -1 })
      .lean();

    const requests = payments.map((p) => ({
      payment_id: p._id.toString(),
      payment_code: p.payment_code,
      amount: p.amount,
      transfer_content: p.transfer_content,
      user_marked_paid_at: p.user_marked_paid_at || null,
      user: p.user
        ? {
            id: p.user._id.toString(),
            email: p.user.email,
            full_name: p.user.full_name,
            role: p.user.role,
          }
        : null,
      shop: p.shop
        ? {
            id: p.shop._id.toString(),
            shop_name: p.shop.shop_name,
            description: p.shop.description || '',
            sender_name: p.shop.sender_name,
            sender_phone: p.shop.sender_phone,
            province: p.shop.province,
            district: p.shop.district,
            ward: p.shop.ward,
            detail_address: p.shop.detail_address,
            shipping_providers: p.shop.shipping_providers || [],
            bank_account_name: p.shop.bank_account_name,
            bank_account_number: p.shop.bank_account_number,
            bank_name: p.shop.bank_name,
            terms_accepted: !!p.shop.terms_accepted,
            terms_accepted_at: p.shop.terms_accepted_at || null,
            status: p.shop.status,
            applied_at: p.shop.applied_at || null,
          }
        : null,
    }));

    return res.json({ success: true, requests });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
