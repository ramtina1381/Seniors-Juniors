import React, { useState } from "react";
import axios from "axios";

export default function UploadPage() {
  const [files, setFiles] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    const formData = new FormData();
    for (let file of files) formData.append("images", file);

    setLoading(true);
    try {
      const response = await axios.post("http://localhost:5000/upload", formData, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "extracted_data.csv");
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Upload Decom Images</h2>
      <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
      <br />
      <button onClick={handleUpload} disabled={loading || !files}>
        {loading ? "Processing..." : "Upload & Extract"}
      </button>
    </div>
  );
}
