import React, { useState } from 'react';
import axios from 'axios';
import { buildUrl } from '../config/api';

function Credit() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [downloadLink, setDownloadLink] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const res = await axios.post(buildUrl('/fill-pdf'), formData);
      setMessage(res.data.message);
      setDownloadLink(buildUrl('/filled_application.pdf'));
    } catch (err) {
      setMessage('Failed to process PDF.');
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Smart PDF Filler</h2>
      <form onSubmit={handleSubmit}>
        <input type="file" accept="application/pdf" onChange={handleFileChange} />
        <button type="submit">Fill PDF</button>
      </form>
      {message && <p>{message}</p>}
      {downloadLink && (
        <a href={downloadLink} target="_blank" rel="noreferrer">Download Filled PDF</a>
      )}
    </div>
  );
}

export default Credit;
