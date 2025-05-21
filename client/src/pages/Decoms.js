import React, { useState } from 'react';
import FileUpload from '../components/FileUpload';
import ProcessButton from '../components/ProcessButton';
import '../styles/Decoms.css';

function Decoms() {
  const [files, setFiles] = useState([]);
  const [location, setLocation] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUploadComplete = (uploadedFiles, uploadedLocation) => {
    const filesArray = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
    setFiles(prev => [...prev, ...filesArray]);
    setLocation(uploadedLocation); // Save location from FileUpload
  };

const handleProcess = async () => {
  setIsProcessing(true);

  try {
    // Basic validation
    if (!files.length) throw new Error('No files uploaded');
    if (!location) throw new Error('Location is missing');

    // First verify backend is reachable
    // First verify backend is reachable
    try {
      const healthCheck = await fetch('http://localhost:5002', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
  if (!healthCheck.ok) {
    const healthText = await healthCheck.text();
    throw new Error(`Backend responded with: ${healthText}`);
  }
} catch (healthError) {
  throw new Error(`Cannot connect to backend: ${healthError.message}`);
}
    // Make the API call
    const response = await fetch('http://localhost:5002/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationNumber: location })
    });

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: await response.text() };
      }
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    // Handle successful response
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `equipment_report_${location}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();

  } catch (error) {
    console.error('Processing error:', {
      message: error.message,
      stack: error.stack,
      response: error.response
    });
    
    alert(`Error: ${error.message}\n\nPlease check:\n1. Backend server is running\n2. Correct files are uploaded\n3. Console for details`);
  } finally {
    setIsProcessing(false);
  }
};

  return (
    <div className="app-container">
      <h1>Equipment Processor</h1>
      <FileUpload onUploadComplete={handleUploadComplete} 
                  location={location}
                  setLocation={setLocation}/>
      <ProcessButton 
        onClick={handleProcess} 
        disabled={!files.length || !location || isProcessing}
        loading={isProcessing}
      />
    </div>
  );
}

export default Decoms;
