import React, { useState, useCallback } from "react";
import API from "./api"; // centralized Axios
import jsPDF from "jspdf";
import "jspdf-autotable";
import Plot from "react-plotly.js";
import { useDropzone } from "react-dropzone";
import {
  Container,
  Card,
  Form,
  Button,
  Spinner,
  Alert,
  OverlayTrigger,
  Tooltip as BootstrapTooltip,
  ListGroup,
  Row,
  Col,
  Accordion
} from "react-bootstrap";
import "./CustomerSegmentation.css";

const CustomerSegmentation = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [method, setMethod] = useState("kmeans");
  const [results, setResults] = useState([]);
  const [plotData, setPlotData] = useState(null);
  const [summaries, setSummaries] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    const selected = acceptedFiles[0];
    setFile(selected);
    setFileName(selected?.name || "");
    setError("");
    setResults([]);
    setPlotData(null);
    setSummaries({});
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ".csv",
  });

  const handleUpload = async () => {
    if (!file) {
      alert("📂 Please upload a CSV file before segmentation.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const res = await API.post(
        `/segmentation/segment-customers?method=${method}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setResults(res.data.data);
      setSummaries(res.data.summaries || {});
      setError("");

      // Prepare Plotly data
      const plotPoints = res.data.data.map((d) => ({
        x: d.Annual_Income,
        y: d.Spending_Score,
        cluster: d.Cluster,
      }));

      const clusters = [...new Set(plotPoints.map((p) => p.cluster))];
      const traces = clusters.map((c) => {
        const clusterPoints = plotPoints.filter((p) => p.cluster === c);
        return {
          x: clusterPoints.map((p) => p.x),
          y: clusterPoints.map((p) => p.y),
          mode: "markers",
          type: "scatter",
          name: `Cluster ${c}`,
          marker: { size: 10 },
        };
      });

      setPlotData(traces);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "❌ Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const generateFullAnalysis = () => {
    if (!results.length) return "No data to analyze.";
    const clusterGroups = {};
    results.forEach((r) => {
      if (!clusterGroups[r.Cluster]) clusterGroups[r.Cluster] = [];
      clusterGroups[r.Cluster].push(r);
    });

    let report = "📊 Customer Segmentation Analysis\n\n";
    Object.entries(clusterGroups).forEach(([cluster, data]) => {
      const avgIncome = Math.round(data.reduce((sum, d) => sum + d.Annual_Income, 0) / data.length);
      const avgScore = Math.round(data.reduce((sum, d) => sum + d.Spending_Score, 0) / data.length);
      report += `Cluster ${cluster}:\n- Total Customers: ${data.length}\n- Average Income: ₹${avgIncome}\n- Average Spending Score: ${avgScore}\n\n`;
    });
    report += "💡 Insights:\n- Target high-spending clusters for premium campaigns.\n- Engage low-spending clusters to improve loyalty.\n";
    return report;
  };

  const handleDownloadFullReport = async () => {
    if (!results.length) return;
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();

    pdf.setFontSize(16);
    pdf.text("👥 Customer Segmentation Full Report", 14, 20);
    pdf.setFontSize(12);
    pdf.text(`Method: ${method.toUpperCase()}`, 14, 30);
    pdf.text(`Total Customers: ${results.length}`, 14, 38);

    const fullAnalysis = generateFullAnalysis();
    const lines = pdf.splitTextToSize(fullAnalysis, pageWidth - 28);
    pdf.text(lines, 14, 50);

    pdf.autoTable({
      startY: 120,
      head: [["Age", "Income", "Score", "Cluster", "Label"]],
      body: results.slice(0, 10).map((r) => [
        r.Age,
        `₹${r.Annual_Income.toLocaleString()}`,
        r.Spending_Score,
        r.Cluster,
        r.Label,
      ]),
      margin: { left: 14, right: 14 },
      theme: "grid",
      styles: { fontSize: 9 },
    });

    pdf.save(`Customer_Segmentation_Report.pdf`);
  };

  return (
    <Container className="forecast-container">
      <Card className="forecast-card">
        <h2 className="forecast-title">👥 Customer Segmentation Dashboard</h2>
        <p className="forecast-subtitle">
          Upload your customer CSV data and segment them using KMeans or DBSCAN.
        </p>

        <Form className="mb-4">
          <Form.Group className="mb-3">
            <Form.Label>
              🧠 Choose Clustering Method{" "}
              <OverlayTrigger
                placement="right"
                overlay={<BootstrapTooltip>KMeans: structured clusters. DBSCAN: density-based & detects outliers.</BootstrapTooltip>}
              >
                <span style={{ cursor: "help", color: "#0d6efd" }}>ⓘ</span>
              </OverlayTrigger>
            </Form.Label>
            <Form.Select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="kmeans">KMeans</option>
              <option value="dbscan">DBSCAN</option>
            </Form.Select>
          </Form.Group>

          <div {...getRootProps()} className={`upload-box ${isDragActive ? "active" : ""}`}>
            <input {...getInputProps()} />
            <div className="upload-icon">⬆️</div>
            <h5>Upload CSV File</h5>
            <p>Drag & drop or click to browse</p>
            {fileName && <small className="text-muted">Selected File: {fileName}</small>}
            <small className="text-muted d-block mt-2">
              <OverlayTrigger placement="right" overlay={<BootstrapTooltip>CSV must include these columns</BootstrapTooltip>}>
                <span style={{ cursor: "help", color: "#0d6efd" }}>ⓘ</span>
              </OverlayTrigger>{" "}
              Supported Columns: <strong>Age, Annual_Income, Spending_Score</strong>
            </small>
          </div>

          <Button variant="dark" className="mt-3" onClick={handleUpload} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : "Upload & Segment"}
          </Button>
        </Form>

        {error && <Alert variant="danger">{error}</Alert>}
        {!results.length && !loading && (
          <Alert variant="info">ℹ️ Upload a CSV and choose a clustering method to start segmentation.</Alert>
        )}

        {results.length > 0 && (
          <>
            <Row className="mt-4">
              <Col md={6}>
                <Card className="p-3 forecast-data-card">
                  <h5>Segment Summaries</h5>
                  <ListGroup variant="flush">
                    {Object.entries(summaries).map(([label, summary], idx) => (
                      <ListGroup.Item key={idx}>
                        <strong>{label}:</strong> {summary}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Card>
              </Col>

              <Col md={6}>
                <Card className="p-3 forecast-data-card">
                  <h5>Interactive Cluster Visualization</h5>
                  {plotData && (
                    <Plot
                      data={plotData}
                      layout={{
                        title: "Customer Segmentation",
                        xaxis: { title: "Annual Income" },
                        yaxis: { title: "Spending Score" },
                        plot_bgcolor: "black",
                        paper_bgcolor: "black",
                        font: { color: "white" },
                        legend: { font: { color: "white" } },
                      }}
                      style={{ width: "100%", height: "350px" }}
                      config={{ responsive: true }}
                    />
                  )}
                </Card>
              </Col>
            </Row>

            <Accordion className="mt-4">
              {results.map((row, idx) => (
                <Accordion.Item eventKey={idx.toString()} key={idx}>
                  <Accordion.Header>Customer {idx + 1} - {row.Label}</Accordion.Header>
                  <Accordion.Body>
                    <p><strong>Age:</strong> {row.Age}</p>
                    <p><strong>Annual Income:</strong> ₹{row.Annual_Income.toLocaleString()}</p>
                    <p><strong>Spending Score:</strong> {row.Spending_Score}</p>
                    <p><strong>Cluster:</strong> {row.Cluster}</p>
                    <p><strong>Label:</strong> {row.Label}</p>
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>

            <Button variant="outline-primary" className="mt-4" onClick={handleDownloadFullReport}>
              📄 Download Full PDF Report
            </Button>
          </>
        )}
      </Card>
    </Container>
  );
};

export default CustomerSegmentation;
