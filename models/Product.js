const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    image_url: { type: String, default: '/images/placeholder.svg' },
    stock: { type: Number, required: true, default: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    brand: { type: String, default: null, index: true },
    sizes: { type: [String], default: [] },
    size_tags: { type: String, default: null },
    size: { type: String, default: null },
    color: { type: String, default: null },
  },
  { timestamps: true }
);

productSchema.index({ category: 1 });
productSchema.index({ size: 1 });
productSchema.index({ color: 1 });
productSchema.index({ price: 1 });

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
