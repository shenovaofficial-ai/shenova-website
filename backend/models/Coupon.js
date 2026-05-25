/* ================================================================
   models/Coupon.js — SHENOVA Coupon Model
   ================================================================
   Supports two coupon types:
   1. Spin-wheel coupons  — single-use, tracked in SpinLead too
   2. Promo coupons       — unlimited usage (usageLimit: null)
   ================================================================ */

const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({

  // The code customers enter — always UPPERCASE
  code: {
    type:      String,
    unique:    true,
    required:  true,
    uppercase: true,
    trim:      true
  },

  // Discount percentage  e.g. 10 means 10%
  discountPercent: {
    type:     Number,
    required: true,
    min:      0,
    max:      100
  },

  // Legacy alias — mirrors discountPercent for backward-compat with old routes
  discount: {
    type: Number
  },

  // null = unlimited;  positive integer = max uses allowed
  usageLimit: {
    type:    Number,
    default: null
  },

  // Running total of how many times this code has been redeemed
  usageCount: {
    type:    Number,
    default: 0
  },

  // Legacy single-use flag (kept for spin-wheel coupons in old flow)
  used: {
    type:    Boolean,
    default: false
  },

  usedBy: {
    type:    String,
    default: null
  },

  // Kill-switch — set false to instantly disable a code
  active: {
    type:    Boolean,
    default: true
  },

  // null = never expires
  expiresAt: {
    type:    Date,
    default: null
  },

  // Internal admin label
  label: {
    type:    String,
    default: ''
  }

}, { timestamps: true });

// Keep legacy discount field in sync
couponSchema.pre('save', function (next) {
  this.discount = this.discountPercent;
  next();
});

module.exports = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
