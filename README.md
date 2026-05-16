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
├── PROJECT_PROPOSAL.md        # Detailed project proposal
├── package.json
└── vite.config.js
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.
