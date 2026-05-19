const express  = require('express');
const router   = express.Router();
const Coupon   = require('../models/Coupon');    // ← validate from here
const SpinLead = require('../models/SpinLead');  // ← mark used here too

// POST /api/coupon/apply  — validate a coupon code at checkout
router.post('/apply', async (req, res) => {
  try {
    const code = (req.body.coupon || '').trim().toUpperCase();

    if (!code) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }

    // Look up in Coupon collection (the source of truth)
    const found = await Coupon.findOne({ code });

    if (!found) {
      return res.status(400).json({ message: 'Invalid coupon' });
    }

    if (found.used) {
      return res.status(400).json({ message: 'Coupon already used' });
    }

    // Check expiry
    if (found.expiresAt && new Date() > new Date(found.expiresAt)) {
      return res.status(400).json({ message: 'Coupon has expired' });
    }

    res.json({
      success:  true,
      discount: found.discount   // percentage, e.g. 10 means 10%
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/coupon/use  — mark coupon as used after successful payment
router.post('/use', async (req, res) => {
  try {
    const code  = (req.body.coupon || '').trim().toUpperCase();
    const email = req.body.email || null;

    if (!code) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }

    // Mark used in Coupon collection
    await Coupon.findOneAndUpdate(
      { code },
      { used: true, usedBy: email }
    );

    // Also mark used in SpinLead collection (keep in sync)
    await SpinLead.findOneAndUpdate(
      { coupon: code },
      { used: true }
    );

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;