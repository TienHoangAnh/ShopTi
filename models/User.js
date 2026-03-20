const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    full_name: { type: String, required: true },
    phone: { type: String, default: null },
    address: { type: String, default: null },
    role: { type: String, required: true, enum: ['user', 'admin'], default: 'user' },
    store_name: { type: String, default: null },
    store_description: { type: String, default: '' },
    store_status: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
    store_applied_at: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
