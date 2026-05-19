const router  = require('express').Router();
const Product = require('../models/Product');
const upload  = require('../middleware/upload');
const path    = require('path');

/* ── Detect video by extension ───────────────────────────────────── */
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.avi', '.ogg']);
function isVideoFile(filename) {
  return VIDEO_EXTS.has(path.extname(filename || '').toLowerCase());
}

/* ── Extract the public URL from a multer-cloudinary file object ─── */
// multer-storage-cloudinary puts the Cloudinary URL in file.path
function fileUrl(file) {
  return file.path; // full https://res.cloudinary.com/... URL
}

/* ════════════════════════════════════════════════════════════════════
   GET /api/products  — public
   ════════════════════════════════════════════════════════════════════ */
router.get('/', async (req, res) => {
  try {
    const { category, sort, q, featured, trending } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (q)        filter.name = { $regex: q, $options: 'i' };
    if (featured) filter.featured = true;
    if (trending) filter.trending = true;

    let query = Product.find(filter);
    if (sort === 'price-asc')       query = query.sort({ price:  1 });
    else if (sort === 'price-desc') query = query.sort({ price: -1 });
    else                            query = query.sort({ createdAt: -1 });

    res.json(await query);
  } catch (err) {
    console.error('GET /products error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/* ════════════════════════════════════════════════════════════════════
   GET /api/products/:id  — public
   ════════════════════════════════════════════════════════════════════ */
router.get('/:id', async (req, res) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Not found' });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

/* ════════════════════════════════════════════════════════════════════
   POST /api/products — create with images + videos via Cloudinary
   ════════════════════════════════════════════════════════════════════ */
router.post('/', (req, res, next) => {
  upload.fields([
    { name: 'images', maxCount: 8 },
    { name: 'videos', maxCount: 4 },
  ])(req, res, (err) => {
    if (err) {
      console.error('Upload error on POST /products:', err.message);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const body = { ...req.body };

    body.sizes    = body.sizes    ? body.sizes.split(',').map(s => s.trim()).filter(Boolean)  : [];
    body.colors   = body.colors   ? body.colors.split(',').map(s => s.trim()).filter(Boolean) : [];
    body.featured = body.featured === 'true';
    body.trending = body.trending === 'true';

    // Cloudinary URLs come back in file.path
    const imageFiles = req.files?.images || [];
    const videoFiles = req.files?.videos || [];

    body.images = imageFiles.map(fileUrl);
    body.videos = videoFiles.map(fileUrl);

    console.log(`POST /products — images: ${body.images.length}, videos: ${body.videos.length}`);

    const product = await Product.create(body);
    res.json(product);
  } catch (err) {
    console.error('POST /products error:', err);
    res.status(500).json({ error: err.message || 'Error creating product' });
  }
});

/* ════════════════════════════════════════════════════════════════════
   PUT /api/products/:id — update; replaces media only if new files sent
   ════════════════════════════════════════════════════════════════════ */
router.put('/:id', (req, res, next) => {
  upload.fields([
    { name: 'images', maxCount: 8 },
    { name: 'videos', maxCount: 4 },
  ])(req, res, (err) => {
    if (err) {
      console.error('Upload error on PUT /products/:id:', err.message);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const body = { ...req.body };

    if (body.sizes  && typeof body.sizes  === 'string')
      body.sizes  = body.sizes.split(',').map(s => s.trim()).filter(Boolean);
    if (body.colors && typeof body.colors === 'string')
      body.colors = body.colors.split(',').map(s => s.trim()).filter(Boolean);
    if (body.featured !== undefined) body.featured = body.featured === 'true';
    if (body.trending !== undefined) body.trending = body.trending === 'true';

    const newImageFiles = req.files?.images || [];
    const newVideoFiles = req.files?.videos || [];

    // Only overwrite if new files were actually uploaded
    if (newImageFiles.length > 0) body.images = newImageFiles.map(fileUrl);
    if (newVideoFiles.length > 0) body.videos = newVideoFiles.map(fileUrl);

    delete body.id; // never overwrite _id

    console.log(`PUT /products/${req.params.id} — images: ${newImageFiles.length}, videos: ${newVideoFiles.length}`);

    const updated = await Product.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    res.json(updated);
  } catch (err) {
    console.error('PUT /products/:id error:', err);
    res.status(500).json({ error: err.message || 'Update failed' });
  }
});

/* ════════════════════════════════════════════════════════════════════
   DELETE /api/products/:id
   ════════════════════════════════════════════════════════════════════ */
router.delete('/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;