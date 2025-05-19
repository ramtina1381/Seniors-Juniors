import React, { useState } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

const FileUpload = ({ onUploadComplete, location: propLocation, setLocation }) => {
  const [photoFiles, setPhotoFiles] = useState([]);
  const [manufacturerFile, setManufacturerFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({ 
    photos: 0, 
    manufacturer: 0 
  });
  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoChange = (e) => {
    setPhotoFiles(Array.from(e.target.files || []));
  };

  const handleManufacturerChange = (e) => {
    setManufacturerFile(e.target.files?.[0] || null);
  };

  const handleLocationChange = (e) => {
    setLocation(e.target.value);
  };

  const handleUpload = async () => {
    if (!propLocation) {
      alert('Please enter a location number');
      return;
    }

    if (!photoFiles.length || !manufacturerFile) {
      alert('Please upload both photos and manufacturer file');
      return;
    }

    setIsUploading(true);

    try {
      // Upload photos to location-specific endpoint
      const photoFormData = new FormData();
      photoFiles.forEach(file => {
        photoFormData.append('photos', file);
      });

      await axios.post(
        `http://localhost:5002/api/upload/photos/${propLocation}`,
        photoFormData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: progress => {
            setUploadProgress(prev => ({
              ...prev,
              photos: Math.round((progress.loaded * 100) / progress.total)
            }));
          }
        }
      );

      // Upload manufacturer file to location-specific endpoint
      const manufacturerFormData = new FormData();
      manufacturerFormData.append('file', manufacturerFile);

      await axios.post(
        `http://localhost:5002/api/upload/manufacturer/${propLocation}`,
        manufacturerFormData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: progress => {
            setUploadProgress(prev => ({
              ...prev,
              manufacturer: Math.round((progress.loaded * 100) / progress.total)
            }));
          }
        }
      );

      // Notify parent component
      onUploadComplete([...photoFiles, manufacturerFile], propLocation);
    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress({ photos: 0, manufacturer: 0 });
    }
  };

  return (
    <div className="file-upload-container">
      <div className="upload-section">
        <h3>Location Number</h3>
        <input
          type="text"
          value={propLocation}
          onChange={handleLocationChange}
          placeholder="Enter location number"
        />
      </div>

      <div className="upload-section">
        <h3>Upload Equipment Photos</h3>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handlePhotoChange}
        />
        <div className="file-count">
          {photoFiles.length} photo{photoFiles.length !== 1 ? 's' : ''} selected
        </div>
        {uploadProgress.photos > 0 && (
          <progress value={uploadProgress.photos} max="100" />
        )}
      </div>

      <div className="upload-section">
        <h3>Upload Manufacturer File</h3>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleManufacturerChange}
        />
        <div className="file-name">
          {manufacturerFile ? manufacturerFile.name : 'No file selected'}
        </div>
        {uploadProgress.manufacturer > 0 && (
          <progress value={uploadProgress.manufacturer} max="100" />
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={isUploading || !photoFiles.length || !manufacturerFile || !propLocation}
      >
        {isUploading ? 'Uploading...' : 'Upload Files'}
      </button>
    </div>
  );
};

FileUpload.propTypes = {
  onUploadComplete: PropTypes.func.isRequired,
  location: PropTypes.string,
  setLocation: PropTypes.func.isRequired
};

export default FileUpload;