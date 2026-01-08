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
| src/components/ | Active | UI components (DeckGLViewer, ModelSelector, ControlPanel, FileUpload) |
| src/hooks/ | Active | Custom hooks (useFirstPersonControls, useModelLoader, usePointCloudExtractor) |
| api/ | Active | Vercel serverless functions for file upload |
| public/models/ | Active | GLB/GLTF model storage |
| public/models/models-manifest.json | Active | Model listing for dropdown selection |
| vercel.json | Active | Vercel deployment configuration |

## Features

- **WebGPU/WebGL2 Rendering**: Automatically uses best available renderer
- **File Upload**: Drag-and-drop or click to upload GLB/GLTF/PLY files
- **Model Selection**: Dropdown to select from available or uploaded models
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
# Install frontend dependencies
yarn install

# Start frontend development server
yarn start

# Build frontend for production
yarn build
```

### With File Upload Server

To enable file uploads, run the backend server alongside the frontend:

```bash
# Terminal 1: Start backend server
cd server
npm install
npm start
# Server runs on http://localhost:3001

# Terminal 2: Start frontend with API proxy
REACT_APP_API_URL=http://localhost:3001 yarn start
```

For production deployment, configure your web server (nginx, etc.) to:
1. Serve the built frontend from `build/`
2. Proxy `/api/*` requests to the Node.js server
3. Serve uploaded files from `public/models/uploads/`

## Adding New Models

### Option 1: Upload via UI (Recommended)
Simply drag-and-drop your file onto the upload area or click to select a file. Uploaded files are stored in Vercel Blob storage and persist across sessions.

### Option 2: Static Files
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

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Add environment variable: `BLOB_READ_WRITE_TOKEN` (from Vercel Blob storage)
3. Deploy

```bash
# Or deploy via CLI
npm i -g vercel
vercel
```

### GitHub Pages (Static only, no upload)

```bash
npm run deploy
```

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
