const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    unique: true,
    required: true
  },

  discount: {
    type: Number,
    required: true
  },

  used: {
    type: Boolean,
    default: false
  },

  usedBy: {
    type: String,
    default: null
  },

  expiresAt: {
    type: Date
  }

}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);