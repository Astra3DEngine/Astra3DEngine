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
前端框架：React 18 + JavaScript
状态管理：Zustand（轻量）或 Redux Toolkit
3D渲染：Three.js + @react-three/fiber（如果用React）
物理引擎：Ammo.js（Web版PhysX）或 Cannon.js
资源管理：Webpack/Vite
打包发布：Vite + WebGL编译
样式管理：模块化CSS（按组件拆分）
```

---

## 二、核心架构设计

### 编辑器与运行时分离架构

这是最关键的设计决策，保证导出的游戏不依赖编辑器代码。

> **Home 工作台**（Phase 6+）：在编辑器上层增加统一入口，支持多工具界面切换（A3DE 编辑器、方块建模器、资源库等）。详见 [VOXEL_AND_ANIMATION_DESIGN.md](./VOXEL_AND_ANIMATION_DESIGN.md) 第二章。

```
┌─────────────────────────────────────────────────────────┐
│                    Editor UI (React)                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                  │
│  │Hierarchy│  │Inspector│  │Animation│ ← 动画面板 [P8+] │
│  │ Panel   │  │ Panel   │  │  Panel  │                  │
│  └────┬────┘  └────┬────┘  └────┬────┘                  │
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

## 三、关键功能模块规划

### 1. 场景层级面板 (Hierarchy Panel)

- [x] 树形结构显示场景图
- [x] 拖拽排序、嵌套
- [x] 多选、复制粘贴
- [x] 搜索过滤
- [x] 右键上下文菜单
- [x] 添加对象下拉菜单
- [x] 紧凑的标题栏设计
- [x] 父子对象关系（拖拽创建、属性面板设置）
- [x] 展开/折叠子对象（单击图标、双击父对象）

### 2. 属性检查器 (Inspector Panel)

- [x] 动态属性编辑（基于选中对象类型）
- [ ] 组件添加/删除
- [x] 变换控件（位置、旋转、缩放）
- [x] 颜色选择器
- [ ] 资源引用选择器等

### 3. 视口 (Viewport)

- [x] 透视模式
- [x] 正交模式
- [x] 相机控制（Orbit）
- [ ] First Person/Walking
- [x] 变换工具（Gizmos）：移动、旋转、缩放
- [x] 网格/轴心显示
- [x] 场景拾取（Raycasting）
- [x] 多视角布局（4视图）
- [x] 定向球（26面体截角截棱立方体）
- [x] 定向球点击跳转视角
- [x] 定向球面高亮显示
- [x] 定向球拖拽旋转
- [x] 定向球极点万向节锁处理
- [x] 底部工具条（视角切换）
- [x] 自适应容器大小（ResizeObserver）

### 4. 编辑器 UI (Editor UI)

- [x] 可折叠面板组件（CollapsiblePanel）
- [x] 面板横向折叠模式
- [x] 面板竖向折叠模式（侧边栏全部折叠时）
- [x] 工具栏菜单快捷键（Alt+F/E/V/R）
- [x] 语言子菜单展开功能
- [x] 预制件列表滚动条显示
- [x] 层级列表项样式优化
- [x] 面板标题容器紧凑设计（24px高度）
- [x] 下拉菜单组件（添加对象）

### 5. 资源管理器

- [x] 导入模型（GLTF/GLB优先，OBJ支持）
- [x] 纹理管理（支持预览）
- [x] 预制件（Prefab）系统
- [x] 资源删除和重命名
- [x] 右键菜单（重命名、删除）
- [x] 紧凑的标题栏设计
- [x] 自定义文件浏览器（替代系统文件选择对话框）
  - [x] 导航功能（返回、前进、向上、主页）
  - [x] 路径框点击跳转和直接输入
  - [x] 侧边栏快捷位置和硬盘列表
  - [x] 文件类型筛选
  - [x] 新建文件夹
  - [x] 单选和多选模式
- [x] SVG图标系统（替代EMOJI图标）
- [ ] 场景文件序列化（JSON格式）
- [ ] 资源压缩和优化

