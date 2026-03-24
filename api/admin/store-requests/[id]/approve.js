const { connectDB } = require('../../../../lib/mongodb');
const { authenticate, requireAdmin } = require('../../../../lib/auth');
const ShopPayment = require('../../../../models/ShopPayment');
const User = require('../../../../models/User');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await connectDB();
    const auth = await authenticate(req);
    if (auth.error) return res.status(auth.error.status).json({ success: false, message: auth.error.message });
    const adminCheck = requireAdmin(auth.user);
    if (adminCheck.error) return res.status(adminCheck.error.status).json({ success: false, message: adminCheck.error.message });

    const id = req.query?.id;
    if (!id) return res.status(400).json({ success: false, message: 'Request id is required' });

    const payment = await ShopPayment.findById(id).populate('shop').exec();
    if (!payment) return res.status(404).json({ success: false, message: 'Request not found' });
    if (payment.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }
    if (!payment.user_marked_paid_at) {
      return res.status(400).json({ success: false, message: 'User has not marked payment yet' });
    }

    payment.status = 'paid';
    payment.paid_at = new Date();
    payment.admin_reviewed_at = new Date();
    payment.otp_store_verified = true;
    payment.otp_phone_verified = true;
    await payment.save();

    if (payment.shop) {
      payment.shop.status = 'active';
      await payment.shop.save();
    }

    await User.findByIdAndUpdate(payment.user, {
      $set: {
        role: 'store',
        store_status: 'approved',
        store_name: payment.shop?.shop_name || null,
        store_description: payment.shop?.description || '',
      },
    });

    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
