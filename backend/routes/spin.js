const express  = require('express');
const router   = express.Router();
const SpinLead = require('../models/SpinLead');
const Coupon   = require('../models/Coupon');   // ← NEW

// POST /api/spin  — spin the wheel (called from full spin-form submit if used)
router.post('/', async (req, res) => {
  try {
    const { email, phone } = req.body;

    const exists = await SpinLead.findOne({ $or: [{ email }, { phone }] });
    if (exists) {
      return res.status(400).json({ message: 'You already used the spin wheel' });
    }

    const discounts = [5, 10, 15];
    const discount  = discounts[Math.floor(Math.random() * discounts.length)];
    const coupon    = 'SHENOVA' + Math.floor(1000 + Math.random() * 9000);

    // 1️⃣ Save to SpinLead (existing)
    await SpinLead.create({ email, phone, coupon, discount, used: false });

    // 2️⃣ ALSO save to Coupon so checkout can validate it
    await Coupon.create({
      code:      coupon,
      discount:  discount,
      used:      false,
      usedBy:    null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    res.json({ success: true, coupon, discount });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/spin/save  — called from the frontend wheel animation after spin
router.post('/save', async (req, res) => {
  try {
    const { email, coupon, discount } = req.body;

    if (!email || !coupon || !discount) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    // Save to SpinLead if not already there
    const existingLead = await SpinLead.findOne({ email });
    if (!existingLead) {
      await SpinLead.create({
        email,
        phone:    email,   // phone not sent from frontend animation; use email as fallback
        coupon,
        discount,
        used: false
      });
    }

    // Save to Coupon collection if not already there
    const existingCoupon = await Coupon.findOne({ code: coupon });
    if (!existingCoupon) {
      await Coupon.create({
        code:      coupon,
        discount:  discount,
        used:      false,
        usedBy:    null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
    }

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;