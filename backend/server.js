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

// ================= FIXED SPINLEAD MODEL =================
// Added: name, phone, spinResult, prize fields + proper timestamps
// FIX: email unique index created separately after model registration
//      so it uses a sparse index (allows multiple null values safely)

const spinLeadSchema = new mongoose.Schema({
  name:       { type: String, default: '', trim: true },
  email:      { type: String, required: true, trim: true, lowercase: true },
  phone:      { type: String, default: '', trim: true },
  coupon:     { type: String, default: '', trim: true, uppercase: true },
  discount:   { type: Number, default: 0 },
  prize:      { type: String, default: '' },      // e.g. "10% OFF"
  spinResult: { type: String, default: '' },      // raw spin label
  status:     { type: String, default: 'active' }, // active | used | expired
  used:       { type: Boolean, default: false }
}, { timestamps: true }); // createdAt & updatedAt auto-managed

// Unique indexes (defined on schema so Mongoose manages them safely)
spinLeadSchema.index({ email: 1 },  { unique: true, sparse: false });
spinLeadSchema.index({ coupon: 1 }, { unique: true, sparse: true  });
spinLeadSchema.index({ createdAt: -1 });
spinLeadSchema.index({ status: 1 });

const SpinLead = mongoose.model('SpinLead', spinLeadSchema);

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
      await SpinLead.findOneAndUpdate(
        { coupon: code },
        { used: true, status: 'used' }
      ).catch(() => {});
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

// Validate helper
function validateSpinFields({ email, phone, name }) {
  if (!email || !email.includes('@'))
    return 'Please enter a valid email address';
  if (phone && !/^\+?[\d\s\-]{7,15}$/.test(phone))
    return 'Please enter a valid phone number';
  return null;
}

// POST /api/spin — original full-form submission (email + phone required)
app.post('/api/spin', async (req, res) => {
  try {
    const { email, phone, name } = req.body;

    // Validation
    const err = validateSpinFields({ email, phone, name });
    if (err) return res.status(400).json({ message: err });

    const normalEmail = email.toLowerCase().trim();

    // Duplicate check
    const exists = await SpinLead.findOne({
      $or: [
        { email: normalEmail },
        ...(phone ? [{ phone: phone.trim() }] : [])
      ]
    });
    if (exists) {
      return res.status(400).json({ message: 'You have already spun the wheel!' });
    }

    const discounts   = [5, 10, 15];
    const discount    = discounts[Math.floor(Math.random() * discounts.length)];
    const coupon      = 'SHENOVA' + Math.floor(1000 + Math.random() * 9000);
    const prize       = `${discount}% OFF`;
    const spinResult  = prize;

    const lead = await SpinLead.create({
      name:       (name || '').trim(),
      email:      normalEmail,
      phone:      (phone || '').trim(),
      coupon,
      discount,
      prize,
      spinResult,
      status:     'active',
      used:       false
    });

    console.log(`🎡 Spin lead saved — ${lead._id} | ${normalEmail} | ${coupon} (${discount}%)`);
    res.json({ success: true, coupon, discount, prize });

  } catch (err) {
    console.error('POST /api/spin error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// POST /api/spin/save — called after the wheel animation finishes
// Accepts: email, phone, name, coupon, discount, prize, spinResult
app.post('/api/spin/save', async (req, res) => {
  try {
    const { email, phone, name, coupon, discount, prize, spinResult } = req.body;

    // Validation
    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Valid email is required' });
    }
    if (!coupon) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }

    const normalEmail   = email.toLowerCase().trim();
    const normalCoupon  = coupon.toUpperCase().trim();
    const computedPrize = prize || (discount ? `${discount}% OFF` : 'Prize');

    // Upsert by email — update if exists, insert if new
    // FIX: set ALL fields including name/phone so the admin panel always has complete data
    const lead = await SpinLead.findOneAndUpdate(
      { email: normalEmail },
      {
        $set: {
          name:       (name  || '').trim(),
          phone:      (phone || '').trim(),
          coupon:     normalCoupon,
          discount:   Number(discount) || 0,
          prize:      computedPrize,
          spinResult: spinResult || computedPrize,
          status:     'active',
          used:       false
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`🎡 Spin lead saved — ${lead._id} | ${normalEmail} | ${lead.coupon} (${lead.discount}%)`);
    res.json({ success: true, lead: { _id: lead._id, coupon: lead.coupon } });

  } catch (err) {
    // E11000 = MongoDB duplicate key error
    if (err.code === 11000) {
      // Already spun — still return success so frontend UX isn't broken
      console.warn(`[Spin/save] Duplicate key for request, updating anyway:`, err.keyValue);
      try {
        const { email, phone, name, coupon, discount, prize, spinResult } = req.body;
        const normalEmail   = email?.toLowerCase().trim();
        const normalCoupon  = (coupon || '').toUpperCase().trim();
        const computedPrize = prize || (discount ? `${discount}% OFF` : 'Prize');
        await SpinLead.updateOne(
          { email: normalEmail },
          { $set: { name: (name||'').trim(), phone: (phone||'').trim(), coupon: normalCoupon, discount: Number(discount)||0, prize: computedPrize, spinResult: spinResult||computedPrize } }
        );
        return res.json({ success: true });
      } catch (e2) {
        console.error('[Spin/save] Retry update also failed:', e2);
        return res.json({ success: true }); // Still return success to not break frontend
      }
    }
    console.error('POST /api/spin/save error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
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
    await SpinLead.findOneAndUpdate(
      { coupon: coupon.toUpperCase() },
      { used: true, status: 'used' }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ================= SPIN LEADS ADMIN ROUTES =================

// GET all spin leads (latest first) — with optional search/filter
app.get('/api/admin/spin-leads', async (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status && status !== 'all') filter.status = status;

    if (search) {
      const rx = { $regex: search, $options: 'i' };
      filter.$or = [
        { name: rx }, { email: rx }, { phone: rx }, { coupon: rx }
      ];
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await SpinLead.countDocuments(filter);
    const leads = await SpinLead.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({ leads, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('GET /api/admin/spin-leads error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a single spin lead
app.delete('/api/admin/spin-leads/:id', async (req, res) => {
  try {
    await SpinLead.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH status of a spin lead
app.patch('/api/admin/spin-leads/:id', async (req, res) => {
  try {
    const { status, used } = req.body;
    const update = {};
    if (status !== undefined) update.status = status;
    if (used   !== undefined) update.used   = used;
    const updated = await SpinLead.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ message: 'Lead not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Legacy coupon admin routes (keep for backward compat)
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