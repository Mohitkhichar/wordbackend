const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const docxPdf = require('docx-pdf');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3001', // Allow React frontend running on localhost:3000
  methods: 'GET,POST',
}));
app.use(express.json());

// Configure Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// POST route to handle file upload, metadata extraction, and conversion
app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Extract metadata
  const metadata = {
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: `${(file.size / 1024).toFixed(2)} KB`,
    uploadPath: file.path,
    uploadDate: new Date().toISOString(),
  };

  console.log('File Metadata:', metadata);

  const outputPath = `uploads/${file.filename}.pdf`;

  // Convert Word to PDF
  docxPdf(file.path, outputPath, (err) => {
    if (err) {
      console.error('Error during conversion:', err);
      return res.status(500).json({ error: 'Conversion failed' });
    }

    // Use localhost for local testing
    const serverUrl = `http://localhost:${PORT}`;

    // Return metadata and absolute download URL
    res.json({
      message: 'File uploaded and converted successfully!',
      metadata,
      downloadUrl: `${serverUrl}/download/${file.filename}.pdf`, // Absolute URL
    });

    // Optional: Clean up temporary files after some delay
    setTimeout(() => {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }, 60000); // Files will be deleted after 1 minute
  });
});

// GET route to download the converted PDF
app.get('/download/:filename', (req, res) => {
  const filePath = `uploads/${req.params.filename}`;

  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filePath, (err) => {
    if (err) {
      console.error('Error downloading file:', err);
      res.status(500).json({ error: 'Error downloading file' });
    }
  });
});

// GET route for the root endpoint
app.get('/', (req, res) => {
  res.send('Server is running! Use POST /upload to upload files.');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
