const mongoose = require('mongoose');
const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String, image: String, price: Number,
    size: String, color: String, qty: Number
  }],
  shipping: {
    fullName: String, email: String, phone: String,
    address: String, city: String, state: String, zip: String, country: String
  },
  paymentMethod: String,
  coupon: String,
  subtotal: Number, shippingFee: Number, total: Number,
  status: { type: String, enum: ['pending','processing','shipped','delivered','cancelled'], default: 'pending' }
}, { timestamps: true });
module.exports = mongoose.model('Order', orderSchema);
