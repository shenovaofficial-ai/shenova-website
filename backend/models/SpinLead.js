const mongoose = require('mongoose');

// ── SpinLead — stores every wheel-spin submission
// Includes both prize winners (coupon present) and
// "Better Luck Next Time" users (coupon = '', prize = 'no_prize')

const spinLeadSchema = new mongoose.Schema({

  name: {
    type:    String,
    default: '',
    trim:    true
  },

  email: {
    type:      String,
    required:  [true, 'Email is required'],
    unique:    true,          // one record per email
    trim:      true,
    lowercase: true
  },

  phone: {
    type:    String,
    default: '',
    trim:    true
  },

  // Empty string = Better Luck Next Time (no prize)
  // NOT unique — same "no coupon" value shouldn't block saves
  coupon: {
    type:    String,
    default: '',
    trim:    true,
    uppercase: true
  },

  discount: {
    type:    Number,
    default: 0,
    min:     0,
    max:     100
  },

  // Human-readable prize label e.g. "10% OFF", "Better Luck Next Time"
  prize: {
    type:    String,
    default: ''
  },

  // Raw result label from the wheel segment
  spinResult: {
    type:    String,
    default: ''
  },

  // active     → coupon is valid and unused
  // used       → coupon was redeemed at checkout
  // expired    → past expiry date
  // no_prize   → Better Luck Next Time segment — no coupon issued
  status: {
    type:    String,
    enum:    ['active', 'used', 'expired', 'no_prize'],
    default: 'active'
  },

  used: {
    type:    Boolean,
    default: false
  }

}, {
  timestamps: true
});

// Index for fast admin searches
spinLeadSchema.index({ email: 1 });
spinLeadSchema.index({ coupon: 1 });
spinLeadSchema.index({ createdAt: -1 });
spinLeadSchema.index({ status: 1 });

module.exports = mongoose.models.SpinLead || mongoose.model('SpinLead', spinLeadSchema);