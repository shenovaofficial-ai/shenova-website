const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const dir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

/* ── Allowed MIME types ─────────────────────────────────────────── */
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif'
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',   // .mov
  'video/x-msvideo',  // .avi
  'video/ogg'
];

const ALL_ALLOWED = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

/* ── Storage: preserve extension, sanitise filename ────────────── */
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, dir),
  filename: (_, file, cb) => {
    const safeName = file.originalname
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, Date.now() + '-' + safeName);
  }
});

/* ── File filter: reject anything not in the allowed list ───────── */
function fileFilter(_, file, cb) {
  if (ALL_ALLOWED.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type: ${file.mimetype}. ` +
        'Allowed: JPEG, PNG, WEBP, GIF, MP4, WEBM, MOV, AVI, OGG'
      ),
      false
    );
  }
}

/* ── Export configured multer instance ──────────────────────────── */
// images: max 10 MB each  |  videos: max 150 MB each
// We can't set per-field limits with multer easily, so we set the
// upper bound at 150 MB and rely on fileFilter for type safety.
module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 150 * 1024 * 1024 } // 150 MB
});
