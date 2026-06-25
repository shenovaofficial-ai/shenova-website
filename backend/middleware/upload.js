const multer = require("multer");
const imagekit = require("../config/imagekit");
const path = require("path");

const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "gif", "avif"];
const VIDEO_EXTS = ["mp4", "webm", "mov", "avi", "ogg"];
const ALL_EXTS = [...IMAGE_EXTS, ...VIDEO_EXTS];

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).replace(".", "").toLowerCase();

  if (ALL_EXTS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type: " + ext), false);
  }
}

const multerUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 150 * 1024 * 1024,
  },
});

async function uploadToCloudinary(buffer, originalname) {
  const ext = path.extname(originalname).replace(".", "").toLowerCase();
  const isVideo = VIDEO_EXTS.includes(ext);

  const folder = isVideo ? "shenova/videos" : "shenova/images";

  const result = await imagekit.upload({
    file: buffer.toString("base64"),
    fileName:
      Date.now() +
      "-" +
      originalname
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, ""),
    folder,
    useUniqueFileName: true,
  });

  return result.url;
}

module.exports = {
  multerUpload,
  uploadToCloudinary,
};