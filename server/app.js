const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();

app.use(cors({
  origin: '*', // For development only, tighten this for production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// app.options('*', cors()); // Handle preflight for all routes

app.use(fileUpload());
app.use(express.json());

// Routes
app.use('/api/upload', require('./routes/upload'));
app.use('/api/process', require('./routes/process'));

app.get('/', (req, res) => {
  res.status(200).json({ status: 'Backend is running' });
});

const PORT = 5002;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));