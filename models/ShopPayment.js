const mongoose = require('mongoose');

const shopPaymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },

    amount: { type: Number, required: true, default: 10000 }, // VND
    payment_code: { type: String, required: true, unique: true, index: true },
    payment_method: { type: String, required: true, enum: ['bank_transfer'], default: 'bank_transfer' },

    transfer_content: { type: String, required: true },

    status: { type: String, required: true, enum: ['pending', 'paid'], default: 'pending' },
    expires_at: { type: Date, required: true },
    paid_at: { type: Date, default: null },

    // OTP hashes (demo generates + returns codes to client; real app should SMS them)
    store_registration_otp_hash: { type: String, required: true },
    phone_verification_otp_hash: { type: String, required: true },

    otp_store_verified: { type: Boolean, default: false },
    otp_phone_verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

shopPaymentSchema.index({ payment_code: 1 });

module.exports = mongoose.models.ShopPayment || mongoose.model('ShopPayment', shopPaymentSchema);

