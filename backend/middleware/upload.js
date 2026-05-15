const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, dir),
  filename: (_, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g,'_'))
});
module.exports = multer({ storage, limits: { fileSize: 10*1024*1024 } });
