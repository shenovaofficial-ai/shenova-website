const mongoose = require('mongoose');

// ── SpinLead — stores every wheel-spin submission
// Fields: name, email, phone, coupon, discount, prize, spinResult, status, used
// Timestamps: createdAt (submission time) + updatedAt auto-managed by Mongoose

const spinLeadSchema = new mongoose.Schema({

  name: {
    type:    String,
    default: '',
    trim:    true
  },

  email: {
    type:     String,
    required: [true, 'Email is required'],
    unique:   true,
    trim:     true,
    lowercase: true
  },

  phone: {
    type:    String,
    default: '',
    trim:    true
  },

  coupon: {
    type:     String,
    required: [true, 'Coupon code is required'],
    unique:   true,
    trim:     true,
    uppercase: true
  },

  discount: {
    type:    Number,
    required: true,
    min:     0,
    max:     100
  },

  // Human-readable prize label e.g. "10% OFF", "Free Shipping"
  prize: {
    type:    String,
    default: ''
  },

  // Raw result label from the wheel segment
  spinResult: {
    type:    String,
    default: ''
  },

  // active → coupon is valid and unused
  // used   → coupon was redeemed at checkout
  // expired → past expiry date (can be set by a cron/cleanup job)
  status: {
    type:    String,
    enum:    ['active', 'used', 'expired'],
    default: 'active'
  },

  used: {
    type:    Boolean,
    default: false
  }

}, {
  timestamps: true   // adds createdAt + updatedAt automatically
});

// Index for fast admin searches
spinLeadSchema.index({ email: 1 });
spinLeadSchema.index({ coupon: 1 });
spinLeadSchema.index({ createdAt: -1 });
spinLeadSchema.index({ status: 1 });

module.exports = mongoose.model('SpinLead', spinLeadSchema);
