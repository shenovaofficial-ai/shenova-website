const mongoose = require('mongoose');

function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-') +
    '-' + Date.now();
}

const productSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  slug:         { type: String, unique: true, sparse: true },
  description:  String,
  price:        { type: Number, required: true },
  comparePrice: Number,
  category:     String,
  images:       [String],
  videos:       [String],
  sizes:        [String],
  colors:       [String],
  stock:        { type: Number, default: 10 },
  featured:     { type: Boolean, default: false },
  trending:     { type: Boolean, default: false }
}, { timestamps: true });

productSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = generateSlug(this.name);
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);