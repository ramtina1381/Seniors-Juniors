// Minimal API handler for debugging Vercel crashes
// Use this to test if the basic setup works

const express = require('express');
const cors = require('cors');

const app = express();

// Basic CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Simple health check
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'Backend is running on Vercel',
    environment: 'production',
    timestamp: new Date().toISOString(),
    uploadsDir: process.env.UPLOADS_DIR || '/tmp/uploads',
    outputDir: process.env.OUTPUT_DIR || '/tmp/output'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uploadsDir: process.env.UPLOADS_DIR,
    outputDir: process.env.OUTPUT_DIR,
    corsOrigin: process.env.CORS_ORIGIN
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'API is working',
    timestamp: new Date().toISOString()
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
