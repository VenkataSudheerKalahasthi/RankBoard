const cloudinary = require('cloudinary').v2;
const { config } = require('../config/env');

// Configure Cloudinary SDK
const isConfigured = Boolean(
  config.CLOUDINARY_CLOUD_NAME &&
  config.CLOUDINARY_API_KEY &&
  config.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log('✅ Cloudinary Image Service initialized successfully.');
} else {
  console.log('ℹ️ Cloudinary credentials not detected in .env. Falling back to secure inline/storage upload.');
}

/**
 * Upload a profile image to Cloudinary CDN
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} mimetype - MIME type (e.g. image/jpeg, image/png)
 * @param {string} studentId - Student unique identifier
 * @returns {Promise<{ url: string, publicId: string | null }>}
 */
const uploadProfileImage = async (fileBuffer, mimetype = 'image/jpeg', studentId = 'user') => {
  if (isConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'rankboard/profiles',
          public_id: `student_${studentId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}`,
          overwrite: true,
          resource_type: 'image',
          transformation: [
            { width: 500, height: 500, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            console.error('[Cloudinary Upload Error]:', error);
            return reject(new Error(error.message || 'Failed to upload image to Cloudinary'));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            bytes: result.bytes,
          });
        }
      );

      uploadStream.end(fileBuffer);
    });
  }

  // Graceful fallback for local development without Cloudinary credentials:
  // Converts to base64 Data URI so uploading always works seamlessly in development.
  const base64Data = fileBuffer.toString('base64');
  const dataUrl = `data:${mimetype};base64,${base64Data}`;
  return {
    url: dataUrl,
    publicId: null,
    isFallback: true,
  };
};

module.exports = {
  isConfigured,
  uploadProfileImage,
};
