const router = require('express').Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  const u = await User.findById(req.user._id).populate('wishlist');
  res.json(u.wishlist);
});
router.post('/:productId', protect, async (req, res) => {
  const u = await User.findById(req.user._id);
  const id = req.params.productId;
  u.wishlist = u.wishlist.some(p => p.toString()===id)
    ? u.wishlist.filter(p => p.toString()!==id)
    : [...u.wishlist, id];
  await u.save();
  res.json(u.wishlist);
});
module.exports = router;
