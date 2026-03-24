const { connectDB } = require('../../../lib/mongodb');
const { authenticate } = require('../../../lib/auth');
const ShopPayment = require('../../../models/ShopPayment');
const { genOtp6, hashOtp } = require('../_utils');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await connectDB();
    const auth = await authenticate(req);
    if (auth.error) return res.status(auth.error.status).json({ success: false, message: auth.error.message });

    const { payment_code, transfer_content } = req.body || {};
    if (!payment_code) return res.status(400).json({ success: false, message: 'payment_code is required' });
    if (!transfer_content) return res.status(400).json({ success: false, message: 'transfer_content is required' });

    const payment = await ShopPayment.findOne({ payment_code, user: auth.user.id });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (payment.status !== 'pending') return res.status(400).json({ success: false, message: 'Payment is not pending' });
    if (payment.expires_at && payment.expires_at.getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'Payment code expired' });
    }

    const content = String(transfer_content).trim();
    if (content !== String(payment.transfer_content || '').trim()) {
      return res.status(400).json({ success: false, message: 'Nội dung chuyển khoản không đúng' });
    }

    const phoneOtp = genOtp6();
    payment.phone_verification_otp_hash = hashOtp(phoneOtp);
    payment.phone_otp_sent_at = new Date();
    payment.user_marked_paid_at = new Date();
    await payment.save();

    return res.json({
      success: true,
      message: 'Đã xác nhận mã chuyển khoản. OTP #2 đã được gửi (demo).',
      debug: {
        phone_verification_otp: phoneOtp,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
