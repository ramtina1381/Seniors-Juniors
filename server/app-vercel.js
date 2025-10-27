const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const { exec } = require('child_process');
const pathConfig = require('./vercel-env'); // Use Vercel-specific config
const envConfig = require('./config/environment');

const app = express();

// Vercel-specific configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://seniors-juniors-client.vercel.app',
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

// Routes
app.use('/api/upload', require('./routes/upload'));
app.use('/api/process', require('./routes/process'));
app.use('/api/jhaprocess', require('./routes/jhaprocess'));
app.use('/api/upload/jha', require('./routes/jhaupload'));

app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'Backend is running on Vercel',
    environment: 'production',
    uploadsDir: pathConfig.getUploadsDir(),
    outputDir: pathConfig.getOutputDir()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uploadsDir: pathConfig.getUploadsDir(),
    outputDir: pathConfig.getOutputDir()
  });
});

// Vercel serverless function handler
module.exports = app;
