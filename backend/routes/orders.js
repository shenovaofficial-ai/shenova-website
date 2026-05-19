const router   = require('express').Router();
const Order    = require('../models/Order');
const Coupon   = require('../models/Coupon');
const SpinLead = require('../models/SpinLead');
const { protect, admin } = require('../middleware/auth');

router.post('/', async (req, res) => {
  const order = await Order.create(req.body);

  // Mark coupon as used in both collections after a successful order
  const code  = (req.body.coupon || '').trim().toUpperCase();
  const email = req.body.shipping?.email || null;
  if (code) {
    await Coupon.findOneAndUpdate(
      { code },
      { used: true, usedBy: email }
    ).catch(() => {});
    await SpinLead.findOneAndUpdate(
      { coupon: code },
      { used: true }
    ).catch(() => {});
  }

  res.json(order);
});

router.get('/', async (_, res) =>
  res.json(await Order.find().sort({ createdAt: -1 }))
);

router.put('/:id', async (req, res) =>
  res.json(await Order.findByIdAndUpdate(req.params.id, req.body, { new: true }))
);

router.delete('/:id', async (req, res) => {
  await Order.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
