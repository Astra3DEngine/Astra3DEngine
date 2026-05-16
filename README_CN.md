<div><img src="./src/logo.svg" height="24px" />  <font size="6px">Astra 3D Engine</font></div>

一个开玩笑的 3D 引擎，就和 [NOTHING](https://github.com/NeuronPulse/nothing) 一样。

  ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)![NodeJS](https://img.shields.io/badge/Node.js-v22.18.0-339933?style=flat-square&logo=node.js)![React](https://img.shields.io/badge/React-v18.2.0-0099FF?style=flat-square&logo=react)![Three.js](https://img.shields.io/badge/Three.js-v0.160.0-66ccff?style=flat-square&logo=three.js)![Vite](https://img.shields.io/badge/Vite-v4.4.9-9135ff?style=flat-square&logo=vite)

[English](./README.md) | 简体中文

一个专用于 Web 3D 开发的引擎，可以通过简单的操作制作有意思的 3D 游戏。

## 快速开始

### 环境要求

- Node.js >= 16
- pnpm >= 8

### 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/Astra3DEngine.git

# 进入项目目录
cd Astra3DEngine

# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev
```

### 构建

```bash
# 生产构建
pnpm run build

# 预览生产构建
pnpm run preview
```

## 项目结构

```
Astra3DEngine/
├── src/
│   ├── components/
│   │   ├── Viewport.jsx       # 3D视口与定向球
│   │   ├── HierarchyPanel.jsx # 场景层级
│   │   ├── InspectorPanel.jsx # 对象属性
│   │   ├── AssetsPanel.jsx    # 资源管理
│   │   └── Toolbar.jsx        # 主工具栏
│   ├── styles/
│   │   ├── main.css           # 入口文件
│   │   ├── variables.css      # CSS变量
│   │   ├── base.css           # 基础样式
│   │   ├── viewport.css       # 视口样式
│   │   └── ...                # 其他组件样式
│   ├── i18n/                  # 国际化
│   ├── App.jsx
│   └── main.jsx
├── PROJECT_PROPOSAL.md        # 详细项目提案
├── package.json
└── vite.config.js
```

## 贡献

欢迎贡献！请随时提交 Pull Request。

## 许可证

本项目采用 GPL-3.0 许可证 - 详见 [LICENSE](LICENSE) 文件。