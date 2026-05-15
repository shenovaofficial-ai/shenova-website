const router = require('express').Router();
const Order = require('../models/Order');
const { protect, admin } = require('../middleware/auth');

router.post('/', async (req, res) => {
  const order = await Order.create(req.body);
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
