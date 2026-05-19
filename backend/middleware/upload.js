const multer             = require('multer');
const cloudinary         = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path               = require('path');

/* ── Configure Cloudinary from environment variables ────────────── */
cloudinary.config({
  cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
  api_key    : process.env.CLOUDINARY_API_KEY,
  api_secret : process.env.CLOUDINARY_API_SECRET,
});

/* ── Allowed extensions ─────────────────────────────────────────── */
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
const VIDEO_EXTS = ['mp4', 'webm', 'mov', 'avi', 'ogg'];
const ALL_EXTS   = [...IMAGE_EXTS, ...VIDEO_EXTS];

/* ── Cloudinary storage — auto-detects image vs video by extension ─ */
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const ext        = path.extname(file.originalname).replace('.', '').toLowerCase();
    const isVideo    = VIDEO_EXTS.includes(ext);
    const folderName = isVideo ? 'shenova/videos' : 'shenova/images';

    return {
      folder        : folderName,
      resource_type : isVideo ? 'video' : 'image',
      public_id     : Date.now() + '-' + file.originalname
                        .replace(/\s+/g, '_')
                        .replace(/[^a-zA-Z0-9._-]/g, '')
                        .replace(/\.[^/.]+$/, ''),
      chunk_size    : isVideo ? 6_000_000 : undefined,
    };
  },
});

/* ── File filter ────────────────────────────────────────────────── */
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).replace('.', '').toLowerCase();

  const validMime = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/ogg',
    'application/octet-stream',
  ].includes(file.mimetype);

  if (ALL_EXTS.includes(ext) || validMime) {
    cb(null, true);
  } else {
    cb(new Error(
      `Unsupported file type: ${file.mimetype} (.${ext}). ` +
      'Allowed images: JPG, PNG, WEBP, GIF, AVIF. Videos: MP4, WEBM, MOV, AVI, OGG.'
    ), false);
  }
}

/* ── Export multer instance ─────────────────────────────────────── */
module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 150 * 1024 * 1024 },
});