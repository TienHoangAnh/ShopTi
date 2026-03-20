const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema(
  {
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    scope: { type: String, required: true, enum: ['platform'], default: 'platform' },

    title: { type: String, required: true },
    code: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: '' },

    type: { type: String, required: true, enum: ['freeship', 'product_percent'] },
    percent: { type: Number, default: null }, // for product_percent
    max_discount_vnd: { type: Number, default: null },

    min_order_vnd: { type: Number, default: 0 },
    total_quantity: { type: Number, default: 0 }, // 0 = unlimited
    used_quantity: { type: Number, default: 0 },

    starts_at: { type: Date, default: null },
    ends_at: { type: Date, default: null },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Voucher || mongoose.model('Voucher', voucherSchema);

