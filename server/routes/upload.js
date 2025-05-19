const router = require('express').Router();
const path = require('path');
const fs = require('fs');

// Base upload directories
const UPLOAD_BASE_DIR = path.join(__dirname, '../../uploads');

// Ensure base directory exists
if (!fs.existsSync(UPLOAD_BASE_DIR)) {
  fs.mkdirSync(UPLOAD_BASE_DIR, { recursive: true });
}

// ✅ Modified Photo Upload Route - now uses URL parameter for location
router.post('/photos/:location', (req, res) => {
  const { location } = req.params;

  if (!location) {
    return res.status(400).send('Location number is required in URL');
  }

  if (!req.files) return res.status(400).send('No files uploaded');

  const photos = Array.isArray(req.files.photos) ? req.files.photos : [req.files.photos];

  // Create location-specific directory
  const locationDir = path.join(UPLOAD_BASE_DIR, 'photos', location);
  if (!fs.existsSync(locationDir)) fs.mkdirSync(locationDir, { recursive: true });

  const uploaded = [];
  const skipped = [];

  const uploadPromises = photos.map(photo => {
    return new Promise((resolve, reject) => {
      const targetPath = path.join(locationDir, photo.name);

      // Skip if file already exists
      if (fs.existsSync(targetPath)) {
        console.log(`Skipping existing photo: ${photo.name}`);
        skipped.push(photo.name);
        return resolve(null);
      }

      // Save photo
      photo.mv(targetPath, err => {
        if (err) return reject(err);
        uploaded.push(photo.name);
        resolve(photo.name);
      });
    });
  });

  Promise.all(uploadPromises)
    .then(() => {
      res.json({
        success: true,
        message: 'Photo upload complete',
        uploaded,
        skipped,
        location
      });
    })
    .catch(err => res.status(500).send(err.message));
});

// ✅ Modified Manufacturer Upload Route - now uses URL parameter for location
router.post('/manufacturer/:location', (req, res) => {
  const { location } = req.params;

  if (!location) {
    return res.status(400).send('Location number is required in URL');
  }

  if (!req.files || !req.files.file) {
    return res.status(400).send('No file uploaded');
  }

  const file = req.files.file;
  const ext = path.extname(file.name);
  if (!['.xlsx', '.xls'].includes(ext.toLowerCase())) {
    return res.status(400).send('Only Excel files are allowed');
  }

  // Create location-specific manufacturer directory
  const manufacturerDir = path.join(UPLOAD_BASE_DIR, 'manufacturer', location);
  if (!fs.existsSync(manufacturerDir)) fs.mkdirSync(manufacturerDir, { recursive: true });

  // Save with location-specific filename
  const filename = `manufacturer_file_${location}${ext}`;
  const uploadPath = path.join(manufacturerDir, filename);

  file.mv(uploadPath, err => {
    if (err) return res.status(500).send(err.message);
    res.json({ 
      success: true, 
      filename,
      location 
    });
  });
});

module.exports = router;