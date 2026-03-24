const { connectDB } = require('../../lib/mongodb');
const { authenticate } = require('../../lib/auth');
const User = require('../../models/User');
const Shop = require('../../models/Shop');
const ShopPayment = require('../../models/ShopPayment');
const { PLATFORM_BANK, genOtp6, hashOtp, genPaymentCode } = require('./_utils');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await connectDB();
    const auth = await authenticate(req);
    if (auth.error) return res.status(auth.error.status).json({ success: false, message: auth.error.message });

    if (auth.user?.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admin cannot register a shop' });
    }

    const {
      shop_name,
      logo_url,
      banner_url,
      description,
      sender_name,
      sender_phone,
      province,
      district,
      ward,
      detail_address,
      shipping_providers,
      bank_account_name,
      bank_account_number,
      bank_name,
      accept_terms,
    } = req.body || {};

    const name = (shop_name && String(shop_name).trim()) || '';
    const desc = description == null ? '' : String(description).trim();
    const sname = (sender_name && String(sender_name).trim()) || '';
    const phone = (sender_phone && String(sender_phone).trim()) || '';

    if (!name) return res.status(400).json({ success: false, message: 'shop_name is required' });
    if (!sname) return res.status(400).json({ success: false, message: 'sender_name is required' });
    if (!phone || phone.length < 8) return res.status(400).json({ success: false, message: 'sender_phone is invalid' });
    if (!province || !district || !ward || !detail_address) {
      return res.status(400).json({ success: false, message: 'Address is required' });
    }

    const providers = Array.isArray(shipping_providers) ? shipping_providers : [];
    if (!providers.length) return res.status(400).json({ success: false, message: 'shipping_providers is required' });

    const bname = (bank_name && String(bank_name).trim()) || '';
    const accName = (bank_account_name && String(bank_account_name).trim()) || '';
    const accNo = (bank_account_number && String(bank_account_number).trim()) || '';
    if (!bname || !accName || !accNo) {
      return res.status(400).json({ success: false, message: 'Bank info is required' });
    }
    if (!accept_terms) {
      return res.status(400).json({ success: false, message: 'Bạn cần đồng ý điều khoản sử dụng của nền tảng' });
    }

    const existingShop = await Shop.findOne({ user: auth.user.id }).lean();
    if (existingShop && ['pending_payment', 'active'].includes(existingShop.status)) {
      return res.status(400).json({ success: false, message: 'Shop registration already exists' });
    }

    const shopByName = await Shop.findOne({ shop_name: name }).lean();
    if (shopByName) return res.status(400).json({ success: false, message: 'shop_name already exists' });

    const paymentAmount = 10000;
    const appliedAt = new Date();
    const shop = await Shop.create({
      user: auth.user.id,
      shop_name: name,
      logo_url: logo_url ? String(logo_url).trim() : null,
      banner_url: banner_url ? String(banner_url).trim() : null,
      description: desc,
      sender_name: sname,
      sender_phone: phone,
      province: String(province).trim(),
      district: String(district).trim(),
      ward: String(ward).trim(),
      detail_address: String(detail_address).trim(),
      shipping_providers: providers,
      bank_account_name: accName,
      bank_account_number: accNo,
      bank_name: bname,
      terms_accepted: true,
      terms_accepted_at: new Date(),
      status: 'pending_payment',
      applied_at: appliedAt,
    });

    const storeRegistrationOtp = genOtp6();
    const storeRegistrationOtpHash = hashOtp(storeRegistrationOtp);

    let paymentCode = genPaymentCode();
    for (let i = 0; i < 5; i++) {
      const exists = await ShopPayment.findOne({ payment_code: paymentCode }).lean();
      if (!exists) break;
      paymentCode = genPaymentCode();
    }

    const payment = await ShopPayment.create({
      user: auth.user.id,
      shop: shop._id,
      amount: paymentAmount,
      payment_code: paymentCode,
      payment_method: 'bank_transfer',
      transfer_content: 'PAY ' + paymentCode,
      status: 'pending',
      expires_at: new Date(Date.now() + 15 * 60 * 1000),
      store_registration_otp_hash: storeRegistrationOtpHash,
      phone_verification_otp_hash: null,
      otp_store_verified: false,
      otp_phone_verified: false,
    });

    await User.findByIdAndUpdate(auth.user.id, {
      $set: {
        store_name: shop.shop_name,
        store_description: shop.description,
        store_status: 'pending',
        store_applied_at: appliedAt,
      },
    });

    return res.status(201).json({
      success: true,
      payment: {
        payment_code: payment.payment_code,
        amount: payment.amount,
        status: payment.status,
        expires_at: payment.expires_at,
        transfer_content: payment.transfer_content,
        bank_info: PLATFORM_BANK,
      },
      debug: {
        store_registration_otp: storeRegistrationOtp,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
};
