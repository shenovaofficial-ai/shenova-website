// ═══════════════════════════════════════════════════
//  SHENOVA · Story Model
//  File: models/Story.js
// ═══════════════════════════════════════════════════

const mongoose = require('mongoose');

const StorySchema = new mongoose.Schema({

  // ── Media ────────────────────────────────────────
  type: {
    type: String,
    enum: ['image', 'video'],
    required: true,
  },

  mediaUrl: {
    type: String,
    required: true,
  },

  // Cloudinary public_id — needed for deletion
  cloudinaryId: {
    type: String,
    required: true,
  },

  // ── Content ──────────────────────────────────────
  caption: {
    type: String,
    default: '',
    maxlength: 220,
  },

  ctaText: {
    type: String,
    default: '',
    maxlength: 60,
  },

  ctaLink: {
    type: String,
    default: '',
  },

  // ── Order ────────────────────────────────────────
  order: {
    type: Number,
    default: 0,
  },

  // ── Expiry ───────────────────────────────────────
  // Auto-set to 24 hours from creation
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    index: { expireAfterSeconds: 0 },   // MongoDB TTL index
  },

  // ── Meta ─────────────────────────────────────────
  views: {
    type: Number,
    default: 0,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

});

// ── Virtual: seconds remaining ───────────────────
StorySchema.virtual('expiresInSeconds').get(function () {
  return Math.max(0, Math.floor((this.expiresAt - Date.now()) / 1000));
});

// ── Virtual: human-readable timer ───────────────
StorySchema.virtual('expiresInLabel').get(function () {
  const secs = this.expiresInSeconds;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m remaining`;
  return `${m}m remaining`;
});

StorySchema.set('toJSON', { virtuals: true });
StorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Story', StorySchema);