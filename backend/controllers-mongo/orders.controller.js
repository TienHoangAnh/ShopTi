const Order = require('../../models/Order');
const CartItem = require('../../models/CartItem');
const Product = require('../../models/Product');
const Voucher = require('../../models/Voucher');
const UserVoucher = require('../../models/UserVoucher');
const { calcShippingFeeVnd } = require('../utils/shipping');

const ALLOWED_PAYMENT = ['cod', 'bank', 'wallet'];
const CANCEL_ALLOWED = ['pending', 'confirmed'];
const VND_PER_USD = Number(process.env.VND_PER_USD || 25000);

function orderToOut(o) {
  return {
    id: o._id.toString(),
    user_id: o.user?.toString?.() || o.user,
    status: o.status,
    total_amount: o.total_amount,
    subtotal_vnd: o.subtotal_vnd || 0,
    shipping_fee_vnd: o.shipping_fee_vnd || 0,
    discount_vnd: o.discount_vnd || 0,
    applied_vouchers: o.applied_vouchers || { freeship_code: null, product_code: null },
    receiver_name: o.receiver_name,
    receiver_phone: o.receiver_phone,
    shipping_address: o.shipping_address,
    payment_method: o.payment_method,
    cancelled_by: o.cancelled_by || null,
    cancelled_by_user_id: o.cancelled_by_user?.toString?.() || null,
    cancelled_at: o.cancelled_at || null,
    cancel_reason: o.cancel_reason || '',
    created_at: o.createdAt,
    items: (o.items || []).map((it) => ({
      id: it._id?.toString(),
      product_id: it.product?.toString?.() || it.product,
      quantity: it.quantity,
      price_at_order: it.price_at_order,
      product_name: it.product_name,
    })),
  };
}

function isVoucherActive(v) {
  if (!v || !v.is_active) return false;
  const now = Date.now();
  if (v.starts_at && new Date(v.starts_at).getTime() > now) return false;
  if (v.ends_at && new Date(v.ends_at).getTime() < now) return false;
  if (v.total_quantity > 0 && v.used_quantity >= v.total_quantity) return false;
  return true;
}

async function resolveVoucherForUser(userId, code, type) {
  if (!code) return null;
  const v = await Voucher.findOne({ code: String(code).trim().toUpperCase(), scope: 'platform' }).lean();
  if (!v || v.type !== type || !isVoucherActive(v)) return null;
  const uv = await UserVoucher.findOne({ user: userId, voucher: v._id, status: 'available' }).lean();
  if (!uv) return null;
  return { voucher: v, userVoucherId: uv._id };
}

function calcDiscountVnd(subtotalVnd, productVoucher) {
  if (!productVoucher) return 0;
  if (subtotalVnd < (productVoucher.min_order_vnd || 0)) return 0;
  const pct = Math.max(0, Math.min(90, Number(productVoucher.percent || 0)));
  let d = Math.floor((subtotalVnd * pct) / 100);
  // max_discount_vnd is optional; when set, it caps the discount
  if (productVoucher.max_discount_vnd != null) d = Math.min(d, Number(productVoucher.max_discount_vnd));
  return Math.max(0, d);
}

