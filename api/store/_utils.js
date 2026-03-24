const crypto = require('crypto');

const OTP_SECRET = process.env.JWT_SECRET || '';

const PLATFORM_BANK = {
  bank_name: process.env.PLATFORM_BANK_NAME || 'MBBank',
  account_name: process.env.PLATFORM_BANK_ACCOUNT_NAME || 'Nguyen Van Tien',
  account_number: process.env.PLATFORM_BANK_ACCOUNT_NUMBER || '68888888120903',
  qr_image_url: process.env.PLATFORM_BANK_QR_IMAGE_URL || '/assets/ShopTiQR.png',
};

function mapShopStatus(shopStatus) {
  if (shopStatus === 'active') return 'approved';
  if (shopStatus === 'pending_payment') return 'pending';
  if (shopStatus === 'rejected') return 'rejected';
  return 'none';
}

function genOtp6() {
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

module.exports = {
  PLATFORM_BANK,
  mapShopStatus,
  genOtp6,
  hashOtp,
  genPaymentCode,
};
