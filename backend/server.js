require('dotenv').config();

const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const path      = require('path');
const upload    = require('./middleware/upload'); // ← Cloudinary multer

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
  name:    String,
  email:   String,
  message: String
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
  const { name, email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({ name, email, password: hash });
    res.json({ id: user._id, email });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'shenova_secret'
  );
  res.json({ token, role: user.role, name: user.name });
});

// ================= PRODUCTS =================

// Multer handler that catches upload errors cleanly
function handleUpload(req, res, next) {
  upload.fields([
    { name: 'images', maxCount: 8 },
    { name: 'videos', maxCount: 4 }
  ])(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err.message);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}

// GET ALL
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
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET ONE
app.get('/api/products/:id', async (req, res) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Not found' });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// CREATE
app.post('/api/products', handleUpload, async (req, res) => {
  try {
    const body = { ...req.body };

    body.sizes    = body.sizes    ? body.sizes.split(',').map(s => s.trim()).filter(Boolean)  : [];
    body.colors   = body.colors   ? body.colors.split(',').map(s => s.trim()).filter(Boolean) : [];
    body.featured = body.featured === 'true';
    body.trending = body.trending === 'true';

    // Cloudinary URLs are in file.path
    body.images = (req.files?.images || []).map(f => f.path);
    body.videos = (req.files?.videos || []).map(f => f.path);

    console.log(`POST /products — images: ${body.images.length}, videos: ${body.videos.length}`);

    const product = await Product.create(body);
    res.json(product);
  } catch (err) {
    console.error('POST /products error:', err);
    res.status(500).json({ error: err.message || 'Error creating product' });
  }
});

// UPDATE
app.put('/api/products/:id', handleUpload, async (req, res) => {
  try {
    const body = { ...req.body };

    if (body.sizes  && typeof body.sizes  === 'string')
      body.sizes  = body.sizes.split(',').map(s => s.trim()).filter(Boolean);
    if (body.colors && typeof body.colors === 'string')
      body.colors = body.colors.split(',').map(s => s.trim()).filter(Boolean);
    if (body.featured !== undefined) body.featured = body.featured === 'true';
    if (body.trending !== undefined) body.trending = body.trending === 'true';

    const newImages = req.files?.images || [];
    const newVideos = req.files?.videos || [];

    if (newImages.length > 0) body.images = newImages.map(f => f.path);
    if (newVideos.length > 0) body.videos = newVideos.map(f => f.path);

    delete body.id;

    const updated = await Product.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    res.json(updated);
  } catch (err) {
    console.error('PUT /products/:id error:', err);
    res.status(500).json({ error: err.message || 'Update failed' });
  }
});

// DELETE
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
  const orders = await Order.find().sort('-createdAt');
  res.json(orders);
});

app.put('/api/orders/:id', async (req, res) => {
  const updated = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

// ================= CONTACT =================

app.post('/api/contact', async (req, res) => {
  try {
    await Message.create(req.body);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/contact', async (req, res) => {
  const msgs = await Message.find().sort({ createdAt: -1 });
  res.json(msgs);
});

app.delete('/api/contact/:id', async (req, res) => {
  await Message.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// ================= SERVER START =================

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shenova')
  .then(async () => {
    console.log('✅ MongoDB connected');

    const exists = await User.findOne({ email: 'admin@shenova.com' });
    if (!exists) {
      await User.create({
        name:     'Admin',
        email:    'admin@shenova.com',
        password: await bcrypt.hash('admin123', 10),
        role:     'admin'
      });
      console.log('👤 Admin seeded');
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });