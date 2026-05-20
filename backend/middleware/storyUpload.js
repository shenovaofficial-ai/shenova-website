// ═══════════════════════════════════════════════════
//  SHENOVA · Story Upload Middleware
//  File: middleware/storyUpload.js
// ═══════════════════════════════════════════════════

const multer    = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// ── Cloudinary config ────────────────────────────
// Ensure these env vars are set in your .env / Render dashboard:
//   CLOUDINARY_CLOUD_NAME
//   CLOUDINARY_API_KEY
//   CLOUDINARY_API_SECRET

cloudinary.config({
  cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
  api_key    : process.env.CLOUDINARY_API_KEY,
  api_secret : process.env.CLOUDINARY_API_SECRET,
});

// ── Dynamic Cloudinary Storage ───────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {

    const isVideo = file.mimetype.startsWith('video/');

    return {
      folder        : 'shenova/stories',
      resource_type : isVideo ? 'video' : 'image',
      // Images: auto-optimize, convert to WebP, cap at 1200px wide
      // Videos: auto-optimize, keep quality high
      transformation: isVideo
        ? [{ quality: 'auto', fetch_format: 'mp4' }]
        : [{ width: 1200, crop: 'limit', quality: 'auto', fetch_format: 'webp' }],
      public_id: `story_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    };
  },
});

// ── File filter ──────────────────────────────────
function fileFilter (req, file, cb) {
  const allowed = [
    'image/jpeg', 'image/jpg', 'image/png',
    'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/mov',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images (JPG/PNG/WEBP/GIF) and videos (MP4/WEBM/MOV) are allowed.'));
  }
}

// ── Multer instance ──────────────────────────────
const storyUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize : 100 * 1024 * 1024, // 100 MB max per file
  },
});

module.exports = { storyUpload, cloudinary };