### 6. 物理系统

- [ ] 碰撞体配置（Box、Sphere、Mesh）
- [ ] 刚体属性（质量、阻力、重力）
- [ ] 射线检测
- [ ] 物理材质（摩擦力、弹性）

### 7. 播放控制

- [x] Play/Stop
- [ ] Pause
- [ ] 运行时调试（变量监控）
- [ ] 时间缩放
- [ ] 断点调试（高级功能）

### 8. 构建发布

- [ ] WebGL打包
- [ ] 压缩优化（Terser、Draco）
- [ ] 单文件/多文件输出
- [ ] 加载画面定制
- [x] 打包为桌面软件（Electron）
  - [x] `pnpm desktop` 命令启动桌面应用调试
  - [x] `pnpm desktop:build` 构建桌面端安装包
  - [x] 自定义标题栏（使用项目工具栏）
  - [x] 窗口控制按钮（最小化、最大化、关闭）
  - [x] Logo 下拉菜单（隐私政策、源代码、检查更新、关于）
  - [x] Alt+点击 Logo 打开小游戏窗口
  - [x] 应用图标文件
  - [ ] 自动更新功能
  - [x] 系统托盘图标

### 9. 插件系统

- [x] 插件管理器（PluginManager）
- [x] 插件 API（ctx 对象、钩子系统）
- [x] 插件设置界面（PluginSettingsModal）
- [x] 插件 manifest.json 配置文件
- [x] 插件入口脚本（userscript）
- [x] 插件 l10n 国际化支持
- [x] 插件设置持久化（LocalStorage）
- [x] 主题插件示例（modern-dark-theme）
- [x] 插件启用/禁用功能
- [x] 插件搜索过滤
- [ ] 插件市场/社区插件
- [ ] 插件依赖管理

**插件 l10n 结构**：
```
src/i18n/plugin-settings/     # 插件设置界面翻译
src/plugins/plugins/*/l10n/   # 插件自己的翻译
```

**翻译来源**：
| 内容 | 位置 | 获取方式 |
|------|------|----------|
| 插件设置界面 UI | `src/i18n/plugin-settings/` | `msg('pluginSettings.key')` |
| 插件名称/描述 | `src/plugins/plugins/[id]/l10n/` | `pluginMsg(pluginId, 'name')` |
| 插件内部文本 | `src/plugins/plugins/[id]/l10n/` | `ctx.msg('key')` |

### 10. 小游戏（MiniCraft）

- [x] Minecraft 风格 3D 方块游戏
- [x] 第一人称视角控制
- [x] 方块放置与破坏
- [x] 多种方块类型（草地、泥土、石头、木头、树叶、沙子）
- [x] 程序化地形生成
  - [x] 2D 噪声地形高度
  - [x] 3D 噪声山洞系统
  - [x] 山洞地表入口
  - [x] 树木生成
- [x] 物理系统
  - [x] 重力模拟
  - [x] 碰撞检测
  - [x] 跳跃
  - [x] 潜行（边缘保护）
- [x] 渲染优化
  - [x] InstancedMesh 批量渲染
  - [x] 帧率显示
- [x] UI 系统
  - [x] MC 风格暂停界面
  - [x] 快捷栏（6 格）
  - [x] 背包系统（27 格，按 E 键打开）
  - [x] 准星
  - [x] 调试信息
- [ ] 更多地形特征（河流、湖泊）
- [ ] 昼夜循环系统
- [ ] 更多方块类型（水、岩浆等）
- [ ] 物品栏持久化

### 11. 方块建模器（Voxel Editor）

> 详细设计见 [VOXEL_AND_ANIMATION_DESIGN.md](./VOXEL_AND_ANIMATION_DESIGN.md) 第三章节

