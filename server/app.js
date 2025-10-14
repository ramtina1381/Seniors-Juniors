const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const { exec } = require('child_process');
const pathConfig = require('./config/paths');
const envConfig = require('./config/environment');

const app = express();

// Use environment-based configuration
app.use(cors(envConfig.get('cors')));
app.use(fileUpload(envConfig.get('fileUpload')));
app.use(express.json());

// Routes
app.use('/api/upload', require('./routes/upload'));
app.use('/api/process', require('./routes/process'));
app.use('/api/jhaprocess', require('./routes/jhaprocess'));
app.use('/api/upload/jha', require('./routes/jhaupload'));



app.get('/', (req, res) => {
  res.status(200).json({ status: 'Backend is running' });
});

const PORT = envConfig.get('port');
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${envConfig.getEnvironment()} mode`);
  console.log(`Uploads directory: ${pathConfig.getUploadsDir()}`);
  console.log(`Output directory: ${pathConfig.getOutputDir()}`);
});