/**
 * Input: modelData, pointCloudData, viewState, controls
 * Output: deck.gl canvas with WebGL rendering
 * Pos: Main 3D viewer component using deck.gl with OrbitView + keyboard controls
 * If this file is updated, you must update this header and the parent folder's README.md.
 */

import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { OrbitView } from '@deck.gl/core';
import { ScenegraphLayer } from '@deck.gl/mesh-layers';
import { PointCloudLayer } from '@deck.gl/layers';
import { registerLoaders } from '@loaders.gl/core';
import { GLTFLoader } from '@loaders.gl/gltf';

// Register loaders
registerLoaders([GLTFLoader]);

// View modes
export const VIEW_MODES = {
  MESH: 'mesh',
  POINTCLOUD: 'pointcloud',
};

// Default view state
const DEFAULT_VIEW_STATE = {
  target: [0, 0, 0],
  rotationX: 30,
  rotationOrbit: -45,
  zoom: 4,
  minZoom: -2,
  maxZoom: 20,
};

// Keyboard movement settings
const MOVE_SPEED = 0.1;
const VERTICAL_SPEED = 0.05;

export function DeckGLViewer({
  modelData,
  pointCloudData,
  viewMode = VIEW_MODES.MESH,
  controls = {},
  initialViewState,
  onCanvasReady,
  onDeviceInfo,
}) {
  const deckRef = useRef(null);
  const [viewState, setViewState] = useState(initialViewState || DEFAULT_VIEW_STATE);
  const keysPressed = useRef({});
  const animationFrameRef = useRef(null);

  // Update internal viewState when initialViewState changes (e.g., when point cloud loads)
  useEffect(() => {
    if (initialViewState && initialViewState.target) {
      setViewState(prev => ({
        ...prev,
        ...initialViewState,
      }));
    }
  }, [initialViewState]);

  // Handle view state changes from deck.gl controller (mouse)
  const onViewStateChange = useCallback(({ viewState: newViewState }) => {
    setViewState(newViewState);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressed.current[e.code] = true;
      // Prevent default for movement keys
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyQ', 'KeyE'].includes(e.code)) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Animation loop for keyboard movement
  useEffect(() => {
    const animate = () => {
      const keys = keysPressed.current;

      setViewState(prev => {
        if (!prev || !prev.target) return prev;

        const rotationOrbit = prev.rotationOrbit || 0;
        const bearingRad = (rotationOrbit * Math.PI) / 180;

        // Calculate forward and right vectors based on current rotation
        const forward = [Math.sin(bearingRad), 0, -Math.cos(bearingRad)];
        const right = [Math.cos(bearingRad), 0, Math.sin(bearingRad)];

        let dx = 0, dy = 0, dz = 0;

        // WASD movement
        if (keys['KeyW']) {
          dx += forward[0] * MOVE_SPEED;
          dz += forward[2] * MOVE_SPEED;
        }
        if (keys['KeyS']) {
          dx -= forward[0] * MOVE_SPEED;
          dz -= forward[2] * MOVE_SPEED;
        }
        if (keys['KeyA']) {
          dx -= right[0] * MOVE_SPEED;
          dz -= right[2] * MOVE_SPEED;
        }
        if (keys['KeyD']) {
          dx += right[0] * MOVE_SPEED;
          dz += right[2] * MOVE_SPEED;
        }

        // Vertical movement (Space/Shift or Q/E)
        if (keys['Space'] || keys['KeyE']) {
          dy += VERTICAL_SPEED;
        }
        if (keys['ShiftLeft'] || keys['ShiftRight'] || keys['KeyQ']) {
          dy -= VERTICAL_SPEED;
        }

        // Only update if there's movement
        if (dx !== 0 || dy !== 0 || dz !== 0) {
          return {
            ...prev,
            target: [
              prev.target[0] + dx,
              prev.target[1] + dy,
              prev.target[2] + dz,
            ],
          };
        }

        return prev;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Handle deck.gl load - get device info and canvas
  useEffect(() => {
    if (deckRef.current?.deck) {
      const deck = deckRef.current.deck;

      // Get canvas for pointer lock
      if (onCanvasReady && deck.canvas) {
        onCanvasReady(deck.canvas);
      }

      // Report WebGL info
      if (onDeviceInfo) {
        onDeviceInfo({
          type: 'webgl2',
          vendor: 'WebGL',
          renderer: 'WebGL2',
        });
      }
    }
  }, [onCanvasReady, onDeviceInfo]);

  // Create layers based on view mode
  const layers = useMemo(() => {
    const result = [];

    if (viewMode === VIEW_MODES.MESH && modelData?.url) {
      result.push(
        new ScenegraphLayer({
          id: 'scenegraph-layer',
          data: [{ position: [0, 0, 0] }],
          scenegraph: modelData.url,
          getPosition: d => d.position,
          getOrientation: d => [0, 0, 0],
          sizeScale: controls.modelScale || 1,
          _lighting: 'pbr',
        })
      );
    }

    if (viewMode === VIEW_MODES.POINTCLOUD && pointCloudData && pointCloudData.length > 0) {
      result.push(
        new PointCloudLayer({
          id: 'pointcloud-layer',
          data: pointCloudData,
          getPosition: d => d.position,
          getColor: d => d.color,
          getNormal: d => d.normal,
          pointSize: controls.pointSize || 4,
          sizeUnits: 'pixels',
        })
      );
    }

    return result;
  }, [viewMode, modelData, pointCloudData, controls.modelScale, controls.pointSize]);

  // OrbitView for 3D navigation with custom controls
  const views = useMemo(() => {
    return new OrbitView({
      id: 'orbit',
      orbitAxis: 'Y',
      fovy: controls.fov || 75,
      near: 0.01,
      far: 10000,
    });
  }, [controls.fov]);

  return (
    <DeckGL
      ref={deckRef}
      views={views}
      viewState={viewState}
      onViewStateChange={onViewStateChange}
      layers={layers}
      useDevicePixels={true}
      controller={true}
      parameters={{
        clearColor: [0.1, 0.1, 0.1, 1],
      }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        cursor: 'grab',
      }}
    />
  );
}

export default DeckGLViewer;
