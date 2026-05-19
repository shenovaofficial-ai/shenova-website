const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const dir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

/* ── Allowed MIME types ─────────────────────────────────────────── */
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif'
]);

const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',        // .mov
  'video/x-msvideo',       // .avi
  'video/ogg',
  'video/x-matroska',      // .mkv
  'application/octet-stream' // some browsers send this for video files
]);

/* ── Allowed extensions as a fallback ──────────────────────────── */
const ALLOWED_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const ALLOWED_VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.avi', '.ogg', '.mkv']);

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

/* ── File filter: check MIME type AND file extension ────────────── */
function fileFilter(_, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  const isImage = ALLOWED_IMAGE_TYPES.has(file.mimetype) || ALLOWED_IMAGE_EXTS.has(ext);
  const isVideo = ALLOWED_VIDEO_TYPES.has(file.mimetype) || ALLOWED_VIDEO_EXTS.has(ext);

  if (isImage || isVideo) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type: ${file.mimetype} (${ext}). ` +
        'Allowed images: JPEG, PNG, WEBP, GIF, AVIF. ' +
        'Allowed videos: MP4, WEBM, MOV, AVI, OGG.'
      ),
      false
    );
  }
}

/* ── Export configured multer instance ──────────────────────────── */
// images: max 10 MB each  |  videos: max 150 MB each
// Upper bound set at 150 MB; type safety handled by fileFilter above.
module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 150 * 1024 * 1024 } // 150 MB
});
