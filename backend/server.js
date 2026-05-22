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
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items:         Array,
  total:         Number,
  shipping:      Object,
  paymentMethod: String,
  coupon:        String,
  subtotal:      Number,
  shippingFee:   Number,
  discount:      { type: Number, default: 0 },
  status:        { type: String, default: 'pending' },
  isCOD:              { type: Boolean, default: false },
  codAdvancePaid:     { type: Number, default: 0 },
  codAdvancePaidAt:   { type: Date,   default: null },
  codRemainingAmount: { type: Number, default: 0 },
  razorpay: {
    payment_id: String,
    order_id:   String,
    signature:  String,
    amount:     Number,
    type:       String
  }
}, { timestamps: true }));

const Message = mongoose.model('Message', new mongoose.Schema({
  name: String, email: String, message: String
}, { timestamps: true }));

const SpinLead = mongoose.model('SpinLead', new mongoose.Schema({
  email:    { type: String },
  coupon:   { type: String },
  discount: { type: Number },
  used:     { type: Boolean, default: false }
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

async function processUploads(files) {
  const imageFiles = files?.images || [];
  const videoFiles = files?.videos || [];
  const images = await Promise.all(imageFiles.map(f => uploadToCloudinary(f.buffer, f.originalname)));
  const videos = await Promise.all(videoFiles.map(f => uploadToCloudinary(f.buffer, f.originalname)));
  return { images, videos };
}

// ================= STORIES =================
// ── The storyRoutes module handles all /api/stories/* endpoints.
//    It uses Cloudinary (via storyUpload middleware) so media URLs are
//    permanent, publicly accessible URLs — NOT local disk paths.
//    Routes provided:
//      GET    /api/stories              → live (non-expired) stories
//      GET    /api/stories/admin        → ALL stories incl. expired
//      POST   /api/stories              → upload new story (Cloudinary)
//      PUT    /api/stories/reorder      → drag-to-reorder
//      PUT    /api/stories/:id          → update caption / CTA / order
//      DELETE /api/stories/cleanup      → purge expired + Cloudinary assets
//      DELETE /api/stories/:id          → delete one story
//      POST   /api/stories/:id/view     → increment view count

const storyRoutes = require('./routes/storyRoutes');
app.use('/api/stories', storyRoutes);

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
    if (body.name) {
      body.slug = body.name.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-') + '-' + Date.now();
    }
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
  try {
    const body = req.body;

    if (body.isCOD) {
      const rzp = body.razorpay || {};
      if (!rzp.payment_id) {
        return res.status(400).json({ error: 'COD orders require a ₹100 advance payment. No payment proof received.' });
      }
      if (rzp.type !== 'cod_advance') {
        return res.status(400).json({ error: 'Invalid payment type for COD order.' });
      }
      if (Number(rzp.amount) !== 100) {
        return res.status(400).json({ error: `COD advance must be ₹100. Received: ₹${rzp.amount}` });
      }
      body.codAdvancePaid     = 100;
      body.codAdvancePaidAt   = body.codAdvancePaidAt || new Date();
      body.codRemainingAmount = Math.max(0, (body.subtotal || 0) - (body.discount || 0));
    }

    const order = await Order.create(body);

    const code = (body.coupon || '').trim().toUpperCase();
    if (code) {
      await SpinLead.findOneAndUpdate({ coupon: code }, { used: true }).catch(() => {});
    }

    console.log(`✅ Order created — ${order._id} | ${body.isCOD ? 'COD (₹100 advance paid)' : 'PREPAID'} | ₹${order.total}`);
    res.json(order);
  } catch (err) {
    console.error('Order create error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.get('/api/orders', async (req, res) => {
  res.json(await Order.find().sort('-createdAt'));
});

app.put('/api/orders/:id', async (req, res) => {
  res.json(await Order.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

app.delete('/api/orders/:id', async (req, res) => {
  await Order.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
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

// ================= NEWSLETTER =================

app.post('/api/newsletter', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });
    res.json({ success: true, message: 'Subscribed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ================= SPIN WHEEL =================

app.post('/api/spin', async (req, res) => {
  res.redirect(307, '/api/spin/save');
});

app.post('/api/spin/save', async (req, res) => {
  try {
    const { email, coupon, discount } = req.body;
    if (!email || !coupon) return res.status(400).json({ message: 'Email and coupon are required' });
    await SpinLead.findOneAndUpdate(
      { email: email.toLowerCase() },
      { email: email.toLowerCase(), coupon: coupon.toUpperCase(), discount: Number(discount) || 0, used: false },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ================= COUPON =================

app.post('/api/coupon/apply', async (req, res) => {
  try {
    const { coupon } = req.body;
    if (!coupon) return res.status(400).json({ message: 'No coupon provided' });
    const found = await SpinLead.findOne({ coupon: coupon.toUpperCase() });
    if (!found) return res.status(400).json({ message: 'Invalid coupon code' });
    if (found.used) return res.status(400).json({ message: 'This coupon has already been used' });
    res.json({ success: true, discount: found.discount });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/coupon/use', async (req, res) => {
  try {
    const { coupon } = req.body;
    if (!coupon) return res.status(400).json({ message: 'No coupon provided' });
    await SpinLead.findOneAndUpdate({ coupon: coupon.toUpperCase() }, { used: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/coupons', async (req, res) => {
  try {
    const coupons = await SpinLead.find().sort('-createdAt');
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/coupons/:id', async (req, res) => {
  try {
    const updated = await SpinLead.findByIdAndUpdate(req.params.id, { used: req.body.used }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Coupon not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/coupons/:id', async (req, res) => {
  try {
    await SpinLead.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ================= PAYMENT =================

const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/payment', paymentRoutes);

// ================= 404 CATCH-ALL (API) =================
// Returns JSON for any unmatched /api/* route — prevents HTML error pages
// reaching the frontend and causing "Unexpected token '<'" parse errors.
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `API route not found: ${req.method} ${req.originalUrl}` });
});

// ================= START SERVER =================

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
    app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => { console.error('MongoDB error:', err); process.exit(1); });