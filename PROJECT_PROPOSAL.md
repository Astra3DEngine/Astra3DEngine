# Astra 3D Engine - Web 3D游戏引擎编辑器策划案

## 项目概述

Astra 3D Engine 是一个基于Web的3D游戏引擎编辑器，灵感来源于Unity和Godot，专门用于制作网页3D小游戏。项目采用编辑器与运行时分离的架构设计，确保导出的游戏可以独立运行。

---

## 一、技术选型

### 核心渲染引擎

**推荐技术栈：Three.js + 自研编辑器框架**

| 引擎 | 优势 | 劣势 |
|------|------|------|
| **Three.js** | 生态最成熟、社区庞大、文档完善、与React/Vue集成良好 | 需要大量定制开发 |
| Babylon.js | 功能完整、内置编辑器 | 体积较大，定制灵活性较低 |
| PlayCanvas | 云端协作、内置物理 | 商业依赖较强 |

**为什么选择 Three.js：**

- [gg-web-engine](https://github.com/AndyGura/gg-web-engine) 等开源项目已经证明 Three.js 可以构建模块化的游戏引擎架构
- 与 Unity/Godot 的架构设计理念相似，可以借鉴其组件系统设计
- 社区资源丰富，遇到问题容易找到解决方案

### 编辑器技术栈

```
前端框架：React 18 + TypeScript
状态管理：Zustand（轻量）或 Redux Toolkit
3D渲染：Three.js + @react-three/fiber（如果用React）
物理引擎：Ammo.js（Web版PhysX）或 Cannon.js
资源管理：Webpack/Vite
打包发布：Vite + WebGL编译
```

---

## 二、核心架构设计

### 编辑器与运行时分离架构

这是最关键的设计决策，保证导出的游戏不依赖编辑器代码：

```
┌─────────────────────────────────────────────────────────┐
│                    Editor UI (React)                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                  │
│  │Hierarchy│  │Inspector│  │  Tool   │                  │
│  │ Panel   │  │ Panel   │  │  Bar    │                  │
│  └────┬────┘  └────┬────┘  └────┬────┘                  │
│       │            │            │                        │
│       └────────────┼────────────┘                        │
│                    │                                      │
│            ┌───────▼───────┐                              │
│            │  Engine Core  │                              │
│            │  (Three.js)   │                              │
│            └───────┬───────┘                              │
│                    │                                      │
│        ┌───────────┼───────────┐                          │
│        │           │           │                          │
│   ┌────▼────┐ ┌────▼────┐ ┌────▼────┐                    │
│   │ Scene   │ │ Physics │ │  Asset  │                    │
│   │ Manager │ │ Engine  │ │ Manager │                    │
│   └─────────┘ └─────────┘ └─────────┘                    │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼ 可导出为独立Web游戏
┌─────────────────────────────────────────────────────────┐
│                  Runtime (纯Three.js)                    │
│              无编辑器依赖，可独立运行                      │
└─────────────────────────────────────────────────────────┘
```

### 类Unity的组件系统设计

```typescript
// 核心组件架构示例
interface Component {
  uuid: string;
  type: string;
  enabled: boolean;
  update?(deltaTime: number): void;
}

interface GameObject {
  uuid: string;
  name: string;
  transform: TransformComponent;
  components: Component[];
  children: GameObject[];
}

interface Scene {
  uuid: string;
  name: string;
  rootObjects: GameObject[];
  activeCamera: CameraComponent;
}
```

### 目录结构建议

```
Astra3DEngine/
├── packages/
│   ├── core/                 # 引擎核心（场景管理、对象系统）
│   │   ├── src/
│   │   │   ├── scene/
│   │   │   ├── object/
│   │   │   ├── component/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── renderer/             # Three.js渲染器封装
│   │   ├── src/
│   │   │   ├── webgl/
│   │   │   ├── materials/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── physics/              # 物理引擎封装
│   │   ├── src/
│   │   └── package.json
│   │
│   └── editor/               # 编辑器UI（可选，最后导出）
│       ├── src/
│       │   ├── components/   # React组件
│       │   ├── panels/        # 各面板
│       │   ├── viewport/      # 视口
│       │   └── App.tsx
│       └── package.json
│
├── examples/                  # 示例项目
├── documentation/             # 文档
├── package.json               # 根目录workspace配置
└── README.md
```

---

## 三、关键功能模块规划

### 1. 场景层级面板 (Hierarchy Panel)

- [x] 树形结构显示场景图
- [ ] 拖拽排序、嵌套
- [ ] 多选、复制粘贴
- [ ] 搜索过滤
- [ ] 右键上下文菜单

### 2. 属性检查器 (Inspector Panel)

- [x] 动态属性编辑（基于选中对象类型）
- [ ] 组件添加/删除
- [x] 变换控件（位置、旋转、缩放）
- [x] 颜色选择器
- [ ] 资源引用选择器等

### 3. 视口 (Viewport)

- [x] 透视模式
- [ ] 正交模式
- [x] 相机控制（Orbit）
- [ ] First Person/Walking
- [x] 变换工具（Gizmos）：移动、旋转、缩放
- [x] 网格/轴心显示
- [x] 场景拾取（Raycasting）
- [ ] 多视角布局（4视图）

### 4. 资源管理器

- [ ] 导入模型（GLTF/GLB优先，OBJ支持）
- [ ] 纹理管理（支持预览）
- [ ] 预制件（Prefab）系统
- [ ] 场景文件序列化（JSON格式）
- [ ]  资源压缩和优化   

### 5. 物理系统

- [ ] 碰撞体配置（Box、Sphere、Mesh）
- [ ] 刚体属性（质量、阻力、重力）
- [ ] 射线检测
- [ ] 物理材质（摩擦力、弹性）

### 6. 播放控制

- [x] Play/Stop
- [ ] Pause
- [ ] 运行时调试（变量监控）
- [ ] 时间缩放
- [ ] 断点调试（高级功能）

### 7. 构建发布

- [ ] WebGL打包
- [ ] 压缩优化（Terser、Draco）
- [ ] 单文件/多文件输出
- [ ] 加载画面定制

---

## 四、技术挑战与解决方案

| 挑战 | 解决方案 |
|------|----------|
| **性能**：编辑器占用资源大 | 使用Web Workers处理非UI任务 |
| **精度**：浮点误差 | 使用高精度数学库（如gl-matrix） |
| **兼容性**：浏览器差异 | 抽象WebGL上下文，统一API |
| **资源加载**：大模型卡顿 | 异步加载 + 进度条 + LOD |
| **持久化**：场景数据存储 | JSON序列化 + IndexedDB缓存 |
| **物理同步**：Web端物理引擎不稳定 | 内置确定性物理模式选项 |

### 运行时优化考虑

- [ ]  对象池复用
- [ ] 视锥剔除（Frustum Culling）
- [ ] 遮挡剔除（Occlusion Culling）
- [ ] 材质合并
- [ ] WebGL 2.0特性利用
- [ ] 实例化渲染（Instancing）

---

## 五、开发路线图

### Phase 1: 核心框架 (MVP)

- [x] [已完成] 项目初始化（Vite + React + Three.js）
- [x] [已完成] 基础场景管理（创建/删除/层级）
- [x] [已完成] 简单视口（相机控制 + 网格）
- [x] [已完成] Transform组件和Gizmos（移动/旋转/缩放工具）
- [ ] 基础资源加载（GLTF）

**目标**：能够打开编辑器，看到3D场景，创建简单物体并保存

### Phase 2: 编辑器完善

- [ ] Inspector面板（组件编辑）
- [ ] 资源管理器
- [ ] 场景保存/加载
- [ ] 预制件系统
- [ ] Undo/Redo
- [ ] 快捷键支持

**目标**：能够完整编辑一个简单场景

### Phase 3: 物理与交互

- [ ] 物理引擎集成（Ammo.js）
- [ ] 碰撞检测
- [ ] 基础脚本组件（用户自定义逻辑）
- [ ] 输入系统（键盘/鼠标/触摸）
- [ ] 光照系统

**目标**：能够创建可交互的3D游戏场景

### Phase 4: 高级功能

- [ ] 光照系统（烘焙）
- [ ] 地形系统
- [ ] 粒子系统
- [ ] 动画系统
- [ ] 网络同步（多人）

**目标**：能够制作功能完整的3D游戏

### Phase 5: 发布与生态

- [ ] 构建优化
- [ ] Web平台发布
- [ ] 插件系统
- [ ] 社区资源市场
- [ ] 文档完善

**目标**：形成可持续发展的开源生态

---

## 六、可参考的开源项目

### Web 3D引擎参考

1. **[gg-web-engine](https://github.com/AndyGura/gg-web-engine)**
   - 模块化Web游戏引擎，整合Three.js和Ammo.js
   - 很好的架构参考

2. **[Three.js](https://threejs.org/)**
   - 核心渲染引擎
   - 官方示例丰富

3. **[Babylon.js](https://www.babylonjs.com/)**
   - 功能完整的Web 3D引擎
   - 内置编辑器

### 原生引擎架构参考

1. **[Unity Engine](https://unity.com/)**
   - 组件系统设计
   - 编辑器架构

2. **[Godot Engine](https://godotengine.org/)**
   - 开源引擎
   - 场景系统和节点架构

### 学习资源

- [Getting started with Unity Web](https://learn.unity.com/tutorial/getting-started-with-unity-web) - WebGL发布流程参考
- [3D Game Engine Development Guide](https://codepal.ai/code-generator/query/SVCtznTu/3d-game-engine-development-tutorial) - 3D引擎开发基础知识

---

## 七、建议的第一步行动

1. **环境准备**
   - 安装 Node.js 18+
   - 配置 Git
   - 安装 pnpm 或 yarn（推荐pnpm）

2. **学习 Three.js 基础**
   - 完成官方基础教程
   - 学习GLTF模型加载
   - 理解材质和光照

3. **研究开源项目**
   - 克隆 gg-web-engine
   - 分析其代码架构
   - 理解模块拆分方式

4. **搭建原型**
   - 用 Vite + React + Three.js 搭建项目
   - 实现简单的场景编辑器雏形
   - 验证技术可行性

5. **迭代开发**
   - 根据路线图逐步实现功能
   - 保持架构的灵活性
   - 持续测试和优化

---

## 八、命名说明

**Astra** 来自拉丁语"星辰"之意，象征这个引擎能够帮助你将游戏梦想照亮整个网络世界。

---

## 许可证

本项目将采用 GPL-3 开源许可证。
