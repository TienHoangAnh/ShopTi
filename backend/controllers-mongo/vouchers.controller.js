const Voucher = require('../../models/Voucher');
const UserVoucher = require('../../models/UserVoucher');

function isVoucherActive(v) {
  if (!v || !v.is_active) return false;
  const now = Date.now();
  if (v.starts_at && new Date(v.starts_at).getTime() > now) return false;
  if (v.ends_at && new Date(v.ends_at).getTime() < now) return false;
  if (v.total_quantity > 0 && v.used_quantity >= v.total_quantity) return false;
  return true;
}

async function listPublic(req, res) {
  const vouchers = await Voucher.find({ scope: 'platform' }).sort({ createdAt: -1 }).lean();
  res.json({
    success: true,
    vouchers: vouchers
      .filter(isVoucherActive)
      .map((v) => ({
        id: v._id.toString(),
        title: v.title,
        code: v.code,
        description: v.description,
        type: v.type,
        percent: v.percent ?? null,
        max_discount_vnd: v.max_discount_vnd ?? null,
        min_order_vnd: v.min_order_vnd ?? 0,
        ends_at: v.ends_at ?? null,
      })),
  });
}

async function my(req, res) {
  const rows = await UserVoucher.find({ user: req.user.id })
    .populate('voucher')
    .sort({ createdAt: -1 })
    .lean();
  res.json({
    success: true,
    vouchers: rows.map((uv) => ({
      id: uv._id.toString(),
      status: uv.status,
      claimed_at: uv.claimed_at,
      used_at: uv.used_at,
      voucher: uv.voucher
        ? {
            id: uv.voucher._id.toString(),
            title: uv.voucher.title,
            code: uv.voucher.code,
            description: uv.voucher.description,
            type: uv.voucher.type,
            percent: uv.voucher.percent ?? null,
            max_discount_vnd: uv.voucher.max_discount_vnd ?? null,
            min_order_vnd: uv.voucher.min_order_vnd ?? 0,
            ends_at: uv.voucher.ends_at ?? null,
            is_active: uv.voucher.is_active ?? true,
          }
        : null,
    })),
  });
}

async function claim(req, res) {
  const { code } = req.body || {};
  const c = (code && String(code).trim().toUpperCase()) || '';
  if (!c) return res.status(400).json({ success: false, message: 'code is required' });
  const v = await Voucher.findOne({ code: c, scope: 'platform' }).lean();
  if (!v || !isVoucherActive(v)) return res.status(404).json({ success: false, message: 'Voucher not found' });

  try {
    const uv = await UserVoucher.create({ user: req.user.id, voucher: v._id, status: 'available' });
    res.status(201).json({ success: true, user_voucher_id: uv._id.toString() });
  } catch (e) {
    if (String(e.message || '').includes('duplicate') || e.code === 11000) {
      return res.status(400).json({ success: false, message: 'Bạn đã lưu voucher này rồi.' });
    }
    throw e;
  }
}

// Admin
async function adminList(req, res) {
  const vouchers = await Voucher.find({ scope: 'platform' }).sort({ createdAt: -1 }).lean();
  res.json({
    success: true,
    vouchers: vouchers.map((v) => ({
      id: v._id.toString(),
      title: v.title,
      code: v.code,
      type: v.type,
      percent: v.percent ?? null,
      max_discount_vnd: v.max_discount_vnd ?? null,
      min_order_vnd: v.min_order_vnd ?? 0,
      total_quantity: v.total_quantity ?? 0,
      used_quantity: v.used_quantity ?? 0,
      is_active: v.is_active ?? true,
      starts_at: v.starts_at ?? null,
      ends_at: v.ends_at ?? null,
      created_at: v.createdAt,
    })),
  });
}

async function adminCreate(req, res) {
  const {
    title,
    code,
    description,
    type,
    percent,
    max_discount_vnd,
    min_order_vnd,
    total_quantity,
    starts_at,
    ends_at,
    is_active,
  } = req.body || {};

  const t = (title && String(title).trim()) || '';
  const c = (code && String(code).trim().toUpperCase()) || '';
  if (!t) return res.status(400).json({ success: false, message: 'title is required' });
  if (!c) return res.status(400).json({ success: false, message: 'code is required' });
  if (!['freeship', 'product_percent'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Invalid type' });
  }

  const payload = {
    created_by: req.user.id,
    scope: 'platform',
    title: t,
    code: c,
    description: description == null ? '' : String(description),
    type,
    percent: type === 'product_percent' ? Number(percent || 0) : null,
    max_discount_vnd: type === 'product_percent' ? (max_discount_vnd == null ? null : Number(max_discount_vnd)) : null,
    min_order_vnd: Number(min_order_vnd || 0),
    total_quantity: Number(total_quantity || 0),
    used_quantity: 0,
    starts_at: starts_at ? new Date(starts_at) : null,
    ends_at: ends_at ? new Date(ends_at) : null,
    is_active: is_active !== false,
  };

  const now = Date.now();
  if (payload.starts_at && payload.starts_at.getTime() < 0) {
    return res.status(400).json({ success: false, message: 'starts_at is invalid' });
  }
  if (payload.ends_at && payload.ends_at.getTime() <= now) {
    return res.status(400).json({ success: false, message: 'ends_at phải ở tương lai (hoặc để trống).' });
  }
  if (payload.starts_at && payload.ends_at && payload.starts_at.getTime() >= payload.ends_at.getTime()) {
    return res.status(400).json({ success: false, message: 'starts_at phải nhỏ hơn ends_at.' });
  }

  try {
    const v = await Voucher.create(payload);
    res.status(201).json({ success: true, voucher: { id: v._id.toString(), code: v.code } });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ success: false, message: 'Code already exists' });
    throw e;
  }
}

module.exports = { listPublic, my, claim, adminList, adminCreate };

