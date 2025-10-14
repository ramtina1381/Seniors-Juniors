// Vercel API route handler
// This file handles all API requests for Vercel deployment

const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const pathConfig = require('../server/vercel-env');

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

// Import routes
const uploadRoutes = require('../server/routes/upload');
const processRoutes = require('../server/routes/process');
const jhaProcessRoutes = require('../server/routes/jhaprocess');
const jhaUploadRoutes = require('../server/routes/jhaupload');

// Mount routes
app.use('/upload', uploadRoutes);
app.use('/process', processRoutes);
app.use('/jhaprocess', jhaProcessRoutes);
app.use('/upload/jha', jhaUploadRoutes);

// Health check
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'Backend is running on Vercel',
    environment: 'production',
    uploadsDir: pathConfig.getUploadsDir(),
    outputDir: pathConfig.getOutputDir()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uploadsDir: pathConfig.getUploadsDir(),
    outputDir: pathConfig.getOutputDir()
  });
});

// Export for Vercel
module.exports = app;
