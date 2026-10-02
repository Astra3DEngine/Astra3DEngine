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
├── package.json
└── vite.config.js
```

## 文档

详细设计文档与代码模式速查维护在项目 [Wiki](https://github.com/Astra3DEngine/Astra3DEngine/wiki)：

- **[设计文档](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Design-Docs)** — 索引页，下含分章页面：
  - [第一章 项目概述与策划案](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Design-01-Project)
  - [第二章 多场景系统设计](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Design-02-MultiScene)
  - [第三章 项目格式设计](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Design-03-ProjectFormat)
  - [第四章 脚本系统设计](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Design-04-ScriptSystem)
  - [第五章 方块建模器与骨骼动画引擎](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Design-05-VoxelAnimation)
- **[组件模板](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Element-Template)** — 可复用元素与代码模式：
  - [全局宿主与服务单例](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Element-Template-Foundations)
  - [状态管理](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Element-Template-Stores)
  - [通用组件](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Element-Template-Components)
  - [面板布局与国际化](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Element-Template-Panels)
  - [拆分模式与规则](https://github.com/Astra3DEngine/Astra3DEngine/wiki/Element-Template-Patterns)

英文设计文档也有对应的分章页面（如 `Design-01-Project-EN`、`Element-Template-Stores-EN`）。

## 贡献

欢迎贡献！请随时提交 Pull Request。

## 许可证

本项目采用 GPL-3.0 许可证 - 详见 [LICENSE](LICENSE) 文件。
