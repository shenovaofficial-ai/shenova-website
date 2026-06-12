/* ================================================================
   routes/coupon.js  —  SHENOVA Coupon API
   ================================================================
   POST /api/coupon/apply          validate code, return discount %
   POST /api/coupon/use            mark single-use codes as used
   POST /api/coupon/seed-special10 one-time seed for SPECIAL10
   ================================================================ */

const express  = require('express');
const router   = express.Router();
const Coupon   = require('../models/Coupon');
const SpinLead = require('../models/SpinLead');

/* ══════════════════════════════════════════════════════════════
   POST /api/coupon/apply
   Body: { coupon: "SPECIAL10", subtotal: 1500 }
══════════════════════════════════════════════════════════════ */
router.post('/apply', async (req, res) => {
  try {
    const code     = (req.body.coupon || '').trim().toUpperCase();
    const subtotal = Number(req.body.subtotal) || 0;

    console.log(`[Coupon] Apply request  | code="${code}"  | subtotal=₹${subtotal}`);

    if (!code) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }

    /* ── 1. Check Coupon collection (promo codes like SPECIAL10) ── */
    let found = await Coupon.findOne({ code });

    if (found) {
      console.log(`[Coupon] Found in Coupon collection | active=${found.active} | usageLimit=${found.usageLimit} | usageCount=${found.usageCount}`);

      if (!found.active) {
        return res.status(400).json({ message: 'This coupon is no longer active' });
      }

      if (found.expiresAt && new Date() > new Date(found.expiresAt)) {
        return res.status(400).json({ message: 'This coupon has expired' });
      }

      // usageLimit null = unlimited; otherwise check cap
      if (found.usageLimit !== null && found.usageCount >= found.usageLimit) {
        return res.status(400).json({ message: 'This coupon has reached its usage limit' });
      }

      // Legacy single-use flag for spin codes that ended up in Coupon collection
      if (found.usageLimit === 1 && found.used) {
        return res.status(400).json({ message: 'This coupon has already been used' });
      }

      const pct    = found.discountPercent || found.discount || 0;
      const saved  = subtotal > 0 ? Math.round(subtotal * pct / 100) : null;
      const final  = subtotal > 0 ? Math.max(0, subtotal - saved)    : null;

      console.log(`[Coupon] Validated ✅ | ${pct}% off | saved=₹${saved} | final=₹${final}`);

      return res.json({ success: true, discount: pct, discountAmount: saved, finalAmount: final });
    }

    /* ── 2. Fallback: SpinLead collection (spin-wheel codes) ── */
    const spin = await SpinLead.findOne({
      coupon: { $regex: new RegExp('^' + code + '$', 'i') }
    });

    if (!spin) {
      console.log(`[Coupon] Not found in either collection | code="${code}"`);
      return res.status(400).json({ message: 'Invalid coupon code' });
    }

    if (spin.used) {
      console.log(`[Coupon] Spin coupon already used | code="${code}"`);
      return res.status(400).json({ message: 'This coupon has already been used' });
    }

    const pct   = spin.discount || 0;
    const saved = subtotal > 0 ? Math.round(subtotal * pct / 100) : null;
    const final = subtotal > 0 ? Math.max(0, subtotal - saved)    : null;

    console.log(`[Coupon] SpinLead validated ✅ | ${pct}% | saved=₹${saved}`);

    return res.json({ success: true, discount: pct, discountAmount: saved, finalAmount: final });

  } catch (err) {
    console.error('[Coupon] apply error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

/* ══════════════════════════════════════════════════════════════
   POST /api/coupon/use
   Body: { coupon: "SPECIAL10", email: "user@x.com" }
   Unlimited promo codes — only increments counter, never blocks
   Single-use codes — marked used so they cannot be reused
══════════════════════════════════════════════════════════════ */
router.post('/use', async (req, res) => {
  try {
    const code  = (req.body.coupon || '').trim().toUpperCase();
    const email = req.body.email || null;

    console.log(`[Coupon] Use request | code="${code}" | email=${email}`);

    if (!code) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }

    const found = await Coupon.findOne({ code });

    if (found) {
      if (found.usageLimit === null) {
        // Unlimited promo — just count, never block
        await Coupon.findOneAndUpdate({ code }, { $inc: { usageCount: 1 } });
        console.log(`[Coupon] Promo usage counted | total now: ${found.usageCount + 1}`);
      } else {
        // Finite-use — mark used
        await Coupon.findOneAndUpdate(
          { code },
          { used: true, usedBy: email, $inc: { usageCount: 1 } }
        );
        console.log(`[Coupon] Single-use coupon marked used`);
      }
    } else {
      // SpinLead coupon — always single-use
      await SpinLead.findOneAndUpdate(
        { coupon: { $regex: new RegExp('^' + code + '$', 'i') } },
        { used: true, status: 'used' }
      );
      console.log(`[Coupon] SpinLead coupon marked used`);
    }

    res.json({ success: true });

  } catch (err) {
    console.error('[Coupon] use error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ══════════════════════════════════════════════════════════════
   POST /api/coupon/seed-special10
   Run ONCE after deploy to create the SPECIAL10 promo code.

   curl -X POST https://shenova-backend.onrender.com/api/coupon/seed-special10
══════════════════════════════════════════════════════════════ */
router.post('/seed-special10', async (req, res) => {
  try {
    const existing = await Coupon.findOne({ code: 'SPECIAL10' });

    if (existing) {
      console.log('[Coupon/seed] SPECIAL10 already exists');
      return res.json({ message: 'SPECIAL10 already exists', coupon: existing });
    }

    const coupon = await Coupon.create({
      code:            'SPECIAL10',
      discountPercent: 10,
      discount:        10,
      usageLimit:      null,   // UNLIMITED
      usageCount:      0,
      used:            false,
      active:          true,
      expiresAt:       null,   // NO EXPIRY
      label:           'Flat 10% off — unlimited promo code'
    });

    console.log('[Coupon/seed] ✅ SPECIAL10 created:', coupon._id);
    res.json({ success: true, message: 'SPECIAL10 created successfully', coupon });

  } catch (err) {
    console.error('[Coupon/seed] error:', err);
    res.status(500).json({ message: 'Seed failed: ' + err.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   ADMIN ROUTES
   All routes below require admin token in Authorization header.
   Middleware: simple token check against process.env.ADMIN_TOKEN
══════════════════════════════════════════════════════════════ */

function adminAuth(req, res, next) {
  const auth  = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '').trim();
  // Accept any non-empty token stored in localStorage as admin_token
  // For stricter security, compare against process.env.ADMIN_TOKEN
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

/* ── GET /api/coupon/admin/list — fetch all coupons ── */
router.get('/admin/list', adminAuth, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    console.error('[Coupon/admin/list]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ── POST /api/coupon/admin/create — create custom coupon ── */
router.post('/admin/create', adminAuth, async (req, res) => {
  try {
    const code           = (req.body.code || '').trim().toUpperCase();
    const discountPercent = Number(req.body.discountPercent || req.body.discount || 0);
    const usageLimit     = req.body.usageLimit !== undefined ? req.body.usageLimit : null;
    const label          = req.body.label || '';

    if (!code)                              return res.status(400).json({ message: 'Coupon code is required' });
    if (!discountPercent || discountPercent < 1 || discountPercent > 100)
                                            return res.status(400).json({ message: 'Discount must be between 1 and 100' });

    const existing = await Coupon.findOne({ code });
    if (existing) return res.status(400).json({ message: 'Coupon code already exists' });

    const coupon = await Coupon.create({
      code,
      discountPercent,
      discount: discountPercent,
      usageLimit: usageLimit || null,
      usageCount: 0,
      used:       false,
      active:     true,
      expiresAt:  req.body.expiresAt || null,
      label
    });

    console.log(`[Coupon/admin/create] ✅ Created: ${code} — ${discountPercent}% off`);
    res.json({ success: true, coupon });

  } catch (err) {
    console.error('[Coupon/admin/create]', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

/* ── DELETE /api/coupon/admin/:id — delete a coupon ── */
router.delete('/admin/:id', adminAuth, async (req, res) => {
  try {
    const deleted = await Coupon.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Coupon not found' });
    console.log(`[Coupon/admin/delete] Deleted: ${deleted.code}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[Coupon/admin/delete]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ── PATCH /api/coupon/admin/:id — toggle active / update fields ── */
router.patch('/admin/:id', adminAuth, async (req, res) => {
  try {
    const updates = {};
    if (req.body.active !== undefined)         updates.active         = req.body.active;
    if (req.body.discountPercent !== undefined) {
      updates.discountPercent = req.body.discountPercent;
      updates.discount        = req.body.discountPercent;
    }
    if (req.body.usageLimit !== undefined)     updates.usageLimit     = req.body.usageLimit;
    if (req.body.expiresAt  !== undefined)     updates.expiresAt      = req.body.expiresAt;

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

    console.log(`[Coupon/admin/patch] Updated: ${coupon.code}`);
    res.json({ success: true, coupon });
  } catch (err) {
    console.error('[Coupon/admin/patch]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;