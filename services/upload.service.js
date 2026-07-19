const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');

const FOLDER = 'mequick-solutions';

/**
 * Uploads an in-memory file buffer (from Multer's memoryStorage) to
 * Cloudinary via an upload stream — no temp file ever touches disk, which
 * is required on Vercel's read-only filesystem.
 * @param {Buffer} buffer
 * @param {{ folder?: string }} [options]
 * @returns {Promise<{ url: string, publicId: string }>}
 */
function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || FOLDER,
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
}

/**
 * Uploads multiple buffers in parallel.
 * @param {Express.Multer.File[]} files
 * @param {{ folder?: string }} [options]
 */
function uploadMany(files, options = {}) {
  return Promise.all(files.map((file) => uploadBuffer(file.buffer, options)));
}

/** Deletes a previously uploaded asset by its Cloudinary public_id. */
async function destroy(publicId) {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
}

module.exports = { uploadBuffer, uploadMany, destroy };
