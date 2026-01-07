/**
 * Input: none
 * Output: JSON with health status and blob config check
 * Pos: Vercel serverless function for health check
 * If this file is updated, you must update this header and the parent folder's README.md.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
  const tokenPrefix = hasBlobToken
    ? process.env.BLOB_READ_WRITE_TOKEN.substring(0, 10) + '...'
    : 'not set';

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      hasBlobToken,
      tokenPrefix,
      nodeEnv: process.env.NODE_ENV,
    }
  });
}
