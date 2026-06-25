// ═══════════════════════════════════════════
// create-admin.js — Shenova Admin User Setup
// Run: node create-admin.js
// ═══════════════════════════════════════════

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ── Apni details yahan change karo ──
const ADMIN_NAME     = 'Admin';
const ADMIN_EMAIL    = 'admin@shenova.com';
const ADMIN_PASSWORD = 'Shenova@01';   // strong password rakh

const MONGO_URI = process.env.MONGO_URI || 'mongodb://shenova:shenova1234@ac-txmendc-shard-00-00.pwxmw8g.mongodb.net:27017,ac-txmendc-shard-00-01.pwxmw8g.mongodb.net:27017,ac-txmendc-shard-00-02.pwxmw8g.mongodb.net:27017/shenova?ssl=true&replicaSet=atlas-13u064-shard-0&authSource=admin&appName=Cluster0';

const UserSchema = new mongoose.Schema({
  name:     String,
  email:    { type: String, unique: true },
  password: String,
  role:     { type: String, default: 'user' }
}, { timestamps: true });

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');

  const User = mongoose.models.User || mongoose.model('User', UserSchema);

  // Pehle se exist karta hai toh update karo, nahi toh create karo
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const result = await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    { name: ADMIN_NAME, email: ADMIN_EMAIL, password: hash, role: 'admin' },
    { upsert: true, new: true }
  );

  console.log('✅ Admin user ready:', result.email, '| role:', result.role);
  console.log('');
  console.log('Login karo:');
  console.log('  Email   :', ADMIN_EMAIL);
  console.log('  Password:', ADMIN_PASSWORD);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});