/**
 * Input: models list, onSelect callback, onUploadComplete callback, auth state
 * Output: Dropdown UI for model selection with upload/delete support
 * Pos: Model selection component displayed at startup
 * If this file is updated, you must update this header and the parent folder's README.md.
 */

import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { LoginModal } from './LoginModal';

const API_BASE = process.env.REACT_APP_API_URL || '';

export function ModelSelector({ models, loading, error, onSelect, selectedModel, onUploadComplete, onModelDelete }) {
  const [isOpen, setIsOpen] = useState(!selectedModel);
  const [authToken, setAuthToken] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const handleLogin = (token) => {
    setAuthToken(token);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setAuthToken(null);
  };

  const handleDelete = async (model, e) => {
    e.stopPropagation();
    if (!authToken) return;

    const filename = model.path.split('/').pop();
    if (!window.confirm(`Delete "${model.name}"?`)) return;

    setDeleting(model.id);
    try {
      const response = await fetch(`${API_BASE}/api/models/${filename}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (response.ok) {
        onModelDelete?.(model);
      } else {
        const data = await response.json();
        alert(data.error || 'Delete failed');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setDeleting(null);
    }
  };

  const handleSelect = (model) => {
    onSelect(model);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className="model-selector-overlay">
        <div className="model-selector-modal">
          <h2>Loading Models...</h2>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="model-selector-overlay">
        <div className="model-selector-modal error">
          <h2>Error Loading Models</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  // Helper to get icon for model type
  const getModelIcon = (model) => {
    if (model.type === 'ply') return '☁️';
    if (model.type === 'glb') return '📦';
    return '🏛️';
  };

  // Only show overlay if no model selected
  if (!selectedModel && isOpen) {
    return (
      <div className="model-selector-overlay">
        <div className="model-selector-modal">
          <div className="modal-header">
            <h2>Select a Model</h2>
            {authToken ? (
              <button className="auth-button logout" onClick={handleLogout}>Logout</button>
            ) : (
              <button className="auth-button login" onClick={() => setShowLoginModal(true)}>Admin Login</button>
            )}
          </div>
          <p className="subtitle">Choose a 3D model{authToken && ' or upload your own'}</p>

          {/* File Upload - only shown when logged in */}
          {authToken && <FileUpload onUploadComplete={onUploadComplete} authToken={authToken} />}

          <LoginModal
            isOpen={showLoginModal}
            onLogin={handleLogin}
            onClose={() => setShowLoginModal(false)}
          />

          <div className="divider">
            <span>or select existing</span>
          </div>

          <div className="model-list">
            {models.map((model) => (
              <div key={model.id} className="model-item-wrapper">
                <button
                  className="model-item"
                  onClick={() => handleSelect(model)}
                  disabled={deleting === model.id}
                >
                  <div className="model-icon">
                    {getModelIcon(model)}
                  </div>
                  <div className="model-info">
                    <span className="model-name">{model.name}</span>
                    <span className="model-type">
                      {model.type.toUpperCase()}
                      {model.source === 'uploaded' && ' · Uploaded'}
                    </span>
                    {model.description && (
                      <span className="model-description">{model.description}</span>
                    )}
                  </div>
                </button>
                {authToken && model.source === 'uploaded' && (
                  <button
                    className="delete-button"
                    onClick={(e) => handleDelete(model, e)}
                    disabled={deleting === model.id}
                    title="Delete model"
                  >
                    {deleting === model.id ? '...' : '×'}
                  </button>
                )}
              </div>
            ))}
          </div>

          {models.length === 0 && (
            <p className="no-models">No models available. Upload a file to get started.</p>
          )}
        </div>
      </div>
    );
  }

  // Compact dropdown when model is selected
  return (
    <div className="model-selector-compact">
      <button
        className="model-selector-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="current-model">{selectedModel?.name || 'Select Model'}</span>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="model-dropdown">
          {models.map((model) => (
            <button
              key={model.id}
              className={`dropdown-item ${selectedModel?.id === model.id ? 'active' : ''}`}
              onClick={() => handleSelect(model)}
            >
              <span className="model-icon-small">
                {getModelIcon(model)}
              </span>
              <span>{model.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ModelSelector;
