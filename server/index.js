/**
 * Input: HTTP requests
 * Output: REST API for file upload and model listing
 * Pos: Express server for local deployment
 * If this file is updated, you must update this header and the parent folder's README.md.
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Admin password for protected operations
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Enable CORS for development
app.use(cors());
app.use(express.json());

// Auth middleware for protected routes
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Login endpoint
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: ADMIN_PASSWORD });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '../public/models/uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Keep original filename but make it safe
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safeName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.glb', '.gltf', '.ply'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max
  },
});

// Upload endpoint (protected)
app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext);

    const fileInfo = {
      id: baseName.replace(/[^a-zA-Z0-9]/g, '-'),
      name: baseName.replace(/[-_]/g, ' '),
      path: `/models/uploads/${file.filename}`,
      type: ext.slice(1),
      description: `Uploaded ${new Date().toISOString()}`,
      size: file.size,
      source: 'uploaded',
    };

    console.log('File uploaded:', fileInfo);

    res.json({ success: true, file: fileInfo });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List uploaded models
app.get('/api/models', (req, res) => {
  try {
    const files = fs.readdirSync(UPLOADS_DIR);
    const allowedExtensions = ['.glb', '.gltf', '.ply'];

    const models = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return allowedExtensions.includes(ext);
      })
      .map((file) => {
        const ext = path.extname(file).toLowerCase();
        const baseName = path.basename(file, ext);
        const stats = fs.statSync(path.join(UPLOADS_DIR, file));

        return {
          id: baseName.replace(/[^a-zA-Z0-9]/g, '-'),
          name: baseName.replace(/[-_]/g, ' '),
          path: `/models/uploads/${file}`,
          type: ext.slice(1),
          description: 'Uploaded model',
          size: stats.size,
          source: 'uploaded',
        };
      });

    res.json({ models });
  } catch (error) {
    console.error('List models error:', error);
    res.status(500).json({ error: error.message, models: [] });
  }
});

// Delete model endpoint (protected)
app.delete('/api/models/:filename', requireAuth, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(UPLOADS_DIR, filename);

    // Security: ensure the file is within UPLOADS_DIR
    if (!filePath.startsWith(UPLOADS_DIR)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'File deleted' });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 500MB.' });
    }
  }
  console.error('Server error:', error);
  res.status(500).json({ error: error.message });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Uploads directory: ${UPLOADS_DIR}`);
});
