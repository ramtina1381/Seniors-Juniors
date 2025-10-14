// const express = require('express');
// const fileUpload = require('express-fileupload');
// const cors = require('cors');
// const { exec } = require('child_process');
// const pathConfig = require('./config/paths');
// const envConfig = require('./config/environment');

// const app = express();

// // Use environment-based configuration
// app.use(cors(envConfig.get('cors')));
// app.use(fileUpload(envConfig.get('fileUpload')));
// app.use(express.json());

// // Routes
// app.use('/api/upload', require('./routes/upload'));
// app.use('/api/process', require('./routes/process'));
// app.use('/api/jhaprocess', require('./routes/jhaprocess'));
// app.use('/api/upload/jha', require('./routes/jhaupload'));



// app.get('/', (req, res) => {
//   res.status(200).json({ status: 'Backend is running' });
// });

// const PORT = envConfig.get('port');
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT} in ${envConfig.getEnvironment()} mode`);
//   console.log(`Uploads directory: ${pathConfig.getUploadsDir()}`);
//   console.log(`Output directory: ${pathConfig.getOutputDir()}`);
// });


// Vercel API route handler - Self-contained version
// This file handles all API requests for Vercel deployment

const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Vercel-specific configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(fileUpload({
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10
  },
  useTempFiles: true,
  tempFileDir: '/tmp'
}));

app.use(express.json());

// Vercel-specific path configuration
const getUploadsDir = () => process.env.UPLOADS_DIR || '/tmp/uploads';
const getOutputDir = () => process.env.OUTPUT_DIR || '/tmp/output';
const getPhotosDir = (location) => path.join(getUploadsDir(), 'photos', location);
const getManufacturerDir = (location) => path.join(getUploadsDir(), 'manufacturer', location);
const getJhaDir = (location) => path.join(getUploadsDir(), 'jha', location);
const getJhaPdfsDir = (location) => path.join(getUploadsDir(), 'jha', location, 'pdfs');
const getJhaExcelDir = (location) => path.join(getUploadsDir(), 'jha', location, 'excel');

// Ensure directories exist
const ensureLocationDirs = (location) => {
  const dirs = [
    getPhotosDir(location),
    getManufacturerDir(location),
    getJhaDir(location),
    getJhaPdfsDir(location),
    getJhaExcelDir(location)
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Health check
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'Backend is running on Vercel',
    environment: 'production',
    uploadsDir: getUploadsDir(),
    outputDir: getOutputDir()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uploadsDir: getUploadsDir(),
    outputDir: getOutputDir()
  });
});

// Photo upload endpoint
app.post('/upload/photos/:location', (req, res) => {
  const { location } = req.params;

  if (!location) {
    return res.status(400).send('Location number is required in URL');
  }

  if (!req.files) return res.status(400).send('No files uploaded');

  const photos = Array.isArray(req.files.photos) ? req.files.photos : [req.files.photos];

  // Create location-specific directory
  ensureLocationDirs(location);
  const locationDir = getPhotosDir(location);

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

// Manufacturer upload endpoint
app.post('/upload/manufacturer/:location', (req, res) => {
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
  ensureLocationDirs(location);
  const manufacturerDir = getManufacturerDir(location);

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

// Process endpoint (simplified for Vercel)
app.post('/process', (req, res) => {
  const { locationNumber } = req.body;
  
  if (!locationNumber) {
    return res.status(400).json({ error: 'Location number is required' });
  }

  // For now, return a simple response
  // TODO: Implement actual processing logic
  res.json({
    success: true,
    message: 'Processing endpoint reached',
    location: locationNumber,
    note: 'Processing logic needs to be implemented'
  });
});

// JHA process endpoint (simplified for Vercel)
app.post('/jhaprocess/:location', (req, res) => {
  const { location } = req.params;
  
  if (!location) {
    return res.status(400).json({ error: 'Location is required' });
  }

  // For now, return a simple response
  // TODO: Implement actual JHA processing logic
  res.json({
    success: true,
    message: 'JHA processing endpoint reached',
    location: location,
    note: 'JHA processing logic needs to be implemented'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

module.exports = app;
