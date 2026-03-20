const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    price_at_order: { type: Number, required: true },
    product_name: { type: String, required: true },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    total_amount: { type: Number, required: true },
    receiver_name: { type: String, required: true },
    receiver_phone: { type: String, required: true },
    shipping_address: { type: String, required: true },
    payment_method: {
      type: String,
      required: true,
      enum: ['cod', 'bank', 'wallet'],
      default: 'cod',
    },
    subtotal_vnd: { type: Number, default: 0 },
    shipping_fee_vnd: { type: Number, default: 0 },
    discount_vnd: { type: Number, default: 0 },
    applied_vouchers: {
      freeship_code: { type: String, default: null },
      product_code: { type: String, default: null },
    },
    cancelled_by: { type: String, enum: ['user', 'admin'], default: null },
    cancelled_by_user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancelled_at: { type: Date, default: null },
    cancel_reason: { type: String, default: '' },
    items: [orderItemSchema],
  },
  { timestamps: true }
);

orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
