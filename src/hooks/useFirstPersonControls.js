/**
 * Input: React hooks, camera state
 * Output: viewState, control functions for first-person camera
 * Pos: Camera control hook for WASD + mouse navigation
 * If this file is updated, you must update this header and the parent folder's README.md.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const DEG_TO_RAD = Math.PI / 180;
const MOVE_SPEED = 5; // units per second
const MOUSE_SENSITIVITY = 0.15;
const VERTICAL_SPEED = 3; // for ascend/descend

export function useFirstPersonControls(initialState = {}) {
  const [viewState, setViewState] = useState({
    position: initialState.position || [0, 1.5, 7],
    bearing: initialState.bearing || 0,
    pitch: initialState.pitch || 0,
  });

  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [cameraMode, setCameraMode] = useState('free'); // 'free' | 'physics'

  const keysPressed = useRef({});
  const animationFrameRef = useRef(null);
  const lastTimeRef = useRef(performance.now());
  const canvasRef = useRef(null);

  // Physics mode state
  const velocityRef = useRef([0, 0, 0]);
  const onGroundRef = useRef(true);

  // Set canvas reference for pointer lock
  const setCanvasElement = useCallback((canvas) => {
    canvasRef.current = canvas;
  }, []);

  // Request pointer lock
  const requestPointerLock = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.requestPointerLock();
    }
  }, []);

  // Exit pointer lock
  const exitPointerLock = useCallback(() => {
    document.exitPointerLock();
  }, []);

  // Toggle camera mode
  const toggleCameraMode = useCallback(() => {
    setCameraMode(prev => prev === 'free' ? 'physics' : 'free');
    velocityRef.current = [0, 0, 0];
    onGroundRef.current = true;
  }, []);

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressed.current[e.code] = true;

      // Prevent default for movement keys
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
        e.preventDefault();
      }

      // ESC to exit pointer lock
      if (e.code === 'Escape') {
        exitPointerLock();
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
  }, [exitPointerLock]);

  // Mouse movement handler
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isPointerLocked) return;

      setViewState(prev => ({
        ...prev,
        bearing: prev.bearing + e.movementX * MOUSE_SENSITIVITY,
        pitch: Math.max(-89, Math.min(89, prev.pitch - e.movementY * MOUSE_SENSITIVITY))
      }));
    };

    const handlePointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement === canvasRef.current);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, [isPointerLocked]);

  // Animation frame for movement
  useEffect(() => {
    const GRAVITY = -20;
    const JUMP_VELOCITY = 8;
    const GROUND_LEVEL = 1.5;

    const animate = () => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      const keys = keysPressed.current;
      const { bearing, position } = viewState;

      // Calculate forward and right vectors based on bearing
      const bearingRad = bearing * DEG_TO_RAD;
      const forward = [
        Math.sin(bearingRad),
        0,
        -Math.cos(bearingRad)
      ];
      const right = [
        Math.cos(bearingRad),
        0,
        Math.sin(bearingRad)
      ];

      let dx = 0, dy = 0, dz = 0;
      const speed = MOVE_SPEED * deltaTime;

      // WASD movement
      if (keys['KeyW']) {
        dx += forward[0] * speed;
        dz += forward[2] * speed;
      }
      if (keys['KeyS']) {
        dx -= forward[0] * speed;
        dz -= forward[2] * speed;
      }
      if (keys['KeyA']) {
        dx -= right[0] * speed;
        dz -= right[2] * speed;
      }
      if (keys['KeyD']) {
        dx += right[0] * speed;
        dz += right[2] * speed;
      }

      if (cameraMode === 'free') {
        // Free flight mode - Space/Shift for vertical movement
        if (keys['Space']) {
          dy += VERTICAL_SPEED * deltaTime;
        }
        if (keys['ShiftLeft'] || keys['ShiftRight']) {
          dy -= VERTICAL_SPEED * deltaTime;
        }
      } else {
        // Physics mode - gravity and jumping
        const velocity = velocityRef.current;

        // Apply gravity
        velocity[1] += GRAVITY * deltaTime;

        // Jump
        if (keys['Space'] && onGroundRef.current) {
          velocity[1] = JUMP_VELOCITY;
          onGroundRef.current = false;
        }

        // Apply velocity
        dy = velocity[1] * deltaTime;

        // Ground collision
        const newY = position[1] + dy;
        if (newY <= GROUND_LEVEL) {
          dy = GROUND_LEVEL - position[1];
          velocity[1] = 0;
          onGroundRef.current = true;
        }
      }

      // Update position if there's movement
      if (dx !== 0 || dy !== 0 || dz !== 0) {
        setViewState(prev => ({
          ...prev,
          position: [
            prev.position[0] + dx,
            prev.position[1] + dy,
            prev.position[2] + dz
          ]
        }));
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraMode]);

  // Convert to deck.gl OrbitView format
  // OrbitView uses: target (center point), rotationX (pitch), rotationOrbit (yaw/bearing), zoom
  const getDeckViewState = useCallback(() => {
    return {
      target: viewState.position,  // Camera looks at this position
      rotationX: -viewState.pitch,  // Pitch (negative because OrbitView convention)
      rotationOrbit: viewState.bearing,  // Yaw/bearing
      zoom: 4,  // Zoom level (higher = closer)
      minZoom: -2,
      maxZoom: 20,
    };
  }, [viewState]);

  return {
    viewState,
    setViewState,
    isPointerLocked,
    cameraMode,
    toggleCameraMode,
    requestPointerLock,
    exitPointerLock,
    setCanvasElement,
    getDeckViewState,
  };
}
