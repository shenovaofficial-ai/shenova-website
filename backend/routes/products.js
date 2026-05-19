const router  = require('express').Router();
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');
const upload  = require('../middleware/upload');

/* ── Helper: detect if a stored filename is a video ──────────────── */
const VIDEO_EXTS = /\.(mp4|webm|mov|avi|ogg)$/i;
function isVideo(filename) {
  return VIDEO_EXTS.test(filename);
}

/* ── Split uploaded files into images and videos arrays ──────────── */
function splitMedia(files = []) {
  const images = [];
  const videos = [];
  files.forEach(f => {
    const p = '/uploads/' + f.filename;
    if (isVideo(f.filename)) videos.push(p);
    else images.push(p);
  });
  return { images, videos };
}

/* ════════════════════════════════════════════════════════════════════
   GET /api/products  — public, filterable
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
    if (sort === 'price-asc')  query = query.sort({ price:  1 });
    else if (sort === 'price-desc') query = query.sort({ price: -1 });
    else query = query.sort({ createdAt: -1 });

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
   POST /api/products  — admin, supports images + videos
   Field names: "images" for images, "videos" for videos.
   Both are optional; you can upload any combination.
   ════════════════════════════════════════════════════════════════════ */
router.post(
  '/',
  protect, admin,
  // Accept up to 8 images under field "images" and up to 4 videos
  // under field "videos" in the same multipart request.
  upload.fields([
    { name: 'images', maxCount: 8 },
    { name: 'videos', maxCount: 4 }
  ]),
  async (req, res) => {
    try {
      const body = { ...req.body };

      // Parse comma-separated strings into arrays
      body.sizes  = body.sizes  ? body.sizes.split(',').map(s => s.trim())  : [];
      body.colors = body.colors ? body.colors.split(',').map(s => s.trim()) : [];
      body.featured = body.featured === 'true';
      body.trending = body.trending === 'true';

      // Images
      const imageFiles = (req.files?.images || []);
      body.images = imageFiles.map(f => '/uploads/' + f.filename);

      // Videos
      const videoFiles = (req.files?.videos || []);
      body.videos = videoFiles.map(f => '/uploads/' + f.filename);

      const product = await Product.create(body);
      res.json(product);
    } catch (err) {
      console.error('POST /products error:', err);
      res.status(500).json({ error: err.message || 'Error creating product' });
    }
  }
);

/* ════════════════════════════════════════════════════════════════════
   PUT /api/products/:id  — admin
   Behaviour:
     - If new images are uploaded they REPLACE existing images.
     - If new videos are uploaded they REPLACE existing videos.
     - If no new images/videos are uploaded the existing ones are kept.
     - Pass keepImages=true or keepVideos=true from the client to
       always preserve existing media (already the default when no
       new files are sent).
   ════════════════════════════════════════════════════════════════════ */
router.put(
  '/:id',
  protect, admin,
  upload.fields([
    { name: 'images', maxCount: 8 },
    { name: 'videos', maxCount: 4 }
  ]),
  async (req, res) => {
    try {
      const body = { ...req.body };

      if (body.sizes  && typeof body.sizes  === 'string')
        body.sizes  = body.sizes.split(',').map(s => s.trim());
      if (body.colors && typeof body.colors === 'string')
        body.colors = body.colors.split(',').map(s => s.trim());
      if (body.featured !== undefined) body.featured = body.featured === 'true';
      if (body.trending !== undefined) body.trending = body.trending === 'true';

      // Only overwrite images/videos if new files were actually uploaded
      const newImageFiles = req.files?.images || [];
      const newVideoFiles = req.files?.videos || [];

      if (newImageFiles.length > 0)
        body.images = newImageFiles.map(f => '/uploads/' + f.filename);

      if (newVideoFiles.length > 0)
        body.videos = newVideoFiles.map(f => '/uploads/' + f.filename);

      // Don't allow accidental wipe via empty string fields
      delete body.id; // safety: don't set _id from body

      const updated = await Product.findByIdAndUpdate(
        req.params.id,
        body,
        { new: true }
      );

      if (!updated) return res.status(404).json({ error: 'Product not found' });
      res.json(updated);
    } catch (err) {
      console.error('PUT /products/:id error:', err);
      res.status(500).json({ error: err.message || 'Update failed' });
    }
  }
);

/* ════════════════════════════════════════════════════════════════════
   DELETE /api/products/:id  — admin
   ════════════════════════════════════════════════════════════════════ */
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
