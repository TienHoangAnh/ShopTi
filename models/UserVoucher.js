const mongoose = require('mongoose');

const userVoucherSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    voucher: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', required: true, index: true },
    status: { type: String, required: true, enum: ['available', 'used'], default: 'available' },
    claimed_at: { type: Date, default: () => new Date() },
    used_at: { type: Date, default: null },
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  },
  { timestamps: true }
);

userVoucherSchema.index({ user: 1, voucher: 1 }, { unique: true });

module.exports = mongoose.models.UserVoucher || mongoose.model('UserVoucher', userVoucherSchema);

