/**
 * Input: model URL/path
 * Output: loaded model data, loading state
 * Pos: Hook for loading GLB/GLTF/PLY models using loaders.gl
 * If this file is updated, you must update this header and the parent folder's README.md.
 */

import { useState, useEffect, useCallback } from 'react';
import { load, registerLoaders } from '@loaders.gl/core';
import { GLTFLoader } from '@loaders.gl/gltf';
import { DracoLoader } from '@loaders.gl/draco';
import { PLYLoader } from '@loaders.gl/ply';

// Register loaders for compressed meshes and PLY files
registerLoaders([DracoLoader, PLYLoader]);

export function useModelLoader() {
  const [modelUrl, setModelUrl] = useState(null);
  const [modelData, setModelData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const loadModel = useCallback(async (url) => {
    if (!url) return;

    setLoading(true);
    setError(null);
    setProgress(0);
    setModelUrl(url);

    try {
      const fullUrl = url.startsWith('http') ? url : `${process.env.PUBLIC_URL}${url}`;
      const isPLY = fullUrl.toLowerCase().endsWith('.ply');

      if (isPLY) {
        // Load PLY file
        const plyData = await load(fullUrl, PLYLoader, {
          ply: {
            skip: 0,
          },
          onProgress: (progressEvent) => {
            if (progressEvent.total) {
              setProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
            }
          }
        });

        setModelData({
          gltf: null,
          url: fullUrl,
          meshes: extractPLYMesh(plyData),
          isPLY: true,
        });
      } else {
        // Load GLB/GLTF file
        const gltf = await load(fullUrl, GLTFLoader, {
          gltf: {
            loadBuffers: true,
            loadImages: true,
            decompressMeshes: true,
            postProcess: true,
          },
          draco: {
            decoderType: 'js',
          },
          onProgress: (progressEvent) => {
            if (progressEvent.total) {
              setProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
            }
          }
        });

        setModelData({
          gltf,
          url: fullUrl,
          meshes: extractMeshes(gltf),
          isPLY: false,
        });
      }
      setProgress(100);
    } catch (err) {
      console.error('Error loading model:', err);
      setError(err.message || 'Failed to load model');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearModel = useCallback(() => {
    setModelData(null);
    setModelUrl(null);
    setError(null);
    setProgress(0);
  }, []);

  return {
    modelData,
    modelUrl,
    loading,
    error,
    progress,
    loadModel,
    clearModel,
  };
}

/**
 * Extract mesh data from PLY point cloud
 */
function extractPLYMesh(plyData) {
  const meshes = [];

  if (!plyData || !plyData.attributes) {
    console.warn('PLY data has no attributes');
    return meshes;
  }

  const { attributes } = plyData;

  // Debug: log all available attributes
  console.log('PLY attributes available:', Object.keys(attributes));
  Object.keys(attributes).forEach(key => {
    const attr = attributes[key];
    console.log(`  ${key}: type=${attr.value?.constructor?.name}, length=${attr.value?.length}, sample=${attr.value?.slice?.(0, 3)}`);
  });

  const positions = attributes.POSITION?.value;

  if (!positions) {
    console.warn('PLY data has no position data');
    return meshes;
  }

  // Extract colors if available (PLY can have red, green, blue or COLOR_0)
  let colors = attributes.COLOR_0?.value;

  // PLY files often store colors as separate r, g, b attributes (case insensitive)
  if (!colors) {
    // Try different naming conventions for colors
    const redAttr = attributes.red || attributes.Red || attributes.RED || attributes.r || attributes.R;
    const greenAttr = attributes.green || attributes.Green || attributes.GREEN || attributes.g || attributes.G;
    const blueAttr = attributes.blue || attributes.Blue || attributes.BLUE || attributes.b || attributes.B;

    if (redAttr?.value && greenAttr?.value && blueAttr?.value) {
      const r = redAttr.value;
      const g = greenAttr.value;
      const b = blueAttr.value;
      const vertexCount = r.length;

      // Check if values are 0-255 (uint8) or 0-1 (float)
      const isUint8 = r[0] > 1 || g[0] > 1 || b[0] > 1;

      if (isUint8) {
        colors = new Uint8Array(vertexCount * 3);
        for (let i = 0; i < vertexCount; i++) {
          colors[i * 3] = r[i];
          colors[i * 3 + 1] = g[i];
          colors[i * 3 + 2] = b[i];
        }
      } else {
        colors = new Float32Array(vertexCount * 3);
        for (let i = 0; i < vertexCount; i++) {
          colors[i * 3] = r[i];
          colors[i * 3 + 1] = g[i];
          colors[i * 3 + 2] = b[i];
        }
      }
      console.log('Colors extracted from r/g/b attributes, isUint8:', isUint8);
    }
  }

  // Also try diffuse_red, diffuse_green, diffuse_blue (some PLY exporters use this)
  if (!colors) {
    const dRed = attributes.diffuse_red || attributes.diffuseRed;
    const dGreen = attributes.diffuse_green || attributes.diffuseGreen;
    const dBlue = attributes.diffuse_blue || attributes.diffuseBlue;

    if (dRed?.value && dGreen?.value && dBlue?.value) {
      const r = dRed.value;
      const g = dGreen.value;
      const b = dBlue.value;
      const vertexCount = r.length;
      const isUint8 = r[0] > 1 || g[0] > 1 || b[0] > 1;

      if (isUint8) {
        colors = new Uint8Array(vertexCount * 3);
      } else {
        colors = new Float32Array(vertexCount * 3);
      }

      for (let i = 0; i < vertexCount; i++) {
        colors[i * 3] = r[i];
        colors[i * 3 + 1] = g[i];
        colors[i * 3 + 2] = b[i];
      }
      console.log('Colors extracted from diffuse_* attributes');
    }
  }

  // Support for 3D Gaussian Splatting PLY format (f_dc_0, f_dc_1, f_dc_2 are spherical harmonics DC components)
  if (!colors) {
    const fdc0 = attributes.f_dc_0 || attributes['f_dc_0'];
    const fdc1 = attributes.f_dc_1 || attributes['f_dc_1'];
    const fdc2 = attributes.f_dc_2 || attributes['f_dc_2'];

    if (fdc0?.value && fdc1?.value && fdc2?.value) {
      const dc0 = fdc0.value;
      const dc1 = fdc1.value;
      const dc2 = fdc2.value;
      const vertexCount = dc0.length;

      // Spherical Harmonics constant for DC component: 0.28209479177387814
      const SH_C0 = 0.28209479177387814;

      colors = new Uint8Array(vertexCount * 3);
      for (let i = 0; i < vertexCount; i++) {
        // Convert SH DC to RGB: color = 0.5 + SH_C0 * f_dc
        // Then clamp to [0, 1] and convert to [0, 255]
        const r = Math.max(0, Math.min(1, 0.5 + SH_C0 * dc0[i]));
        const g = Math.max(0, Math.min(1, 0.5 + SH_C0 * dc1[i]));
        const b = Math.max(0, Math.min(1, 0.5 + SH_C0 * dc2[i]));

        colors[i * 3] = Math.round(r * 255);
        colors[i * 3 + 1] = Math.round(g * 255);
        colors[i * 3 + 2] = Math.round(b * 255);
      }
      console.log('Colors extracted from Gaussian Splatting f_dc_* attributes (SH DC components)');
    }
  }

  // Extract normals if available
  const normals = attributes.NORMAL?.value || attributes.nx?.value;
  let normalData = normals;

  // PLY files often store normals as separate nx, ny, nz attributes
  if (!normalData && attributes.nx?.value && attributes.ny?.value && attributes.nz?.value) {
    const nx = attributes.nx.value;
    const ny = attributes.ny.value;
    const nz = attributes.nz.value;
    const vertexCount = nx.length;
    normalData = new Float32Array(vertexCount * 3);
    for (let i = 0; i < vertexCount; i++) {
      normalData[i * 3] = nx[i];
      normalData[i * 3 + 1] = ny[i];
      normalData[i * 3 + 2] = nz[i];
    }
  }

  // Flip Y axis for Gaussian Splatting PLY files (they use inverted Y coordinate)
  // Check if this is a Gaussian Splatting file by looking for f_dc_* attributes
  const isGaussianSplatting = attributes.f_dc_0 || attributes['f_dc_0'];

  let finalPositions = positions;
  let finalNormals = normalData;

  if (isGaussianSplatting) {
    // Create new array with flipped Y and Z coordinates
    // Gaussian Splatting uses different coordinate convention
    finalPositions = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 3) {
      finalPositions[i] = positions[i];          // X stays the same
      finalPositions[i + 1] = -positions[i + 1]; // Flip Y (up/down)
      finalPositions[i + 2] = -positions[i + 2]; // Flip Z (front/back)
    }

    // Also flip normals if they exist
    if (normalData) {
      finalNormals = new Float32Array(normalData.length);
      for (let i = 0; i < normalData.length; i += 3) {
        finalNormals[i] = normalData[i];
        finalNormals[i + 1] = -normalData[i + 1];
        finalNormals[i + 2] = -normalData[i + 2];
      }
    }

    console.log('Applied Y and Z axis flip for Gaussian Splatting PLY');
  }

  meshes.push({
    id: 'ply-mesh-0',
    positions: finalPositions,
    normals: finalNormals || null,
    colors: colors || null,
    texcoords: null,
    vertexCount: positions.length / 3,
  });

  console.log(`PLY loaded: ${positions.length / 3} vertices, colors: ${!!colors}, normals: ${!!normalData}`);

  return meshes;
}

/**
 * Extract mesh data from GLTF for point cloud conversion
 * Handles multiple loaders.gl output formats
 */
function extractMeshes(gltf) {
  const meshes = [];

  if (!gltf) {
    return meshes;
  }

  // Try standard gltf.meshes format (with parsed attributes)
  if (gltf.meshes && Array.isArray(gltf.meshes) && gltf.meshes.length > 0) {
    gltf.meshes.forEach((mesh, meshIndex) => {
      mesh.primitives?.forEach((primitive, primIndex) => {
        const positions = primitive.attributes?.POSITION?.value;
        const normals = primitive.attributes?.NORMAL?.value;
        const colors = primitive.attributes?.COLOR_0?.value;
        const texcoords = primitive.attributes?.TEXCOORD_0?.value;

        if (positions) {
          meshes.push({
            id: `mesh-${meshIndex}-${primIndex}`,
            positions: positions,
            normals: normals || null,
            colors: colors || null,
            texcoords: texcoords || null,
            vertexCount: positions.length / 3,
          });
        }
      });
    });
  }

  // Try loaders.gl v3 format with accessors
  if (meshes.length === 0 && gltf.json?.meshes && gltf.buffers) {
    const jsonMeshes = gltf.json.meshes;
    const accessors = gltf.json.accessors || [];
    const bufferViews = gltf.json.bufferViews || [];

    jsonMeshes.forEach((mesh, meshIndex) => {
      mesh.primitives?.forEach((primitive, primIndex) => {
        const positionAccessorIndex = primitive.attributes?.POSITION;
        if (positionAccessorIndex !== undefined) {
          const accessor = accessors[positionAccessorIndex];
          if (accessor) {
            const bufferView = bufferViews[accessor.bufferView];
            const buffer = gltf.buffers[bufferView?.buffer || 0];

            if (buffer && bufferView) {
              const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
              const count = accessor.count;

              // Create Float32Array from buffer
              const positions = new Float32Array(
                buffer.arrayBuffer || buffer,
                byteOffset,
                count * 3
              );

              // Try to get normals
              let normals = null;
              const normalAccessorIndex = primitive.attributes?.NORMAL;
              if (normalAccessorIndex !== undefined) {
                const normalAccessor = accessors[normalAccessorIndex];
                if (normalAccessor) {
                  const normalBV = bufferViews[normalAccessor.bufferView];
                  const normalBuffer = gltf.buffers[normalBV?.buffer || 0];
                  if (normalBuffer && normalBV) {
                    const normalOffset = (normalBV.byteOffset || 0) + (normalAccessor.byteOffset || 0);
                    normals = new Float32Array(
                      normalBuffer.arrayBuffer || normalBuffer,
                      normalOffset,
                      normalAccessor.count * 3
                    );
                  }
                }
              }

              // Try to get colors
              let colors = null;
              const colorAccessorIndex = primitive.attributes?.COLOR_0;
              if (colorAccessorIndex !== undefined) {
                const colorAccessor = accessors[colorAccessorIndex];
                if (colorAccessor) {
                  const colorBV = bufferViews[colorAccessor.bufferView];
                  const colorBuffer = gltf.buffers[colorBV?.buffer || 0];
                  if (colorBuffer && colorBV) {
                    const colorOffset = (colorBV.byteOffset || 0) + (colorAccessor.byteOffset || 0);
                    const componentCount = colorAccessor.type === 'VEC4' ? 4 : 3;

                    // Handle different color component types
                    const bufferData = colorBuffer.arrayBuffer || colorBuffer;
                    if (colorAccessor.componentType === 5121) {
                      // UNSIGNED_BYTE - common for point cloud colors
                      colors = new Uint8Array(bufferData, colorOffset, colorAccessor.count * componentCount);
                    } else if (colorAccessor.componentType === 5126) {
                      // FLOAT
                      colors = new Float32Array(bufferData, colorOffset, colorAccessor.count * componentCount);
                    }
                  }
                }
              }

              meshes.push({
                id: `mesh-${meshIndex}-${primIndex}`,
                positions,
                normals,
                colors,
                texcoords: null,
                vertexCount: count,
              });
            }
          }
        }
      });
    });
  }

  return meshes;
}

// API base URL - use environment variable or default to same origin
const API_BASE = process.env.REACT_APP_API_URL || '';

/**
 * Hook to fetch available models from API and manifest
 */
export function useModelManifest() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const allModels = [];

      // Try to fetch from API (uploaded models)
      try {
        const apiResponse = await fetch(`${API_BASE}/api/models`);
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          if (apiData.models) {
            allModels.push(...apiData.models.map(m => ({ ...m, source: 'uploaded' })));
          }
        }
      } catch (apiErr) {
        console.log('API not available, using manifest only');
      }

      // Fetch from static manifest
      try {
        const manifestResponse = await fetch(`${process.env.PUBLIC_URL}/models/models-manifest.json`);
        if (manifestResponse.ok) {
          const manifestData = await manifestResponse.json();
          if (manifestData.models) {
            allModels.push(...manifestData.models.map(m => ({ ...m, source: 'static' })));
          }
        }
      } catch (manifestErr) {
        console.log('Manifest not available');
      }

      setModels(allModels);
      setError(null);
    } catch (err) {
      console.error('Error loading models:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const addModel = useCallback((model) => {
    setModels(prev => [{ ...model, source: 'uploaded' }, ...prev]);
  }, []);

  const removeModel = useCallback((modelId) => {
    setModels(prev => prev.filter(m => m.id !== modelId));
  }, []);

  return { models, loading, error, refetch: fetchModels, addModel, removeModel };
}
