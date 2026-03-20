const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    shop_name: { type: String, required: true, unique: true, index: true },

    logo_url: { type: String, default: null },
    banner_url: { type: String, default: null },
    description: { type: String, default: '' },

    // Sender / pickup contact & address (similar to Shopee store profile)
    sender_name: { type: String, required: true },
    sender_phone: { type: String, required: true },
    province: { type: String, required: true },
    district: { type: String, required: true },
    ward: { type: String, required: true },
    detail_address: { type: String, required: true },

    shipping_providers: [{ type: String }],

    bank_account_name: { type: String, required: true },
    bank_account_number: { type: String, required: true },
    bank_name: { type: String, required: true },

    status: {
      type: String,
      required: true,
      enum: ['pending_payment', 'active', 'rejected'],
      default: 'pending_payment',
    },
    applied_at: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Shop || mongoose.model('Shop', shopSchema);

