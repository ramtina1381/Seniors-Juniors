const router = require('express').Router();
const path = require('path');
const fs = require('fs');

// Base upload directory
const UPLOAD_BASE_DIR = path.join(__dirname, '../../uploads', 'jha');

// Ensure base directory exists
if (!fs.existsSync(UPLOAD_BASE_DIR)) {
  fs.mkdirSync(UPLOAD_BASE_DIR, { recursive: true });
}

// 📄 Upload JHA PDFs
router.post('/:location/pdfs', (req, res) => {
  const { location } = req.params;

  if (!location) return res.status(400).send('Location number is required in URL');
  if (!req.files || !req.files.pdfs) return res.status(400).send('No PDF files uploaded');

  const pdfs = Array.isArray(req.files.pdfs) ? req.files.pdfs : [req.files.pdfs];
  const pdfDir = path.join(UPLOAD_BASE_DIR, location, 'pdfs');

  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

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

  const excelDir = path.join(UPLOAD_BASE_DIR, location, 'excel');
  if (!fs.existsSync(excelDir)) fs.mkdirSync(excelDir, { recursive: true });

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
