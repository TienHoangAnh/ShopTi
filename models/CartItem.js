const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, default: 1 },
  },
  { timestamps: true }
);

cartItemSchema.index({ user: 1, product: 1 }, { unique: true });

module.exports = mongoose.models.CartItem || mongoose.model('CartItem', cartItemSchema);
