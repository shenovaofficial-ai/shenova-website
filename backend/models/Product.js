const mongoose = require('mongoose');
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: String,
  description: String,
  price: { type: Number, required: true },
  comparePrice: Number,
  category: String,
  images: [String],
  sizes: [String],
  colors: [String],
  stock: { type: Number, default: 10 },
  featured: { type: Boolean, default: false },
  trending: { type: Boolean, default: false }
}, { timestamps: true });
module.exports = mongoose.model('Product', productSchema);