- [ ] Home 工作台下的独立界面
- [ ] 通过固定大小方块搭建 GLTF 模型
- [ ] 产出物存入全局资源库供所有项目引用
- [ ] Three.js InstancedMesh 万级方块单 draw call 渲染
- [ ] 空间哈希 / GPU Picker 实现方块拾取
- [ ] 命令模式 (Command Pattern) + 快照压缩实现撤销重做
- [ ] 3D 视口、画笔/橡皮擦工具
- [ ] 选择 + 变换工具（选中 + TransformControls）
- [ ] 调色板（颜色选择 UI）
- [ ] 图层/分组（树形面板 + Group 管理）
- [ ] GLTF/GLB 导出（合并几何体 + 导出）
- [ ] 项目保存/打开（.avox 格式读写）
- [ ] 正交三视图
- [ ] PBR 材质系统
- [ ] 纹理绘制

### 12. 骨骼动画引擎（Animation Engine）

> 详细设计见 [VOXEL_AND_ANIMATION_DESIGN.md](./VOXEL_AND_ANIMATION_DESIGN.md) 第四章节

- [ ] 内置在 A3DE 主编辑器中的功能面板
- [ ] 三层分离架构：UI 层 (React) / 状态层 (Store) / 引擎层 (Core)
- [ ] AnimationManager 动画混合器管理（蓝本：Astral3D `AnimationManager.ts`）
- [ ] KeyframeTrackFactory 轨道类型自动推断工厂
- [ ] TimelineController Canvas 时间轴控制器 Dope Sheet（蓝本：Astral3D `TimelineTrack.ts`）
- [ ] SkeletonManager 骨骼 CRUD + 从 Group 自动生成骨骼 + 蒙皮绑定
- [ ] 动画列表与播放控制栏
- [ ] 时间轴 Canvas 渲染 + 关键帧拖拽交互
- [ ] 轨道树解析（Clip.tracks → 树形结构显示）
- [ ] 关键帧 CRUD（添加/删除/拖动 + 双向绑定到 Three.js Track）
- [ ] 播放头同步（Mixer 更新 → 播放头自动滚动）
- [ ] 骨骼可视化（SkeletonHelper + 编辑面板）
- [ ] SkinnedMesh 绑定（几何体 + 骨骼）
- [ ] 自动蒙皮权重（距离衰减算法）
- [ ] 曲线编辑器（贝塞尔插值可视化）
- [ ] 动画混合/过渡（crossfade + layer blend）
- [ ] IK/FK 支持
- [ ] 动画导出

### 13. Home 工作台与全局资源库

> 详细设计见 [VOXEL_AND_ANIMATION_DESIGN.md](./VOXEL_AND_ANIMATION_DESIGN.md) 第五章节

- [ ] 统一入口页面（React Router 多页面布局）
- [ ] `/editor` — A3DE 编辑器路由
- [ ] `/voxel-editor` — 方块建模器路由
- [ ] `/settings` — 设置中心路由
- [ ] `/resources` — 资源库管理器路由
- [ ] 全局资源库存储目录（`~/Documents/Astra3DEngine/Resources/`）
- [ ] models / materials / textures / animations 分类
- [ ] 资源库缩略图预览
- [ ] 标签系统
- [ ] 资源搜索过滤

---

## 四、技术挑战与解决方案

| 挑战 | 解决方案 |
|------|----------|
| **性能**：编辑器占用资源大 | 使用Web Workers处理非UI任务 |
| **精度**：浮点误差 | 使用高精度数学库（如gl-matrix） |
| **兼容性**：浏览器差异 | 抽象WebGL上下文，统一API |
| **资源加载**：大模型卡顿 | 异步加载 + 进度条 + LOD |
| **持久化**：场景数据存储 | [项目格式设计](./PROJECT_FORMAT_DESIGN.md)：文件夹结构 + .astra 压缩包 |
| **物理同步**：Web端物理引擎不稳定 | 内置确定性物理模式选项 |

### 运行时优化考虑

- [ ] 对象池复用
- [ ] 视锥剔除（Frustum Culling）
- [ ] 遮挡剔除（Occlusion Culling）
- [ ] 材质合并
- [ ] WebGL 2.0特性利用
- [ ] 实例化渲染（Instancing）

