Once the contents of this folder change, update this document.

# deck.gl GLB Viewer

A WebGPU-accelerated 3D model viewer built with deck.gl and React. Supports GLB/GLTF meshes and PLY point clouds with first-person navigation controls and a modern control panel.

## Architecture

React application using deck.gl v9 with WebGPU support (falls back to WebGL2) for rendering GLB/GLTF models. Supports both mesh and point cloud visualization modes with WASD + mouse navigation.

## File Registry

| Name | Status | Core Function |
|------|--------|---------------|
| src/App.js | Active | Main application component |
| src/App.css | Active | Global styles |
| src/components/ | Active | UI components (DeckGLViewer, ModelSelector, ControlPanel) |
| src/hooks/ | Active | Custom hooks (useFirstPersonControls, useModelLoader, usePointCloudExtractor) |
| public/models/ | Active | GLB/GLTF model storage |
| public/models/models-manifest.json | Active | Model listing for dropdown selection |

## Features

- **WebGPU/WebGL2 Rendering**: Automatically uses best available renderer
- **Model Selection**: Dropdown to select from available GLB/GLTF models
- **Dual View Modes**: Switch between mesh and point cloud visualization
- **First-Person Controls**: WASD movement + mouse look
- **Camera Modes**: Free flight and physics-based movement
- **Control Panel**: Adjust point size, color mode, LOD, rendering quality

## Controls

| Key | Action |
|-----|--------|
| W/A/S/D | Move forward/left/backward/right |
| Space | Ascend (free flight) / Jump (physics) |
| Shift | Descend (free flight) |
| Mouse | Look around (after clicking to lock) |
| ESC | Unlock cursor |

## Getting Started

```bash
# Install dependencies
yarn install

# Start development server
yarn start

# Build for production
yarn build
```

## Adding New Models

1. Add your GLB/GLTF/PLY file to `public/models/`
2. Update `public/models/models-manifest.json`:

```json
{
  "models": [
    {
      "id": "your-model-id",
      "name": "Display Name",
      "path": "/models/your-model.glb",
      "type": "glb",
      "description": "Optional description"
    },
    {
      "id": "your-pointcloud-id",
      "name": "Point Cloud Name",
      "path": "/models/your-pointcloud.ply",
      "type": "ply",
      "description": "PLY point cloud file"
    }
  ]
}
```

Supported formats:
- **GLB/GLTF**: 3D mesh models (with optional Draco compression)
- **PLY**: Point cloud files (ASCII or binary, with optional colors/normals)

## Technology Stack

- React 18
- deck.gl v9 (WebGPU/WebGL2)
- luma.gl v9 (WebGPU adapter)
- loaders.gl (GLB/GLTF/PLY loading)
- cannon-es (physics, optional)

## Browser Support

- Chrome 113+ (WebGPU)
- Edge 113+ (WebGPU)
- Firefox (WebGL2 fallback)
- Safari (WebGL2 fallback)

WebGPU requires HTTPS in production (localhost works for development).
