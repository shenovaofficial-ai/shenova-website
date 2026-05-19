require('dotenv').config();

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { multerUpload, uploadToCloudinary } = require('./middleware/upload');

const app = express();
app.use(cors());
app.use(express.json());

// ================= MODELS =================

const User = mongoose.model('User', new mongoose.Schema({
  name:     String,
  email:    { type: String, unique: true },
  password: String,
  role:     { type: String, default: 'user' }
}, { timestamps: true }));

const Product = mongoose.model('Product', new mongoose.Schema({
  name:         { type: String, required: true },
  slug:         String,
  description:  String,
  price:        { type: Number, required: true },
  comparePrice: Number,
  category:     String,
  images:       [String],
  videos:       [String],
  sizes:        [String],
  colors:       [String],
  stock:        { type: Number, default: 10 },
  featured:     { type: Boolean, default: false },
  trending:     { type: Boolean, default: false }
}, { timestamps: true }));

const Order = mongoose.model('Order', new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items:    Array,
  total:    Number,
  shipping: Object,
  status:   { type: String, default: 'pending' }
}, { timestamps: true }));

const Message = mongoose.model('Message', new mongoose.Schema({
  name: String, email: String, message: String
}, { timestamps: true }));

// ================= AUTH =================

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'shenova_secret');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ================= AUTH ROUTES =================

app.post('/api/auth/register', async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 10);
    const user = await User.create({ name: req.body.name, email: req.body.email, password: hash });
    res.json({ id: user._id, email: user.email });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user || !(await bcrypt.compare(req.body.password, user.password)))
    return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'shenova_secret');
  res.json({ token, role: user.role, name: user.name });
});

// ================= MULTER MIDDLEWARE =================

function handleUpload(req, res, next) {
  multerUpload.fields([
    { name: 'images', maxCount: 8 },
    { name: 'videos', maxCount: 4 }
  ])(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err.message);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}

// Upload all files in req.files to Cloudinary, return { images, videos }
async function processUploads(files) {
  const imageFiles = files?.images || [];
  const videoFiles = files?.videos || [];

  const images = await Promise.all(
    imageFiles.map(f => uploadToCloudinary(f.buffer, f.originalname))
  );
  const videos = await Promise.all(
    videoFiles.map(f => uploadToCloudinary(f.buffer, f.originalname))
  );

  return { images, videos };
}

// ================= PRODUCTS =================

app.get('/api/products', async (req, res) => {
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
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Not found' });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.post('/api/products', handleUpload, async (req, res) => {
  try {
    const body = { ...req.body };
    body.sizes    = body.sizes    ? body.sizes.split(',').map(s => s.trim()).filter(Boolean)  : [];
    body.colors   = body.colors   ? body.colors.split(',').map(s => s.trim()).filter(Boolean) : [];
    body.featured = body.featured === 'true';
    body.trending = body.trending === 'true';

const { images, videos } = await processUploads(req.files);
    body.images = images;
    body.videos = videos;

    // Always generate a unique slug from name
    if (body.name) {
      body.slug = body.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-') +
        '-' + Date.now();
    }

    console.log(`POST /products — images: ${images.length}, videos: ${videos.length}`);
    const product = await Product.create(body);
    res.json(product);
  } catch (err) {
    console.error('POST /products error:', err);
    res.status(500).json({ error: err.message || 'Error creating product' });
  }
});

app.put('/api/products/:id', handleUpload, async (req, res) => {
  try {
    const body = { ...req.body };
    if (typeof body.sizes  === 'string') body.sizes  = body.sizes.split(',').map(s => s.trim()).filter(Boolean);
    if (typeof body.colors === 'string') body.colors = body.colors.split(',').map(s => s.trim()).filter(Boolean);
    if (body.featured !== undefined) body.featured = body.featured === 'true';
    if (body.trending !== undefined) body.trending = body.trending === 'true';
    delete body.id;

    const { images, videos } = await processUploads(req.files);
    if (images.length > 0) body.images = images;
    if (videos.length > 0) body.videos = videos;

    const updated = await Product.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    res.json(updated);
  } catch (err) {
    console.error('PUT /products error:', err);
    res.status(500).json({ error: err.message || 'Update failed' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ================= ORDERS =================

app.post('/api/orders', async (req, res) => {
  const order = await Order.create(req.body);
  res.json(order);
});
app.get('/api/orders', async (req, res) => {
  res.json(await Order.find().sort('-createdAt'));
});
app.put('/api/orders/:id', async (req, res) => {
  res.json(await Order.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// ================= CONTACT =================

app.post('/api/contact', async (req, res) => {
  try { await Message.create(req.body); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/contact', async (req, res) => {
  res.json(await Message.find().sort({ createdAt: -1 }));
});
app.delete('/api/contact/:id', async (req, res) => {
  await Message.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// ================= START =================

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shenova')
  .then(async () => {
    console.log('✅ MongoDB connected');
    const exists = await User.findOne({ email: 'admin@shenova.com' });
    if (!exists) {
      await User.create({
        name: 'Admin', email: 'admin@shenova.com',
        password: await bcrypt.hash('admin123', 10), role: 'admin'
      });
      console.log('👤 Admin seeded');
    }
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => { console.error('MongoDB error:', err); process.exit(1); });