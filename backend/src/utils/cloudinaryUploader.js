const cloudinary = require('../config/clodinary');

async function uploadToCloudinary(file, folder) {
  if (!file) return undefined;
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: folder }, (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      })
      .end(file.buffer);
  });
}

module.exports = { uploadToCloudinary };
