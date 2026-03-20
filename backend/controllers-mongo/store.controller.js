const crypto = require('crypto');
const User = require('../../models/User');
const Shop = require('../../models/Shop');
const ShopPayment = require('../../models/ShopPayment');

const OTP_SECRET = process.env.JWT_SECRET || 'shopti-secret-key-change-in-production';

const PLATFORM_BANK = {
  bank_name: process.env.PLATFORM_BANK_NAME || 'Techcombank',
  account_name: process.env.PLATFORM_BANK_ACCOUNT_NAME || 'ShopTi',
  account_number: process.env.PLATFORM_BANK_ACCOUNT_NUMBER || '0123456789',
};

function genOtp6() {
  // 6-digit OTP
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(code) {
  return crypto.createHash('sha256').update(String(code) + '|' + OTP_SECRET).digest('hex');
}

function genPaymentCode() {
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  const t = Date.now().toString().slice(-6);
  return 'SHOP' + rnd + t;
}

function mapShopStatus(shopStatus) {
  if (shopStatus === 'active') return 'approved';
  if (shopStatus === 'pending_payment') return 'pending';
  if (shopStatus === 'rejected') return 'rejected';
  return 'none';
}

async function me(req, res) {
  const u = await User.findById(req.user.id)
    .select('_id store_name store_description store_status store_applied_at')
    .lean();

  const shop = await Shop.findOne({ user: req.user.id }).lean();
  if (shop) {
    res.json({
      success: true,
      store: {
        store_name: shop.shop_name || null,
        store_description: shop.description || '',
        store_status: mapShopStatus(shop.status),
        store_applied_at: shop.applied_at || shop.createdAt || null,
      },
    });
    return;
  }

  res.json({
    success: true,
    store: {
      store_name: u?.store_name || null,
      store_description: u?.store_description || '',
      store_status: u?.store_status || 'none',
      store_applied_at: u?.store_applied_at || null,
    },
  });
}

async function apply(req, res) {
  const { store_name, store_description } = req.body || {};
  const name = (store_name && String(store_name).trim()) || '';
  const desc = store_description == null ? '' : String(store_description).trim();
  if (!name) return res.status(400).json({ success: false, message: 'store_name is required' });

  const before = await User.findById(req.user.id).select('store_status').lean();
  if (before?.store_status === 'pending') {
    return res.status(400).json({ success: false, message: 'Store application is pending' });
  }

  const u = await User.findByIdAndUpdate(
    req.user.id,
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

  res.status(201).json({
    success: true,
    store: {
      store_name: u.store_name || null,
      store_description: u.store_description || '',
      store_status: u.store_status || 'none',
      store_applied_at: u.store_applied_at || null,
    },
  });
}

async function registerShop(req, res) {
  if (req.user?.role === 'admin') {
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

  const existingShop = await Shop.findOne({ user: req.user.id }).lean();
  if (existingShop && ['pending_payment', 'active'].includes(existingShop.status)) {
    return res.status(400).json({ success: false, message: 'Shop registration already exists' });
  }

  const shopByName = await Shop.findOne({ shop_name: name }).lean();
  if (shopByName) return res.status(400).json({ success: false, message: 'shop_name already exists' });

  const paymentAmount = 10000;
  const appliedAt = new Date();

  // Create shop first
  const shop = await Shop.create({
    user: req.user.id,
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
    status: 'pending_payment',
    applied_at: appliedAt,
  });

  // Generate OTP + payment_code
  const store_registration_otp = genOtp6();
  const phone_verification_otp = genOtp6();
  const store_registration_otp_hash = hashOtp(store_registration_otp);
  const phone_verification_otp_hash = hashOtp(phone_verification_otp);

  let payment_code = genPaymentCode();
  for (let i = 0; i < 5; i++) {
    const exists = await ShopPayment.findOne({ payment_code }).lean();
    if (!exists) break;
    payment_code = genPaymentCode();
  }

  const transfer_content = 'PAY ' + payment_code;
  const expires_at = new Date(Date.now() + 15 * 60 * 1000);

  const payment = await ShopPayment.create({
    user: req.user.id,
    shop: shop._id,
    amount: paymentAmount,
    payment_code,
    payment_method: 'bank_transfer',
    transfer_content,
    status: 'pending',
    expires_at,
    store_registration_otp_hash,
    phone_verification_otp_hash,
    otp_store_verified: false,
    otp_phone_verified: false,
  });

  // Sync old user fields used by current UI
  await User.findByIdAndUpdate(req.user.id, {
    $set: {
      store_name: shop.shop_name,
      store_description: shop.description,
      store_status: 'pending',
      store_applied_at: appliedAt,
    },
  });

  res.status(201).json({
    success: true,
    payment: {
      payment_code: payment.payment_code,
      amount: payment.amount,
      status: payment.status,
      expires_at: payment.expires_at,
      transfer_content: payment.transfer_content,
      bank_info: PLATFORM_BANK,
    },
    // DEMO: return OTP to client (real implementation should SMS these codes)
    debug: {
      store_registration_otp,
      phone_verification_otp,
    },
  });
}

async function paymentGet(req, res) {
  const { payment_code } = req.params || {};
  if (!payment_code) return res.status(400).json({ success: false, message: 'payment_code is required' });

  const payment = await ShopPayment.findOne({ payment_code, user: req.user.id }).lean();
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

  res.json({
    success: true,
    payment: {
      payment_code: payment.payment_code,
      amount: payment.amount,
      status: payment.status,
      expires_at: payment.expires_at,
      transfer_content: payment.transfer_content,
      otp_store_verified: payment.otp_store_verified,
      otp_phone_verified: payment.otp_phone_verified,
      bank_info: PLATFORM_BANK,
    },
  });
}

async function paymentSimulateSuccess(req, res) {
  const { payment_code, store_registration_otp, phone_verification_otp } = req.body || {};
  if (!payment_code) return res.status(400).json({ success: false, message: 'payment_code is required' });
  if (!store_registration_otp || !phone_verification_otp) {
    return res.status(400).json({ success: false, message: 'Both OTP codes are required' });
  }

  const payment = await ShopPayment.findOne({ payment_code, user: req.user.id }).populate('shop').exec();
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
  if (payment.status !== 'pending') return res.status(400).json({ success: false, message: 'Payment is not pending' });

  if (payment.expires_at && payment.expires_at.getTime() < Date.now()) {
    return res.status(400).json({ success: false, message: 'Payment code expired' });
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
  payment.status = 'paid';
  payment.paid_at = new Date();
  await payment.save();

  // Activate shop
  payment.shop.status = 'active';
  await payment.shop.save();

  // Sync old user fields used by current UI
  await User.findByIdAndUpdate(req.user.id, {
    $set: {
      store_name: payment.shop.shop_name,
      store_description: payment.shop.description,
      store_status: 'approved',
    },
  });

  res.json({
    success: true,
    shop: {
      store_name: payment.shop.shop_name,
      store_status: 'approved',
    },
    payment: {
      payment_code: payment.payment_code,
      status: payment.status,
    },
  });
}

module.exports = { me, apply, registerShop, paymentGet, paymentSimulateSuccess };