---

## 五、开发路线图

### Phase 1: 核心框架 (MVP)

- [x] 项目初始化（Vite + React + Three.js）
- [x] 基础场景管理（创建/删除/层级）
- [x] 简单视口（相机控制 + 网格）
- [x] Transform组件和Gizmos（移动/旋转/缩放工具）
- [x] 基础资源加载（GLTF）

**目标**：能够打开编辑器，看到3D场景，创建简单物体并保存

### Phase 2: 编辑器完善

- [x] Inspector面板（组件编辑）
- [x] 资源管理器
- [ ] 场景保存/加载
- [x] 预制件系统
- [x] Undo/Redo
- [x] 快捷键支持
- [x] 多语言支持（中、英、日、俄、拉丁语）
- [x] 主题切换（浅色/深色模式）
- [x] 设置持久化（LocalStorage）
- [x] 可折叠面板组件
- [x] SVG图标系统
- [x] Toast 弹窗系统
- [x] 自定义 Dialog 系统（替换浏览器原生弹窗）
- [x] 插件设置界面
- [x] 插件系统 l10n 国际化
- [x] OBJ 模型导入支持
- [x] 模型贴图功能（Inspector + 拖拽）
- [x] 导入文件夹支持
- [x] 素材栏多排布局

**项目格式设计**（详见 [PROJECT_FORMAT_DESIGN.md](./PROJECT_FORMAT_DESIGN.md)）：
- [ ] 项目文件夹结构实现
- [ ] 场景文件序列化（JSON格式）
- [ ] 资源元数据系统（.meta 文件）
- [ ] GUID 引用机制
- [ ] 项目导出为 .astra 压缩包
- [ ] 项目导入（解压 .astra）
- [ ] 增量保存机制
- [ ] 自动保存功能
- [ ] 自动备份功能

**目标**：能够完整编辑一个简单场景

### Phase 3: 物理与交互

- [ ] 物理引擎集成（Ammo.js）
- [ ] 碰撞检测
- [ ] 基础脚本组件（用户自定义逻辑）
- [ ] 输入系统（键盘/鼠标/触摸）
- [ ] 光照系统

**目标**：能够创建可交互的3D游戏场景

### Phase 4: 高级功能

- [ ] 脚本编码（查看[代码设计](./SCRIPT_SYSTEM_DESIGN.md)）
- [ ] 光照系统（烘焙）
- [ ] 地形系统
- [ ] 粒子系统
- [ ] 动画系统（详见 [VOXEL_AND_ANIMATION_DESIGN.md](./VOXEL_AND_ANIMATION_DESIGN.md)）
- [ ] 网络同步（多人）

**目标**：能够制作功能完整的3D游戏

### Phase 5: 发布与生态

- [ ] 构建优化
- [ ] Web平台发布
- [x] 桌面应用打包（Electron）
  - [x] Electron 主进程和 Preload 脚本
  - [x] 自定义标题栏
  - [x] 窗口控制按钮
  - [x] Logo 功能增强
  - [ ] 应用图标和自动更新
- [x] 插件系统（核心功能已完成）
- [ ] 社区资源市场
- [ ] 文档完善

**目标**：形成可持续发展的开源生态

### Phase 6: Home 工作台与资源库

> 详细设计见 [VOXEL_AND_ANIMATION_DESIGN.md](./VOXEL_AND_ANIMATION_DESIGN.md) 第五、七章节

- [ ] Home 工作台框架（React Router 多页面布局）
- [ ] A3DE 编辑器路由迁移（嵌入 /editor 路由）
- [ ] 全局资源库骨架（存储目录 + 索引文件 + CRUD API）
- [ ] 资源库 UI（缩略图、标签、搜索）

**目标**：统一入口，支持多工具界面切换，建立跨项目资源共享机制

### Phase 7: 方块建模器（Voxel Editor MVP）

