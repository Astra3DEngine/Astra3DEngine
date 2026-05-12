# Astra 3D Engine

A joking 3D engine.

![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.0-green.svg)

English | [简体中文](./README_CN.md)

## Features

### Viewport
- Perspective camera with Orbit controls
- Transform Gizmos (Move, Rotate, Scale)
- Grid and axes display
- Scene raycasting for object selection
- **Orientation Cube (26-face Truncated Cube)**
  - Click any face to snap camera to that direction
  - Highlighted face on click
  - Drag to rotate camera

### Hierarchy Panel
- Tree structure for scene objects
- Create/Delete objects
- Object selection

### Inspector Panel
- Transform editing (Position, Rotation, Scale)
- Color picker
- Dynamic property editing

### Assets Panel
- GLTF/GLB model import
- Drag and drop support
- Model preview

### Styling
- Modular CSS architecture
- Component-based style organization
- CSS variables for theming

## Tech Stack

- **Frontend**: React 18
- **3D Rendering**: Three.js
- **Build Tool**: Vite
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js >= 16
- pnpm >= 8

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/Astra3DEngine.git

# Navigate to project directory
cd Astra3DEngine

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Build

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Project Structure

```
Astra3DEngine/
├── src/
│   ├── components/
│   │   ├── Viewport.jsx       # 3D viewport with orientation cube
│   │   ├── HierarchyPanel.jsx # Scene hierarchy
│   │   ├── InspectorPanel.jsx # Object properties
│   │   ├── AssetsPanel.jsx    # Asset management
│   │   └── Toolbar.jsx        # Main toolbar
│   ├── styles/
│   │   ├── main.css           # Entry point
│   │   ├── variables.css      # CSS variables
│   │   ├── base.css           # Base styles
│   │   ├── viewport.css       # Viewport styles
│   │   └── ...                # Other component styles
│   ├── i18n/                  # Internationalization
│   ├── App.jsx
│   └── main.jsx
├── PROJECT_PROPOSAL.md        # Detailed project proposal
├── package.json
└── vite.config.js
```

## Orientation Cube

The orientation cube is a **26-face truncated cube** (truncated cuboctahedron), consisting of:
- 6 square faces (original cube faces)
- 12 rectangular faces (from truncated edges)
- 8 triangular faces (from truncated corners)

Click any face to snap the camera to that direction. The clicked face will be highlighted in a different color.

## Roadmap

### Phase 1: Core Framework (MVP) ✅
- [x] Project initialization
- [x] Basic scene management
- [x] Viewport with camera controls
- [x] Transform Gizmos
- [x] Orientation cube

### Phase 2: Editor Enhancement
- [ ] Undo/Redo system
- [ ] Keyboard shortcuts
- [ ] Scene save/load
- [ ] Prefab system

### Phase 3: Physics & Interaction
- [ ] Physics engine integration
- [ ] Collision detection
- [ ] Script components

### Phase 4: Advanced Features
- [ ] Lighting system
- [ ] Animation system
- [ ] Particle system

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.