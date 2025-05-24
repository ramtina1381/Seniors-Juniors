import React, { useState } from 'react';
import JHAFileUpload from '../components/JHAFileUpload';
import ProcessButton from '../components/ProcessButton';

const JHA = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [location, setLocation] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processMessage, setProcessMessage] = useState('');

  const handleUploadComplete = (files, uploadedLocation) => {
    const allUploaded = [
      ...(files.pdfs || []),
      ...(files.excel ? [files.excel] : [])
    ];
    setUploadedFiles([...uploadedFiles, ...allUploaded]);
    setLocation(uploadedLocation);
    alert('JHA PDF and Manufacturer Excel file uploaded successfully!');
  };

  const handleProcess = async () => {
    if (!location) {
      alert('Please enter a location before processing.');
      return;
    }

    setIsProcessing(true);
    setProcessMessage('');

    try {
      const response = await fetch(`http://localhost:5002/api/jhaprocess/${location}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location }),
      });

      if (!response.ok) {
        throw new Error('Server returned an error while processing.');
      }

      const data = await response.json();
      setProcessMessage(data.message || 'Processing completed successfully!');
    } catch (error) {
      setProcessMessage(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="jha-page-container">
      <h1>JHA Document Upload</h1>
      <p>Please upload the Job Hazard Analysis PDF files and the corresponding manufacturer Excel file.</p>

      <JHAFileUpload
        onUploadComplete={handleUploadComplete}
        location={location}
        setLocation={setLocation}
      />

      <ProcessButton 
        onClick={handleProcess} 
        disabled={!uploadedFiles.length || !location || isProcessing}
        loading={isProcessing}
      />

      {processMessage && (
        <div className="process-message">
          <p>{processMessage}</p>
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="uploaded-summary">
          <h3>Uploaded Files:</h3>
          <ul>
            {uploadedFiles.map((file, index) => (
              <li key={index}>{file.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default JHA;
