const { connectDB } = require('../../../lib/mongodb');
const { authenticate } = require('../../../lib/auth');
const User = require('../../../models/User');
const ShopPayment = require('../../../models/ShopPayment');
const { hashOtp } = require('../_utils');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await connectDB();
    const auth = await authenticate(req);
    if (auth.error) return res.status(auth.error.status).json({ success: false, message: auth.error.message });

    const { payment_code, store_registration_otp, phone_verification_otp } = req.body || {};
    if (!payment_code) return res.status(400).json({ success: false, message: 'payment_code is required' });
    if (!store_registration_otp || !phone_verification_otp) {
      return res.status(400).json({ success: false, message: 'Both OTP codes are required' });
    }

    const payment = await ShopPayment.findOne({ payment_code, user: auth.user.id }).populate('shop').exec();
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (payment.status !== 'pending') return res.status(400).json({ success: false, message: 'Payment is not pending' });

    if (payment.expires_at && payment.expires_at.getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'Payment code expired' });
    }
    if (!payment.phone_verification_otp_hash) {
      return res.status(400).json({ success: false, message: 'Vui lòng xác nhận mã chuyển khoản trước để nhận OTP #2' });
    }

    const otp1Hash = hashOtp(store_registration_otp);
    const otp2Hash = hashOtp(phone_verification_otp);
    if (otp1Hash !== payment.store_registration_otp_hash) {
      return res.status(400).json({ success: false, message: 'Invalid store registration OTP' });
    }
    if (otp2Hash !== payment.phone_verification_otp_hash) {
      return res.status(400).json({ success: false, message: 'Invalid phone verification OTP' });
    }

    payment.otp_store_verified = true;
    payment.otp_phone_verified = true;
    if (!payment.user_marked_paid_at) payment.user_marked_paid_at = new Date();
    await payment.save();
    await User.findByIdAndUpdate(auth.user.id, { $set: { store_status: 'pending' } });

    return res.json({
      success: true,
      message: 'Yêu cầu đã gửi tới admin để duyệt mở cửa hàng',
      payment: {
        payment_code: payment.payment_code,
        status: payment.status,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
