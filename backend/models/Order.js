const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  items: [{
    product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name:     String,
    image:    String,
    price:    Number,
    size:     String,
    color:    String,
    qty:      Number,
    customSize: {
      bust:     Number,
      waist:    Number,
      hip:      Number,
      shoulder: Number,
      length:   Number,
      sleeve:   Number,
      notes:    String
    }
  }],

  shipping: {
    fullName: String,
    email:    String,
    phone:    String,
    address:  String,
    city:     String,
    state:    String,
    zip:      String,
    country:  String
  },

  paymentMethod: String,
  coupon:        String,
  subtotal:      Number,
  shippingFee:   Number,
  discount:      { type: Number, default: 0 },
  total:         Number,

  status: {
    type:    String,
    enum:    ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },

  // ── COD fields ──────────────────────────────────────────────────
  isCOD:              { type: Boolean, default: false },
  codAdvancePaid:     { type: Number,  default: 0 },
  codAdvancePaidAt:   { type: Date,    default: null },
  codRemainingAmount: { type: Number,  default: 0 },

  // ── Razorpay payment proof ───────────────────────────────────────
  razorpay: {
    payment_id: { type: String, default: '' },
    order_id:   { type: String, default: '' },
    signature:  { type: String, default: '' },
    amount:     { type: Number, default: 0  },
    type:       { type: String, default: '' }
  }

}, { timestamps: true });

// Guard against Mongoose model re-registration errors (hot-reload / test envs)
module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);