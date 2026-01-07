/**
 * Input: multipart form data with file
 * Output: JSON with uploaded file info
 * Pos: Vercel serverless function for file upload
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if BLOB token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN is not configured');
      return res.status(500).json({ error: 'Server configuration error: Blob storage not configured' });
    }

    const contentType = req.headers['content-type'] || '';

    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Content-Type must be multipart/form-data' });
    }

    // Parse multipart form data
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Extract boundary from content-type
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return res.status(400).json({ error: 'No boundary found in content-type' });
    }

    // Parse the multipart data
    const parts = parseMultipart(buffer, boundary);
    const filePart = parts.find(p => p.filename);

    if (!filePart) {
      return res.status(400).json({ error: 'No file found in request' });
    }

    // Validate file type
    const allowedExtensions = ['.glb', '.gltf', '.ply'];
    const ext = filePart.filename.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (!ext || !allowedExtensions.includes(ext)) {
      return res.status(400).json({
        error: `Invalid file type. Allowed: ${allowedExtensions.join(', ')}`
      });
    }

    console.log('Uploading file:', filePart.filename, 'Size:', filePart.data.length);

    // Upload to Vercel Blob
    const blob = await put(`models/${filePart.filename}`, filePart.data, {
      access: 'public',
    });

    console.log('Upload successful:', blob.url);

    // Return the uploaded file info
    return res.status(200).json({
      success: true,
      file: {
        id: filePart.filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]/g, '-'),
        name: filePart.filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        path: blob.url,
        type: ext.slice(1),
        description: `Uploaded ${new Date().toISOString()}`,
        size: filePart.data.length,
      }
    });

  } catch (error) {
    console.error('Upload error:', error.message, error.stack);
    return res.status(500).json({
      error: error.message || 'Upload failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

function parseMultipart(buffer, boundary) {
  const parts = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const endBoundaryBuffer = Buffer.from(`--${boundary}--`);

  let start = buffer.indexOf(boundaryBuffer) + boundaryBuffer.length;

  while (start < buffer.length) {
    // Skip CRLF after boundary
    if (buffer[start] === 0x0d && buffer[start + 1] === 0x0a) {
      start += 2;
    }

    // Find end of headers (double CRLF)
    const headerEnd = buffer.indexOf('\r\n\r\n', start);
    if (headerEnd === -1) break;

    const headers = buffer.slice(start, headerEnd).toString();
    const dataStart = headerEnd + 4;

    // Find next boundary
    let dataEnd = buffer.indexOf(boundaryBuffer, dataStart);
    if (dataEnd === -1) {
      dataEnd = buffer.indexOf(endBoundaryBuffer, dataStart);
      if (dataEnd === -1) break;
    }

    // Remove trailing CRLF before boundary
    if (buffer[dataEnd - 2] === 0x0d && buffer[dataEnd - 1] === 0x0a) {
      dataEnd -= 2;
    }

    const data = buffer.slice(dataStart, dataEnd);

    // Parse headers
    const contentDisposition = headers.match(/Content-Disposition:([^\r\n]+)/i)?.[1] || '';
    const filename = contentDisposition.match(/filename="([^"]+)"/)?.[1];
    const name = contentDisposition.match(/name="([^"]+)"/)?.[1];

    parts.push({ name, filename, data, headers });

    // Move to next part
    start = buffer.indexOf(boundaryBuffer, dataEnd);
    if (start === -1 || buffer.indexOf(endBoundaryBuffer, dataEnd) === dataEnd) break;
    start += boundaryBuffer.length;
  }

  return parts;
}