async function quote(req, res) {
  const { shipping_address, freeship_code, product_code } = req.body || {};
  const address = (shipping_address && String(shipping_address).trim()) || '';
  if (!address) return res.status(400).json({ success: false, message: 'shipping_address is required' });

  const cartItems = await CartItem.find({ user: req.user.id }).populate('product').lean();
  if (cartItems.length === 0) return res.status(400).json({ success: false, message: 'Cart is empty' });

  let subtotalUsd = 0;
  for (const it of cartItems) {
    const p = it.product;
    if (!p || it.quantity > p.stock) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for ${p?.name || 'product'}. Available: ${p?.stock ?? 0}`,
      });
    }
    subtotalUsd += Number(p.price) * it.quantity;
  }

  const ship = await calcShippingFeeVnd(address);
  if (ship.fee_vnd == null) {
    return res.status(400).json({ success: false, message: 'Hiện chỉ hỗ trợ giao Hà Nội và các tỉnh lân cận (~100km).' });
  }

  const freeship = await resolveVoucherForUser(req.user.id, freeship_code, 'freeship');
  const productV = await resolveVoucherForUser(req.user.id, product_code, 'product_percent');

  const shippingFeeVnd = freeship ? 0 : ship.fee_vnd;
  const shippingFeeUsd = shippingFeeVnd / VND_PER_USD;
  const baseUsd = subtotalUsd + shippingFeeUsd; // discount on total order value (before discount)
  const discountUsd = productV ? Math.max(0, (baseUsd * Number(productV.voucher.percent || 0)) / 100) : 0;
  const maxDiscountUsd =
    productV?.voucher?.max_discount_vnd != null ? Number(productV.voucher.max_discount_vnd) / VND_PER_USD : null;
  const discountUsdCapped = maxDiscountUsd != null ? Math.min(discountUsd, maxDiscountUsd) : discountUsd;
  const totalUsd = Math.max(0, baseUsd - discountUsdCapped);

  res.json({
    success: true,
    quote: {
      zone: ship.zone,
      subtotal_usd: Number(subtotalUsd.toFixed(2)),
      shipping_fee_vnd: Math.round(shippingFeeVnd),
      shipping_fee_usd: Number(shippingFeeUsd.toFixed(2)),
      discount_usd: Number(discountUsdCapped.toFixed(2)),
      discount_vnd: Math.round(discountUsdCapped * VND_PER_USD),
      total_usd: Number(totalUsd.toFixed(2)),
      total_vnd: Math.round(totalUsd * VND_PER_USD),
      applied_vouchers: {
        freeship_code: freeship ? freeship.voucher.code : null,
        product_code: productV ? productV.voucher.code : null,
      },
    },
  });
}

async function list(req, res) {
  const orders = await Order.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .select('status total_amount shipping_address createdAt cancelled_by cancel_reason')
    .lean();
  res.json({
    success: true,
    orders: orders.map((o) => ({
      id: o._id.toString(),
      status: o.status,
      total_amount: o.total_amount,
      shipping_address: o.shipping_address,
      created_at: o.createdAt,
      cancelled_by: o.cancelled_by || null,
      cancel_reason: o.cancel_reason || '',
    })),
  });
}

async function getOne(req, res) {
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id }).lean();
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json({ success: true, order: orderToOut(order) });
}

async function create(req, res) {
  let { receiver_name, receiver_phone, shipping_address, payment_method, freeship_code, product_code } = req.body || {};
  payment_method = ALLOWED_PAYMENT.includes(payment_method) ? payment_method : 'cod';
  const name = (receiver_name && String(receiver_name).trim()) || '';
  const phone = (receiver_phone && String(receiver_phone).trim()) || '';
  const address = (shipping_address && String(shipping_address).trim()) || '';
  if (!name) return res.status(400).json({ success: false, message: 'receiver_name is required' });
  if (!phone) return res.status(400).json({ success: false, message: 'receiver_phone is required' });
  if (!address) return res.status(400).json({ success: false, message: 'shipping_address is required' });

  const cartItems = await CartItem.find({ user: req.user.id }).populate('product').lean();
  if (cartItems.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty' });
  }

  let subtotalUsd = 0;
  for (const it of cartItems) {
    const p = it.product;
    if (!p || it.quantity > p.stock) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for ${p?.name || 'product'}. Available: ${p?.stock ?? 0}`,
      });
    }
    subtotalUsd += Number(p.price) * it.quantity;
  }

  const ship = await calcShippingFeeVnd(address);
  if (ship.fee_vnd == null) {
    return res.status(400).json({ success: false, message: 'Hiện chỉ hỗ trợ giao Hà Nội và các tỉnh lân cận (~100km).' });
  }

  const freeship = await resolveVoucherForUser(req.user.id, freeship_code, 'freeship');
  const productV = await resolveVoucherForUser(req.user.id, product_code, 'product_percent');
  const shippingFeeVnd = freeship ? 0 : ship.fee_vnd;
  const shippingFeeUsd = shippingFeeVnd / VND_PER_USD;
  const baseUsd = subtotalUsd + shippingFeeUsd; // discount on total order value (before discount)
  const discountUsd = productV ? Math.max(0, (baseUsd * Number(productV.voucher.percent || 0)) / 100) : 0;
  const maxDiscountUsd =
    productV?.voucher?.max_discount_vnd != null ? Number(productV.voucher.max_discount_vnd) / VND_PER_USD : null;
  const discountUsdCapped = maxDiscountUsd != null ? Math.min(discountUsd, maxDiscountUsd) : discountUsd;
  const totalUsd = Math.max(0, baseUsd - discountUsdCapped);

  const orderItems = cartItems.map((it) => ({
    product: it.product._id,
    quantity: it.quantity,
    price_at_order: it.product.price,
    product_name: it.product.name,
  }));

  const order = await Order.create({
    user: req.user.id,
    status: 'pending',
    total_amount: Number(totalUsd.toFixed(2)),
    subtotal_vnd: Math.round(subtotalUsd * VND_PER_USD),
    shipping_fee_vnd: Math.round(shippingFeeVnd),
    discount_vnd: Math.round(discountUsdCapped * VND_PER_USD),
    applied_vouchers: {
      freeship_code: freeship ? freeship.voucher.code : null,
      product_code: productV ? productV.voucher.code : null,
    },
    receiver_name: name,
    receiver_phone: phone,
    shipping_address: address,
    payment_method,
    items: orderItems,
  });

  // Mark vouchers used (best-effort)
  const toUse = [];
  if (freeship?.userVoucherId) toUse.push(freeship.userVoucherId);
  if (productV?.userVoucherId) toUse.push(productV.userVoucherId);
  if (toUse.length) {
    await UserVoucher.updateMany(
      { _id: { $in: toUse }, user: req.user.id, status: 'available' },
      { $set: { status: 'used', used_at: new Date(), order_id: order._id } }
    );
    await Voucher.updateMany(
      { _id: { $in: [freeship?.voucher?._id, productV?.voucher?._id].filter(Boolean) } },
      { $inc: { used_quantity: 1 } }
    );
  }

  for (const it of cartItems) {
    await Product.findByIdAndUpdate(it.product._id, { $inc: { stock: -it.quantity } });
    await CartItem.deleteOne({ _id: it._id });
  }

  const created = await Order.findById(order._id).lean();
  res.status(201).json({ success: true, order: orderToOut(created) });
}

async function cancel(req, res) {
  const { cancel_reason } = req.body || {};
  const reason = cancel_reason == null ? '' : String(cancel_reason).trim();
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id }).lean();
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (!CANCEL_ALLOWED.includes(order.status)) {
    return res.status(400).json({
      success: false,
      message: 'Chỉ có thể hủy đơn khi trạng thái là Đang xử lý hoặc Đã xác nhận. Đơn đang giao hoặc đã giao không thể hủy.',
    });
  }

  // Restock if cancelling first time
  for (const it of order.items || []) {
    await Product.findByIdAndUpdate(it.product, { $inc: { stock: it.quantity } });
  }

  const updated = await Order.findByIdAndUpdate(
    order._id,
    {
      $set: {
        status: 'cancelled',
        cancelled_by: 'user',
        cancelled_by_user: req.user.id,
        cancelled_at: new Date(),
        cancel_reason: reason,
      },
    },
    { new: true }
  ).lean();

  res.json({ success: true, order: orderToOut(updated) });
}

module.exports = { list, getOne, quote, create, cancel };

