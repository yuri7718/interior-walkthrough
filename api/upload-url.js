/**
 * Input: filename query parameter
 * Output: JSON with presigned upload URL
 * Pos: Vercel serverless function to generate client upload URL
 * If this file is updated, you must update this header and the parent folder's README.md.
 */

import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-vercel-filename');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed. Use PUT.' });
  }

  try {
    // Check if BLOB token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN is not configured');
      return res.status(500).json({ error: 'Server configuration error: Blob storage not configured' });
    }

    // Get filename from header or query
    const filename = req.headers['x-vercel-filename'] || req.query.filename;

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required. Pass via x-vercel-filename header or filename query param.' });
    }

    // Validate file type
    const allowedExtensions = ['.glb', '.gltf', '.ply'];
    const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (!ext || !allowedExtensions.includes(ext)) {
      return res.status(400).json({
        error: `Invalid file type. Allowed: ${allowedExtensions.join(', ')}`
      });
    }

    console.log('Uploading file via stream:', filename);

    // Stream the request body directly to blob storage
    const blob = await put(`models/${filename}`, req, {
      access: 'public',
    });

    console.log('Upload successful:', blob.url);

    // Return the uploaded file info
    return res.status(200).json({
      success: true,
      file: {
        id: filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]/g, '-'),
        name: filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        path: blob.url,
        type: ext.slice(1),
        description: `Uploaded ${new Date().toISOString()}`,
      }
    });

  } catch (error) {
    console.error('Upload error:', error.message, error.stack);
    return res.status(500).json({
      error: error.message || 'Upload failed',
    });
  }
}
