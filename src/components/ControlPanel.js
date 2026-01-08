/**
 * Input: controls state, callbacks for control changes
 * Output: Control panel UI for rendering options
 * Pos: Right-side panel for adjusting point cloud and rendering settings
 * If this file is updated, you must update this header and the parent folder's README.md.
 */

import React, { useState } from 'react';
import { VIEW_MODES } from './DeckGLViewer';
import { COLOR_MODES } from '../hooks/usePointCloudExtractor';

export function ControlPanel({
  controls,
  onControlChange,
  viewMode,
  onViewModeChange,
  cameraMode,
  onCameraModeChange,
  deviceInfo,
  stats,
  isCollapsed,
  onToggleCollapse,
}) {
  const [activeTab, setActiveTab] = useState('view');

  const handleChange = (key, value) => {
    onControlChange({ ...controls, [key]: value });
  };

  const handleColorChange = (e) => {
    const hex = e.target.value;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    handleChange('solidColor', [r, g, b]);
  };

  const solidColorHex = controls.solidColor
    ? `#${controls.solidColor.map(c => c.toString(16).padStart(2, '0')).join('')}`
    : '#ffffff';

  return (
    <div className={`control-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="control-panel-header">
        <h3>Controls</h3>
        <button
          className="collapse-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? '◀' : '▶'}
        </button>
      </div>

      {!isCollapsed && (
        <div className="control-panel-content">
          {/* Tab Navigation */}
          <div className="control-tabs">
            <button
              className={`tab ${activeTab === 'view' ? 'active' : ''}`}
              onClick={() => setActiveTab('view')}
            >
              View
            </button>
            <button
              className={`tab ${activeTab === 'render' ? 'active' : ''}`}
              onClick={() => setActiveTab('render')}
            >
              Render
            </button>
            <button
              className={`tab ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              Info
            </button>
          </div>

          {/* View Tab */}
          {activeTab === 'view' && (
            <div className="control-section">
              <div className="control-group">
                <label>View Mode</label>
                <div className="button-group">
                  <button
                    className={viewMode === VIEW_MODES.MESH ? 'active' : ''}
                    onClick={() => onViewModeChange(VIEW_MODES.MESH)}
                  >
                    Mesh
                  </button>
                  <button
                    className={viewMode === VIEW_MODES.POINTCLOUD ? 'active' : ''}
                    onClick={() => onViewModeChange(VIEW_MODES.POINTCLOUD)}
                  >
                    Point Cloud
                  </button>
                </div>
              </div>

              <div className="control-group">
                <label>Camera Mode</label>
                <div className="button-group">
                  <button
                    className={cameraMode === 'free' ? 'active' : ''}
                    onClick={() => onCameraModeChange('free')}
                  >
                    Free Flight
                  </button>
                  <button
                    className={cameraMode === 'physics' ? 'active' : ''}
                    onClick={() => onCameraModeChange('physics')}
                  >
                    Physics
                  </button>
                </div>
              </div>

              <div className="control-group">
                <label>Field of View: {controls.fov || 75}°</label>
                <input
                  type="range"
                  min="30"
                  max="120"
                  value={controls.fov || 75}
                  onChange={(e) => handleChange('fov', parseInt(e.target.value))}
                />
              </div>
            </div>
          )}

          {/* Render Tab */}
          {activeTab === 'render' && (
            <div className="control-section">
              {viewMode === VIEW_MODES.POINTCLOUD && (
                <>
                  <div className="control-group">
                    <label>Point Size: {controls.pointSize || 1}px</label>
                    <input
                      type="range"
                      min="0.1"
                      max="20"
                      step="0.1"
                      value={controls.pointSize || 1}
                      onChange={(e) => handleChange('pointSize', parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="control-group">
                    <label>Color Mode</label>
                    <select
                      value={controls.colorMode || COLOR_MODES.ORIGINAL}
                      onChange={(e) => handleChange('colorMode', e.target.value)}
                    >
                      <option value={COLOR_MODES.ORIGINAL}>Original</option>
                      <option value={COLOR_MODES.HEIGHT}>Height-based</option>
                      <option value={COLOR_MODES.NORMAL}>Normal-based</option>
                      <option value={COLOR_MODES.SOLID}>Solid Color</option>
                    </select>
                  </div>

                  {controls.colorMode === COLOR_MODES.SOLID && (
                    <div className="control-group">
                      <label>Solid Color</label>
                      <input
                        type="color"
                        value={solidColorHex}
                        onChange={handleColorChange}
                      />
                    </div>
                  )}

                  <div className="control-group">
                    <label>LOD Level: {((controls.lodLevel || 1) * 100).toFixed(0)}%</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={controls.lodLevel || 1}
                      onChange={(e) => handleChange('lodLevel', parseFloat(e.target.value))}
                    />
                  </div>
                </>
              )}

              {viewMode === VIEW_MODES.MESH && (
                <div className="control-group">
                  <label>Model Scale: {controls.modelScale || 1}x</label>
                  <input
                    type="range"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={controls.modelScale || 1}
                    onChange={(e) => handleChange('modelScale', parseFloat(e.target.value))}
                  />
                </div>
              )}

              <div className="control-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={controls.highQuality !== false}
                    onChange={(e) => handleChange('highQuality', e.target.checked)}
                  />
                  High Quality
                </label>
              </div>

              <div className="control-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={controls.antiAliasing !== false}
                    onChange={(e) => handleChange('antiAliasing', e.target.checked)}
                  />
                  Anti-aliasing
                </label>
              </div>
            </div>
          )}

          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="control-section info-section">
              <div className="info-item">
                <span className="info-label">Renderer:</span>
                <span className={`info-value renderer-${deviceInfo?.type || 'unknown'}`}>
                  {deviceInfo?.type?.toUpperCase() || 'Unknown'}
                </span>
              </div>

              {stats && (
                <>
                  <div className="info-item">
                    <span className="info-label">Total Points:</span>
                    <span className="info-value">{stats.totalPoints?.toLocaleString() || 0}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Rendered:</span>
                    <span className="info-value">{stats.sampledPoints?.toLocaleString() || 0}</span>
                  </div>
                </>
              )}

              <div className="info-item">
                <span className="info-label">Vendor:</span>
                <span className="info-value">{deviceInfo?.vendor || 'Unknown'}</span>
              </div>

              <div className="help-section">
                <h4>Controls</h4>
                <ul>
                  <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> - Move</li>
                  <li><kbd>Space</kbd> - Ascend / Jump</li>
                  <li><kbd>Shift</kbd> - Descend</li>
                  <li><kbd>Mouse</kbd> - Look around</li>
                  <li><kbd>Click</kbd> - Lock cursor</li>
                  <li><kbd>ESC</kbd> - Unlock cursor</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ControlPanel;
