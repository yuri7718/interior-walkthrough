/**
 * Input: onUploadComplete callback
 * Output: File upload UI component
 * Pos: Component for uploading GLB/GLTF/PLY files
 * If this file is updated, you must update this header and the parent folder's README.md.
 */

import React, { useState, useRef } from 'react';
import './FileUpload.css';

export function FileUpload({ onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const allowedTypes = ['.glb', '.gltf', '.ply'];

  const handleFileSelect = async (file) => {
    if (!file) return;

    const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (!ext || !allowedTypes.includes(ext)) {
      setError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      // Use PUT with streaming - simpler and avoids multipart parsing issues
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      const response = await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error('Invalid response from server'));
            }
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error || `Upload failed (${xhr.status})`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));

        // Use the streaming upload endpoint
        xhr.open('PUT', `/api/upload-url?filename=${encodeURIComponent(file.name)}`);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.setRequestHeader('x-vercel-filename', file.name);
        xhr.send(file);
      });

      if (response.success && onUploadComplete) {
        onUploadComplete(response.file);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    handleFileSelect(file);
    e.target.value = '';
  };

  return (
    <div className="file-upload-container">
      <div
        className={`file-upload-dropzone ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedTypes.join(',')}
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />

        {uploading ? (
          <div className="upload-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-text">{progress}%</span>
          </div>
        ) : (
          <>
            <div className="upload-icon">+</div>
            <div className="upload-text">
              Drop file here or click to upload
            </div>
            <div className="upload-hint">
              Supports: GLB, GLTF, PLY
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="upload-error">
          {error}
        </div>
      )}
    </div>
  );
}
