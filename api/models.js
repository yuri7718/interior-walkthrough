/**
 * Input: none
 * Output: JSON list of uploaded models
 * Pos: Vercel serverless function to list models from Blob storage
 * If this file is updated, you must update this header and the parent folder's README.md.
 */

import { list } from '@vercel/blob';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // List all blobs in the models folder
    const { blobs } = await list({ prefix: 'models/' });

    // Filter and map to model format
    const allowedExtensions = ['.glb', '.gltf', '.ply'];
    const models = blobs
      .filter(blob => {
        const ext = blob.pathname.toLowerCase().match(/\.[^.]+$/)?.[0];
        return ext && allowedExtensions.includes(ext);
      })
      .map(blob => {
        const filename = blob.pathname.replace('models/', '');
        const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
        const baseName = filename.replace(/\.[^.]+$/, '');

        return {
          id: baseName.replace(/[^a-zA-Z0-9]/g, '-'),
          name: baseName.replace(/[-_]/g, ' '),
          path: blob.url,
          type: ext.slice(1),
          description: `Uploaded model`,
          size: blob.size,
          uploadedAt: blob.uploadedAt,
        };
      });

    return res.status(200).json({ models });

  } catch (error) {
    console.error('List models error:', error);

    // If blob storage is not configured, return empty list
    if (error.message?.includes('BLOB_READ_WRITE_TOKEN')) {
      return res.status(200).json({
        models: [],
        warning: 'Blob storage not configured. Set BLOB_READ_WRITE_TOKEN environment variable.'
      });
    }

    return res.status(500).json({ error: error.message || 'Failed to list models' });
  }
}
