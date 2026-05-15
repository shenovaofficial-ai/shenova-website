// Shenova backend - FULL FIXED VERSION

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();

app.use(cors());
app.use(express.json());

// ================= FILE UPLOAD =================

const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({

  destination: (_, __, cb) => {
    cb(null, uploadDir);
  },

  filename: (_, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }

});

const upload = multer({ storage });

// ================= SLUG =================

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');

// ================= MODELS =================

const User = mongoose.model('User', new mongoose.Schema({

  name: String,

  email: {
    type: String,
    unique: true
  },

  password: String,

  role: {
    type: String,
    default: 'user'
  }

}, { timestamps: true }));


const Product = mongoose.model('Product', new mongoose.Schema({

  name: String,

  slug: {
    type: String,
    unique: true
  },

  description: String,

  price: Number,

  category: String,

  sizes: [String],

  images: [String],

  stock: {
    type: Number,
    default: 10
  }

}, { timestamps: true }));


const Order = mongoose.model('Order', new mongoose.Schema({

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  items: Array,

  total: Number,

  shipping: Object,

  status: {
    type: String,
    default: 'pending'
  }

}, { timestamps: true }));


const Message = mongoose.model('Message', new mongoose.Schema({

  name: String,

  email: String,

  message: String

}, { timestamps: true }));

// ================= AUTH =================

const auth = (req, res, next) => {

  const token =
    req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'No token'
    });
  }

  try {

    req.user = jwt.verify(
      token,
      process.env.JWT_SECRET || 'shenova_secret'
    );

    next();

  } catch {

    res.status(401).json({
      error: 'Invalid token'
    });

  }
};

// ================= AUTH ROUTES =================

// REGISTER
app.post('/api/auth/register', async (req, res) => {

  const { name, email, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  try {

    const user = await User.create({
      name,
      email,
      password: hash
    });

    res.json({
      id: user._id,
      email
    });

  } catch (e) {

    res.status(400).json({
      error: e.message
    });

  }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {

  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (
    !user ||
    !(await bcrypt.compare(password, user.password))
  ) {

    return res.status(401).json({
      error: 'Invalid credentials'
    });

  }

  const token = jwt.sign({

      id: user._id,
      role: user.role

    },

    process.env.JWT_SECRET || 'shenova_secret'
  );

  res.json({
    token,
    role: user.role,
    name: user.name
  });

});

// ================= PRODUCTS =================

// GET ALL PRODUCTS
app.get('/api/products', async (req, res) => {

  const products =
    await Product.find().sort('-createdAt');

  res.json(products);

});

// GET SINGLE PRODUCT
app.get('/api/products/:id', async (req, res) => {

  const product =
    await Product.findById(req.params.id);

  res.json(product);

});

// CREATE PRODUCT
app.post(
  '/api/products',
  upload.array('images', 5),

  async (req, res) => {

    try {

      const images =
        (req.files || []).map(
          f => `/uploads/${f.filename}`
        );

      const slug =
        slugify(req.body.name) +
        '-' +
        Date.now();

      const product = await Product.create({

        ...req.body,

        slug,

        sizes:
          (req.body.sizes || '').split(','),

        images

      });

      res.json(product);

    } catch (err) {

      console.log(err);

      res.status(500).json({
        error: 'Error creating product'
      });

    }

  }
);

// DELETE PRODUCT
app.delete('/api/products/:id', async (req, res) => {

  await Product.findByIdAndDelete(req.params.id);

  res.json({ ok: true });

});

// UPDATE PRODUCT
app.put(
  '/api/products/:id',
  upload.array('images', 5),

  async (req, res) => {

    try {

      const updateData = {

        ...req.body,

        sizes:
          (req.body.sizes || '').split(',')

      };

      // NEW IMAGES
      if (req.files?.length) {

        updateData.images =
          req.files.map(
            f => '/uploads/' + f.filename
          );

      }

      const updated =
        await Product.findByIdAndUpdate(

          req.params.id,

          updateData,

          { new: true }

        );

      res.json(updated);

    } catch (err) {

      console.log(err);

      res.status(500).json({
        error: 'Update failed'
      });

    }

  }
);

// ================= ORDERS =================

// CREATE ORDER
app.post('/api/orders', async (req, res) => {

  const order =
    await Order.create(req.body);

  res.json(order);

});

// GET ORDERS
app.get('/api/orders', async (req, res) => {

  const orders =
    await Order.find().sort('-createdAt');

  res.json(orders);

});

// UPDATE ORDER
app.put('/api/orders/:id', async (req, res) => {

  const updated =
    await Order.findByIdAndUpdate(

      req.params.id,
      req.body,
      { new: true }

    );

  res.json(updated);

});

// ================= CONTACT =================

// SEND MESSAGE
app.post('/api/contact', async (req, res) => {

  try {

    await Message.create(req.body);

    res.json({
      success: true
    });

  } catch (e) {

    res.status(500).json({
      error: e.message
    });

  }

});

// GET MESSAGES
app.get('/api/contact', async (req, res) => {

  const msgs =
    await Message.find()
      .sort({ createdAt: -1 });

  res.json(msgs);

});

// DELETE MESSAGE
app.delete('/api/contact/:id', async (req, res) => {

  await Message.findByIdAndDelete(req.params.id);

  res.json({ ok: true });

});

// ================= SERVER START =================

const PORT =
  process.env.PORT || 5000;

mongoose.connect(

  process.env.MONGO_URI ||
  'mongodb://127.0.0.1:27017/shenova'

)

.then(async () => {

  console.log('✅ MongoDB connected');

  const exists =
    await User.findOne({
      email: 'admin@shenova.com'
    });

  if (!exists) {

    await User.create({

      name: 'Admin',

      email: 'admin@shenova.com',

      password:
        await bcrypt.hash('admin123', 10),

      role: 'admin'

    });

    console.log('👤 Admin seeded');

  }

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

})

.catch(err => {

  console.error('❌ DB error:', err);

});
const spinRoutes = require('./routes/spin');
app.use('/api/spin', spinRoutes);

const couponRoutes =
require('./routes/coupon');
app.use('/api/coupon', couponRoutes);
app.use(
  '/api/newsletter',
  require('./routes/newsletter')
);