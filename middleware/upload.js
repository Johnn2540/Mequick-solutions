const multer = require('multer');

// Vercel's filesystem is read-only outside of /tmp, and /tmp itself is not
// guaranteed to persist between invocations — so files are never written to
// disk. Multer buffers each upload in memory; the buffer is then streamed
// straight to Cloudinary by services/upload.service.js.
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, WEBP, or AVIF images are allowed.'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per image
    files: 8, // cap gallery size per product
  },
});

module.exports = upload;
