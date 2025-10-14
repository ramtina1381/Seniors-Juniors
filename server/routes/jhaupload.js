const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const pathConfig = require('../config/paths');

// 📄 Upload JHA PDFs
router.post('/:location/pdfs', (req, res) => {
  const { location } = req.params;

  if (!location) return res.status(400).send('Location number is required in URL');
  if (!req.files || !req.files.pdfs) return res.status(400).send('No PDF files uploaded');

  const pdfs = Array.isArray(req.files.pdfs) ? req.files.pdfs : [req.files.pdfs];
  
  // Ensure JHA directories exist using pathConfig
  pathConfig.ensureLocationDirs(location);
  const pdfDir = pathConfig.getJhaPdfsDir(location);

  const uploaded = [];
  const skipped = [];

  const uploadPromises = pdfs.map(pdf => {
    return new Promise((resolve, reject) => {
      const targetPath = path.join(pdfDir, pdf.name);

      if (fs.existsSync(targetPath)) {
        skipped.push(pdf.name);
        return resolve();
      }

      pdf.mv(targetPath, err => {
        if (err) return reject(err);
        uploaded.push(pdf.name);
        resolve();
      });
    });
  });

  Promise.all(uploadPromises)
    .then(() => {
      res.json({
        success: true,
        message: 'JHA PDFs uploaded successfully',
        uploaded,
        skipped,
        location
      });
    })
    .catch(err => res.status(500).send(err.message));
});

// 📊 Upload JHA Excel
router.post('/:location/excel', (req, res) => {
  const { location } = req.params;

  if (!location) return res.status(400).send('Location number is required in URL');
  if (!req.files || !req.files.file) return res.status(400).send('No Excel file uploaded');

  const file = req.files.file;
  const ext = path.extname(file.name).toLowerCase();

  if (!['.xlsx', '.xls', '.xlsb'].includes(ext)) {
    return res.status(400).send('Only Excel files are allowed');
  }

  // Ensure JHA directories exist using pathConfig
  pathConfig.ensureLocationDirs(location);
  const excelDir = pathConfig.getJhaExcelDir(location);

  const filename = `jha_excel_${location}${ext}`;
  const targetPath = path.join(excelDir, filename);

  file.mv(targetPath, err => {
    if (err) return res.status(500).send(err.message);

    res.json({
      success: true,
      message: 'JHA Excel uploaded successfully',
      filename,
      location
    });
  });
});

module.exports = router;
