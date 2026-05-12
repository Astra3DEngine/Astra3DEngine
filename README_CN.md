# Astra 3D Engine

一个开玩笑的 3D 引擎。

![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.0-green.svg)

[English](./README.md) | 简体中文

## 功能特性

### 视口 (Viewport)
- 透视相机与轨道控制
- 变换工具（移动、旋转、缩放）
- 网格与坐标轴显示
- 场景射线拾取
- **定向球（26面体截角截棱立方体）**
  - 点击任意面跳转到对应视角
  - 点击面高亮显示
  - 拖拽旋转相机

### 层级面板 (Hierarchy Panel)
- 场景对象树形结构
- 创建/删除对象
- 对象选择

### 检查器面板 (Inspector Panel)
- 变换编辑（位置、旋转、缩放）
- 颜色选择器
- 动态属性编辑

### 资源面板 (Assets Panel)
- GLTF/GLB 模型导入
- 拖放支持
- 模型预览

### 样式
- 模块化 CSS 架构
- 按组件拆分样式
- CSS 变量支持主题定制

## 技术栈

- **前端框架**: React 18
- **3D 渲染**: Three.js
- **构建工具**: Vite
- **包管理器**: pnpm

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
pnpm dev
```

### 构建

```bash
# 生产构建
pnpm build

# 预览生产构建
pnpm preview
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

## 定向球

定向球是一个 **26面体截角截棱立方体**，由以下组成：
- 6 个正方形面（原立方体的面）
- 12 个矩形面（切去棱后形成的面）
- 8 个三角形面（切去角后形成的面）

点击任意面可将相机跳转到对应方向。被点击的面会以不同颜色高亮显示。

## 开发路线图

### 第一阶段：核心框架 (MVP) ✅
- [x] 项目初始化
- [x] 基础场景管理
- [x] 视口与相机控制
- [x] 变换工具
- [x] 定向球

### 第二阶段：编辑器完善
- [ ] 撤销/重做系统
- [ ] 快捷键支持
- [ ] 场景保存/加载
- [ ] 预制件系统

### 第三阶段：物理与交互
- [ ] 物理引擎集成
- [ ] 碰撞检测
- [ ] 脚本组件

### 第四阶段：高级功能
- [ ] 光照系统
- [ ] 动画系统
- [ ] 粒子系统

## 贡献

欢迎贡献！请随时提交 Pull Request。

## 许可证

本项目采用 GPL-3.0 许可证 - 详见 [LICENSE](LICENSE) 文件。