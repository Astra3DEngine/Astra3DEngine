<div><img src="./src/logo.svg" height="24px" />  <font size="6px">Astra 3D Engine</font></div>

A joking 3D engine, just like [NOTHING](https://github.com/NeuronPulse/nothing).

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)![NodeJS](https://img.shields.io/badge/Node.js-v22.18.0-339933?style=flat-square&logo=node.js)![React](https://img.shields.io/badge/React-v18.2.0-0099FF?style=flat-square&logo=react)![Three.js](https://img.shields.io/badge/Three.js-v0.160.0-66ccff?style=flat-square&logo=three.js)![Vite](https://img.shields.io/badge/Vite-v4.4.9-9135ff?style=flat-square&logo=vite)

English | [简体中文](./README_CN.md)

A dedicated engine for Web 3D development, allowing you to create interesting 3D games with simple operations.

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
pnpm run dev
```

### Build

```bash
# Build for production
pnpm run build

# Preview production build
pnpm run preview
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
├── package.json
└── vite.config.js
```

## Docs

Detailed design & code-pattern documents are maintained in the project [Wiki](https://github.com/Astra3DEngine/Astra3DEngine/wiki):

- **[Design Docs](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Design-Docs)** — index with per-chapter pages:
  - [Ch1 Project Overview & Planning](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Design-01-Project)
  - [Ch2 Multi-Scene System](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Design-02-MultiScene)
  - [Ch3 Project Format](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Design-03-ProjectFormat)
  - [Ch4 Scripting System](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Design-04-ScriptSystem)
  - [Ch5 Voxel Editor & Animation Engine](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Design-05-VoxelAnimation)
- **[Element Template](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Element-Template)** — reusable elements & code patterns:
  - [Global Hosts & Services](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Element-Template-Foundations)
  - [State Management](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Element-Template-Stores)
  - [Common Components](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Element-Template-Components)
  - [Panels & i18n](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Element-Template-Panels)
  - [Decomposition & Rules](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Element-Template-Patterns)

English design docs also have per-chapter EN pages (e.g. `Design-01-Project-EN`, `Element-Template-Stores-EN`).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.
