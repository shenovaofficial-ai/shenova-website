const router = require('express').Router();
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', async (req, res) => {
  const { category, sort, q, featured, trending } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (q) filter.name = { $regex: q, $options: 'i' };
  if (featured) filter.featured = true;
  if (trending) filter.trending = true;
  let query = Product.find(filter);
  if (sort === 'price-asc') query = query.sort({ price: 1 });
  else if (sort === 'price-desc') query = query.sort({ price: -1 });
  else query = query.sort({ createdAt: -1 });
  res.json(await query);
});

router.get('/:id', async (req, res) => {
  const p = await Product.findById(req.params.id);
  if (!p) return res.status(404).json({ message: 'Not found' });
  res.json(p);
});

router.post('/', protect, admin, upload.array('images', 8), async (req, res) => {
  const body = req.body;
  body.images = (req.files || []).map(f => `/uploads/${f.filename}`);
  body.sizes = body.sizes ? body.sizes.split(',').map(s=>s.trim()) : [];
  body.colors = body.colors ? body.colors.split(',').map(s=>s.trim()) : [];
  body.featured = body.featured === 'true';
  body.trending = body.trending === 'true';
  res.json(await Product.create(body));
});

router.put('/:id', protect, admin, upload.array('images', 8), async (req, res) => {
  const body = { ...req.body };
  if (req.files?.length) body.images = req.files.map(f => `/uploads/${f.filename}`);
  if (body.sizes && typeof body.sizes === 'string') body.sizes = body.sizes.split(',').map(s=>s.trim());
  if (body.colors && typeof body.colors === 'string') body.colors = body.colors.split(',').map(s=>s.trim());
  res.json(await Product.findByIdAndUpdate(req.params.id, body, { new: true }));
});

router.delete('/:id', protect, admin, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
