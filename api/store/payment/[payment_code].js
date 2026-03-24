const { connectDB } = require('../../../lib/mongodb');
const { authenticate } = require('../../../lib/auth');
const ShopPayment = require('../../../models/ShopPayment');
const { PLATFORM_BANK } = require('../_utils');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await connectDB();
    const auth = await authenticate(req);
    if (auth.error) return res.status(auth.error.status).json({ success: false, message: auth.error.message });

    const paymentCode = (req.query?.payment_code && String(req.query.payment_code)) || '';
    if (!paymentCode) return res.status(400).json({ success: false, message: 'payment_code is required' });

    const payment = await ShopPayment.findOne({ payment_code: paymentCode, user: auth.user.id }).lean();
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    return res.json({
      success: true,
      payment: {
        payment_code: payment.payment_code,
        amount: payment.amount,
        status: payment.status,
        expires_at: payment.expires_at,
        transfer_content: payment.transfer_content,
        otp_store_verified: payment.otp_store_verified,
        otp_phone_verified: payment.otp_phone_verified,
        user_marked_paid_at: payment.user_marked_paid_at || null,
        has_phone_otp: !!payment.phone_verification_otp_hash,
        bank_info: PLATFORM_BANK,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
