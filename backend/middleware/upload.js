const multer   = require('multer');
const cloudinary = require('cloudinary').v2;
const path     = require('path');
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
  api_key    : process.env.CLOUDINARY_API_KEY,
  api_secret : process.env.CLOUDINARY_API_SECRET,
});

const IMAGE_EXTS = ['jpg','jpeg','png','webp','gif','avif'];
const VIDEO_EXTS = ['mp4','webm','mov','avi','ogg'];
const ALL_EXTS   = [...IMAGE_EXTS, ...VIDEO_EXTS];

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).replace('.','').toLowerCase();
  if (ALL_EXTS.includes(ext)) cb(null, true);
  else cb(new Error('Unsupported file type: ' + ext), false);
}

// Store in memory, then upload to Cloudinary in the route
const multerUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 150 * 1024 * 1024 },
});

// Upload a single buffer to Cloudinary, returns the secure URL
function uploadToCloudinary(buffer, originalname) {
  return new Promise((resolve, reject) => {
    const ext     = path.extname(originalname).replace('.','').toLowerCase();
    const isVideo = VIDEO_EXTS.includes(ext);
    const folder  = isVideo ? 'shenova/videos' : 'shenova/images';

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type : isVideo ? 'video' : 'image',
        public_id     : Date.now() + '-' + originalname
                          .replace(/\s+/g,'_')
                          .replace(/[^a-zA-Z0-9._-]/g,'')
                          .replace(/\.[^/.]+$/,''),
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result.secure_url);
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
}

module.exports = { multerUpload, uploadToCloudinary };