import React, { useState, useCallback } from "react";
import { Card, Container, Form, Button, Spinner, Alert } from "react-bootstrap";
import axios from "axios";
import { useDropzone } from "react-dropzone";

// Auto-switch: Localhost for dev, Render for production
const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://smartbiziq-backend-clean-1.onrender.com"
    : process.env.REACT_APP_BACKEND_URL;

const AIChatbot = () => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");

  // File Drop Handler
  const onDrop = useCallback((acceptedFiles, fileRejections) => {
    if (fileRejections.length > 0) {
      setUploadMsg("❌ Invalid file type or size. Please upload a CSV under 5MB.");
      setFile(null);
      setFileName("");
      return;
    }
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setUploadMsg("");
  }, []);

  // Dropzone Setup
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxSize: 5 * 1024 * 1024, // 5 MB
    multiple: false,
  });

  // Upload CSV Handler
  const handleUpload = async () => {
    if (!file) {
      alert("📂 Please select a CSV file first!");
      return;
    }

    setUploading(true);
    setUploadMsg("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`${BASE_URL}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadMsg(`✅ ${res.data.message} (${res.data.rows} rows)`);
    } catch (err) {
      console.error(err);
      setUploadMsg("❌ CSV upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // Ask AI Handler (now sends FormData)
  const handleAsk = async () => {
    if (!question) return;
    setLoading(true);
    setAnswer("");
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("user_query", question);

      const res = await axios.post(`${BASE_URL}/chat`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setAnswer(res.data.answer || "🤖 No response from AI.");
    } catch (err) {
      console.error(err);
      setErrorMsg("❌ Could not fetch AI response.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container style={{ padding: "2rem", minHeight: "100vh", backgroundColor: "rgb(89, 89, 84)" }}>
      <Card style={{ padding: "2rem", borderRadius: "10px", backgroundColor: "rgba(46, 46, 35, 0.902)", color: "#000", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <h2 style={{ marginBottom: "1.5rem" }}>🤖 CSV-aware Business Chatbot</h2>

        {/* CSV Upload Section */}
        <div {...getRootProps()} className={`upload-box ${isDragActive ? "active" : ""}`}>
          <input {...getInputProps()} />
          <div className="upload-icon">⬆️</div>
          <h5>Upload CSV File</h5>
          <p>Drag & drop or click to browse</p>
          {fileName && <small className="text-muted">Selected File: {fileName}</small>}
        </div>
        <Button variant="success" className="mt-3" onClick={handleUpload} disabled={!file || uploading}>
          {uploading ? <Spinner animation="border" size="sm" /> : "Upload CSV"}
        </Button>
        {uploadMsg && <Alert variant={uploadMsg.startsWith("❌") ? "danger" : "success"} className="mt-2">{uploadMsg}</Alert>}

        {/* Ask AI Section */}
        <Form.Group className="mt-4 mb-3">
          <Form.Label>Ask a question:</Form.Label>
          <Form.Control
            type="text"
            placeholder='e.g. "Total sales in 2025?"'
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </Form.Group>
        <Button onClick={handleAsk} disabled={loading} variant="primary">
          {loading ? <Spinner animation="border" size="sm" /> : "Ask AI"}
        </Button>

        {errorMsg && <Alert variant="danger" className="mt-3">{errorMsg}</Alert>}

        {answer && (
          <Card style={{ marginTop: "1.5rem", padding: "1rem", backgroundColor: "#424b53ff", color: "#000" }}>
            <h5>💡 AI Response:</h5>
            <p>{answer}</p>
          </Card>
        )}
      </Card>
    </Container>
  );
};

export default AIChatbot;
