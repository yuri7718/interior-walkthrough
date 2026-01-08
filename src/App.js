/**
 * Input: None (root component)
 * Output: Main application with deck.gl viewer, model selector, and controls
 * Pos: Root application component orchestrating all features
 * If this file is updated, you must update this header and the parent folder's README.md.
 */

import React, { useState, useCallback, useMemo } from 'react';
import './App.css';

import { DeckGLViewer, VIEW_MODES } from './components/DeckGLViewer';
import { ModelSelector } from './components/ModelSelector';
import { ControlPanel } from './components/ControlPanel';
import { useModelLoader, useModelManifest } from './hooks/useModelLoader';
import { usePointCloudExtractor, COLOR_MODES, calculateBounds } from './hooks/usePointCloudExtractor';

function App() {
  // Model manifest and selection
  const { models, loading: manifestLoading, error: manifestError, addModel, removeModel } = useModelManifest();
  const [selectedModel, setSelectedModel] = useState(null);

  // Model loading
  const { modelData, loading: modelLoading, error: modelError, progress, loadModel } = useModelLoader();

  // View and render controls - default to point cloud
  const [viewMode, setViewMode] = useState(VIEW_MODES.POINTCLOUD);
  const [controls, setControls] = useState({
    pointSize: 1,  // Default point size (1px)
    colorMode: COLOR_MODES.ORIGINAL,
    solidColor: [255, 255, 255],
    highQuality: true,
    antiAliasing: true,
    lodLevel: 1.0,
    modelScale: 1,
    fov: 75,
  });

  // UI state
  const [controlPanelCollapsed, setControlPanelCollapsed] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);

  // Point cloud extraction - use sampleRate for large point clouds
  const { pointCloudData, extracting, stats } = usePointCloudExtractor(modelData, {
    colorMode: controls.colorMode,
    solidColor: controls.solidColor,
    lodLevel: controls.lodLevel,
    sampleRate: 1.0,  // Sample 100% of points
  });

  // Calculate initial view state based on point cloud bounds
  const initialViewState = useMemo(() => {
    if (pointCloudData && pointCloudData.length > 0) {
      const bounds = calculateBounds(pointCloudData);
      if (bounds) {
        return {
          target: bounds.center,
          rotationX: 30,
          rotationOrbit: -45,
          zoom: 4,
          minZoom: -2,
          maxZoom: 20,
        };
      }
    }
    return null;
  }, [pointCloudData]);

  // Handle model selection
  const handleModelSelect = useCallback((model) => {
    setSelectedModel(model);
    loadModel(model.path);
  }, [loadModel]);

  // Handle file upload complete
  const handleUploadComplete = useCallback((file) => {
    addModel(file);
    // Auto-select the uploaded model
    setSelectedModel(file);
    loadModel(file.path);
  }, [addModel, loadModel]);

  // Handle model delete
  const handleModelDelete = useCallback((model) => {
    removeModel(model.id);
    // If deleted model is currently selected, clear selection
    if (selectedModel?.id === model.id) {
      setSelectedModel(null);
    }
  }, [removeModel, selectedModel]);

  // Handle view mode change
  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
  }, []);

  // Handle control changes
  const handleControlChange = useCallback((newControls) => {
    setControls(newControls);
  }, []);

  // Handle device info
  const handleDeviceInfo = useCallback((info) => {
    setDeviceInfo(info);
  }, []);

  // Determine loading state
  const isLoading = manifestLoading || modelLoading || extracting;
  const loadingMessage = manifestLoading
    ? 'Loading model list...'
    : modelLoading
    ? `Loading model... ${progress}%`
    : extracting
    ? 'Extracting point cloud...'
    : null;

  return (
    <div className="app">
      {/* Model Selector - always visible until model selected */}
      <ModelSelector
        models={models}
        loading={manifestLoading}
        error={manifestError}
        selectedModel={selectedModel}
        onSelect={handleModelSelect}
        onUploadComplete={handleUploadComplete}
        onModelDelete={handleModelDelete}
      />

      {/* Main 3D Viewer - only render when model selected */}
      {selectedModel && modelData && (
        <DeckGLViewer
          modelData={modelData}
          pointCloudData={pointCloudData}
          viewMode={viewMode}
          controls={controls}
          initialViewState={initialViewState}
          onDeviceInfo={handleDeviceInfo}
        />
      )}

      {/* Control Panel */}
      {selectedModel && (
        <ControlPanel
          controls={controls}
          onControlChange={handleControlChange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          deviceInfo={deviceInfo}
          stats={stats}
          isCollapsed={controlPanelCollapsed}
          onToggleCollapse={() => setControlPanelCollapsed(!controlPanelCollapsed)}
        />
      )}

      {/* Loading Overlay */}
      {isLoading && loadingMessage && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p>{loadingMessage}</p>
            {modelLoading && progress > 0 && (
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {modelError && (
        <div className="error-toast">
          <p>Error: {modelError}</p>
          <button onClick={() => loadModel(selectedModel?.path)}>Retry</button>
        </div>
      )}

      {/* Controls Hint */}
      {selectedModel && modelData && !isLoading && (
        <div className="pointer-lock-hint">
          WASD move · Space up · Shift down · Mouse rotate · Scroll zoom
        </div>
      )}

      {/* Status Bar */}
      <div className="status-bar">
        <span className={`renderer-badge ${deviceInfo?.type || 'unknown'}`}>
          {deviceInfo?.type?.toUpperCase() || 'WebGL2'}
        </span>
        {selectedModel && (
          <span className="model-badge">{selectedModel.name}</span>
        )}
      </div>
    </div>
  );
}

export default App;