> 详细设计见 [VOXEL_AND_ANIMATION_DESIGN.md](./VOXEL_AND_ANIMATION_DESIGN.md) 第三、七章节

- [ ] 建模器页面框架（独立 Three.js Scene + 基础布局）
- [ ] InstancedMesh 渲染器（方块绘制 + 拾取）
- [ ] 画笔/橡皮擦工具（基础绘制交互）
- [ ] 选择 + 变换工具（选中 + TransformControls）
- [ ] 调色板（颜色选择 UI）
- [ ] 撤销/重做（命令模式历史栈）
- [ ] 图层/分组（树形面板 + Group 管理）
- [ ] GLTF/GLB 导出（合并几何体 + 导出）
- [ ] 项目保存/打开（.avox 格式读写）

**目标**：用户可以通过固定大小方块搭建模型并导出为 GLTF

### Phase 8: 骨骼动画引擎 — 播放与编辑

> 详细设计见 [VOXEL_AND_ANIMATION_DESIGN.md](./VOXEL_AND_ANIMATION_DESIGN.md) 第四、七章节

- [ ] AnimationManager 核心（mixerMap/actionMap + KeyframeTrackFactory）
- [ ] 动画面板 UI（播放控制栏 + 动画列表选择器）
- [ ] 时间轴 Canvas（Dope Sheet 渲染 + 关键帧拖拽交互）
- [ ] 轨道树解析（Clip.tracks → 树形结构显示）
- [ ] 关键帧 CRUD（添加/删除/拖动 + 双向绑定到 Three.js Track）
- [ ] 播放头同步（Mixer 更新 → 播放头自动滚动）

**目标**：在 A3DE 内部可以加载带动画的模型、查看/编辑关键帧、播放预览

### Phase 9: 骨骼系统

> 详细设计见 [VOXEL_AND_ANIMATION_DESIGN.md](./VOXEL_AND_ANIMATION_DESIGN.md) 4.3.4 及第七章节

- [ ] SkeletonManager（骨骼 CRUD + 层级管理）
- [ ] 骨骼可视化（SkeletonHelper + 编辑面板）
- [ ] 从方块建模器 Group 自动生成骨骼
- [ ] SkinnedMesh 绑定（几何体 + 骨骼）
- [ ] 自动蒙皮权重（距离衰减算法）
- [ ] 骨骼变换 Gizmo（选中骨骼后姿态调整）

**目标**：可以为静态模型创建骨骼、绑定蒙皮、编辑骨骼动画

### Phase 10: 打磨与高级功能

- [ ] 曲线编辑器（贝塞尔插值可视化）
- [ ] 动画混合/过渡（crossfade + layer blend）
- [ ] 建模器多视图（正交三视图）
- [ ] 性能优化（Web Worker + GPU Picker）
- [ ] 资源库完善（缩略图生成/标签系统/搜索）

**目标**：完善体验，达到生产可用级别

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
   - .meta 文件系统设计

2. **[Godot Engine](https://godotengine.org/)**
   - 开源引擎
   - 场景系统和节点架构
   - .tscn 文本场景格式

### 项目格式相关库

1. **[JSZip](https://stuk.github.io/jszip/)**
   - JavaScript ZIP 处理库
   - 用于 .astra 压缩包的创建和解压

2. **[chokidar](https://github.com/paulmillr/chokidar)**
   - 跨平台文件监视库
   - 用于检测文件变更

3. **[file-saver](https://github.com/eligrey/FileSaver.js/)**
   - 客户端文件保存库
   - 用于导出项目文件

### 桌面打包相关

1. **[Electron](https://www.electronjs.org/)**
   - 跨平台桌面应用框架
   - 使用 Web 技术构建桌面应用
   - 生态成熟，文档完善

2. **[Tauri](https://tauri.app/)**
   - 轻量级桌面应用框架
   - 使用系统 WebView，体积更小
   - Rust 后端，性能优异

## 许可证

本项目将采用 GPL-3 开源许可证。
