import React, { useState } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

const JHAFileUpload = ({ onUploadComplete, location, setLocation }) => {
  const [pdfFiles, setPdfFiles] = useState([]);
  const [excelFile, setExcelFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({
    pdfs: 0,
    excel: 0
  });
  const [isUploading, setIsUploading] = useState(false);

  const handlePdfChange = (e) => {
    setPdfFiles(Array.from(e.target.files || []));
  };

  const handleExcelChange = (e) => {
    setExcelFile(e.target.files?.[0] || null);
  };

  const handleLocationChange = (e) => {
    setLocation(e.target.value);
  };

  const handleUpload = async () => {
    if (!location) {
      alert('Please enter a location number.');
      return;
    }

    if (!pdfFiles.length || !excelFile) {
      alert('Please upload both PDFs and an Excel file.');
      return;
    }

    setIsUploading(true);

    try {
      // Upload PDFs
      if (pdfFiles.length > 0) {
        const pdfFormData = new FormData();
        pdfFiles.forEach(file => {
          pdfFormData.append('pdfs', file);
        });

        await axios.post(
          `http://localhost:5002/api/upload/jha/${location}/pdfs`,
          pdfFormData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progress) => {
              setUploadProgress(prev => ({
                ...prev,
                pdfs: Math.round((progress.loaded * 100) / progress.total)
              }));
            }
          }
        );
      }

      // Upload Excel
      const excelFormData = new FormData();
      excelFormData.append('file', excelFile);

      await axios.post(
        `http://localhost:5002/api/upload/jha/${location}/excel`,
        excelFormData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progress) => {
            setUploadProgress(prev => ({
              ...prev,
              excel: Math.round((progress.loaded * 100) / progress.total)
            }));
          }
        }
      );

      onUploadComplete({ pdfs: pdfFiles, excel: excelFile }, location);
      alert('JHA PDF and Excel files uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress({ pdfs: 0, excel: 0 });
    }
  };

  return (
    <div className="file-upload-container">
      <div className="upload-section">
        <h3>Location Number</h3>
        <input
          type="text"
          value={location}
          onChange={handleLocationChange}
          placeholder="Enter location number"
        />
      </div>

      <div className="upload-section">
        <h3>Upload JHA PDF Documents</h3>
        <input
          type="file"
          multiple
          accept=".pdf"
          onChange={handlePdfChange}
        />
        <div className="file-count">
          {pdfFiles.length} PDF{pdfFiles.length !== 1 ? 's' : ''} selected
        </div>
        {uploadProgress.pdfs > 0 && (
          <progress value={uploadProgress.pdfs} max="100" />
        )}
      </div>

      <div className="upload-section">
        <h3>Upload Excel File</h3>
        <input
          type="file"
          accept=".xlsx,.xls, .xlsb"
          onChange={handleExcelChange}
        />
        <div className="file-name">
          {excelFile ? excelFile.name : 'No file selected'}
        </div>
        {uploadProgress.excel > 0 && (
          <progress value={uploadProgress.excel} max="100" />
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={isUploading || !pdfFiles.length || !excelFile || !location}
      >
        {isUploading ? 'Uploading...' : 'Upload JHA Files'}
      </button>
    </div>
  );
};

JHAFileUpload.propTypes = {
  onUploadComplete: PropTypes.func.isRequired,
  location: PropTypes.string,
  setLocation: PropTypes.func.isRequired
};

export default JHAFileUpload;
