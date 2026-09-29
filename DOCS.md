# Astra 3D Engine — 设计与策划文档

> **本文件汇总 Astra 3D Engine（A3DE）的核心设计与策划内容**，由项目原 `design/` 目录下的 5 份设计文档整合而来。涵盖：**项目策划、多场景系统、项目格式、脚本系统、方块建模器与骨骼动画引擎**。

## 目录

- [第一章 项目概述与策划案](#第一章-项目概述与策划案)
  - [1.1 项目概述](#11-项目概述)
  - [1.2 技术选型](#12-技术选型)
  - [1.3 核心架构设计](#13-核心架构设计)
  - [1.4 功能模块规划](#14-功能模块规划)
  - [1.5 技术挑战与解决方案](#15-技术挑战与解决方案)
  - [1.6 开发路线图](#16-开发路线图)
  - [1.7 参考开源项目](#17-参考开源项目)
- [第二章 多场景系统设计](#第二章-多场景系统设计)
  - [2.1 概述](#21-概述)
  - [2.2 数据结构设计](#22-数据结构设计)
  - [2.3 UI 设计](#23-ui-设计)
  - [2.4 核心功能实现](#24-核心功能实现)
  - [2.5 预制件系统适配](#25-预制件系统适配)
  - [2.6 文件存储格式](#26-文件存储格式)
  - [2.7 导出/导入适配](#27-导出导入适配)
  - [2.8 运行时支持](#28-运行时支持)
  - [2.9 实现步骤](#29-实现步骤)
  - [2.10 注意事项](#210-注意事项)
  - [2.11 总结](#211-总结)
- [第三章 项目格式设计](#第三章-项目格式设计)
  - [3.1 概述](#31-概述)
  - [3.2 主流引擎方案对比](#32-主流引擎方案对比)
  - [3.3 项目文件夹结构](#33-项目文件夹结构)
  - [3.4 核心文件格式定义](#34-核心文件格式定义)
  - [3.5 资源引用机制](#35-资源引用机制)
  - [3.6 压缩包格式（.astra）](#36-压缩包格式astra)
  - [3.7 保存策略](#37-保存策略)
  - [3.8 项目管理器实现](#38-项目管理器实现)
  - [3.9 版本控制集成](#39-版本控制集成)
  - [3.10 错误处理与恢复](#310-错误处理与恢复)
  - [3.11 性能优化与总结](#311-性能优化与总结)
- [第四章 脚本系统设计](#第四章-脚本系统设计)
  - [4.1 分层架构设计](#41-分层架构设计)
  - [4.2 Level 1：预设组件系统](#42-level-1预设组件系统)
  - [4.3 Level 2：积木编程系统](#43-level-2积木编程系统)
  - [4.4 Level 3：简化脚本系统](#44-level-3简化脚本系统)
  - [4.5 Level 4：JavaScript 脚本系统](#45-level-4javascript-脚本系统)
  - [4.6 事件系统设计](#46-事件系统设计)
  - [4.7 Inspector 面板集成](#47-inspector-面板集成)
  - [4.8 数据序列化](#48-数据序列化)
  - [4.9 实现优先级](#49-实现优先级)
  - [4.10 总结](#410-总结)
- [第五章 方块建模器与骨骼动画引擎](#第五章-方块建模器与骨骼动画引擎)
  - [5.1 愿景与定位](#51-愿景与定位)
  - [5.2 整体架构](#52-整体架构)
  - [5.3 模块 A：方块建模器（Voxel Editor）](#53-模块-a方块建模器voxel-editor)
  - [5.4 模块 B：骨骼动画引擎（Animation Engine）](#54-模块-b骨骼动画引擎animation-engine)
  - [5.5 Home 工作台](#55-home-工作台)
  - [5.6 技术选型总表](#56-技术选型总表)
  - [5.7 开发阶段规划](#57-开发阶段规划)
  - [5.8 风险与应对](#58-风险与应对)
  - [5.9 附录：Astral3D 蓝本参考文件](#59-附录astral3d-蓝本参考文件)

---
# 第一章 项目概述与策划案

## 1.1 项目概述

Astra 3D Engine 是一个基于Web的3D游戏引擎编辑器，灵感来源于Unity和Godot，专门用于制作网页3D小游戏。项目采用编辑器与运行时分离的架构设计，确保导出的游戏可以独立运行。

---

## 1.2 技术选型

### 核心渲染引擎

**推荐技术栈：Three.js + 自研编辑器框架**

| 引擎         | 优势                                                | 劣势                     |
| ------------ | --------------------------------------------------- | ------------------------ |
| **Three.js** | 生态最成熟、社区庞大、文档完善、与React/Vue集成良好 | 需要大量定制开发         |
| Babylon.js   | 功能完整、内置编辑器                                | 体积较大，定制灵活性较低 |
| PlayCanvas   | 云端协作、内置物理                                  | 商业依赖较强             |

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

## 1.3 核心架构设计

### 编辑器与运行时分离架构

这是最关键的设计决策，保证导出的游戏不依赖编辑器代码。

> **Home 工作台**（Phase 6+）：在编辑器上层增加统一入口，支持多工具界面切换（A3DE 编辑器、方块建模器、资源库等）。详见 [第五章 方块建模器与骨骼动画引擎](#第五章-方块建模器与骨骼动画引擎) 第二章。

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

## 1.4 关键功能模块规划

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

| 内容            | 位置                             | 获取方式                      |
| --------------- | -------------------------------- | ----------------------------- |
| 插件设置界面 UI | `src/i18n/plugin-settings/`      | `msg('pluginSettings.key')`   |
| 插件名称/描述   | `src/plugins/plugins/[id]/l10n/` | `pluginMsg(pluginId, 'name')` |
| 插件内部文本    | `src/plugins/plugins/[id]/l10n/` | `ctx.msg('key')`              |

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

> 详细设计见 [第五章 方块建模器与骨骼动画引擎](#第五章-方块建模器与骨骼动画引擎) 第三章节

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

> 详细设计见 [第五章 方块建模器与骨骼动画引擎](#第五章-方块建模器与骨骼动画引擎) 第四章节

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

> 详细设计见 [第五章 方块建模器与骨骼动画引擎](#第五章-方块建模器与骨骼动画引擎) 第五章节

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

## 1.5 技术挑战与解决方案

| 挑战                              | 解决方案                                                               |
| --------------------------------- | ---------------------------------------------------------------------- |
| **性能**：编辑器占用资源大        | 使用Web Workers处理非UI任务                                            |
| **精度**：浮点误差                | 使用高精度数学库（如gl-matrix）                                        |
| **兼容性**：浏览器差异            | 抽象WebGL上下文，统一API                                               |
| **资源加载**：大模型卡顿          | 异步加载 + 进度条 + LOD                                                |
| **持久化**：场景数据存储          | [第三章 项目格式设计](#第三章-项目格式设计)：文件夹结构 + .astra 压缩包 |
| **物理同步**：Web端物理引擎不稳定 | 内置确定性物理模式选项                                                 |

### 运行时优化考虑

- [ ] 对象池复用
- [ ] 视锥剔除（Frustum Culling）
- [ ] 遮挡剔除（Occlusion Culling）
- [ ] 材质合并
- [ ] WebGL 2.0特性利用
- [ ] 实例化渲染（Instancing）

---

## 1.6 开发路线图

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
- [x] 多场景系统（详见 [第二章 多场景系统设计](#第二章-多场景系统设计)）
  - [x] 状态结构改造（scenes 数组 + currentSceneId）
  - [x] 场景面板独立化（ScenePanel.jsx）
  - [x] 场景 CRUD 操作（新建、删除、重命名、设置主场景）
  - [x] 场景切换功能
  - [x] 项目格式升级（向后兼容）
  - [x] Undo/Redo 系统适配
  - [ ] 场景设置面板（ambientLight、backgroundColor、fog 等）
  - [ ] 场景导出为独立 .scene 文件
  - [ ] 场景间资源共享（预制件、资源）
  - [ ] 场景快速切换快捷键
  - [ ] 场景预览缩略图
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
- [x] Cube 贴图应用到特定面
- [x] 模型层级结构保留
- [x] 光源系统（点光源、方向光、聚光灯）
- [x] 光渲染开关（F1 快捷键，开关状态持久化）
- [x] 导入文件夹支持
- [x] 素材栏多排布局
- [x] 版本号元数据文件（src/meta.js）
- [x] 面板布局占比方式（场景面板、预制件面板）

**项目格式设计**（详见 [第三章 项目格式设计](#第三章-项目格式设计)）：

- [ ] 项目文件夹结构实现
- [x] 场景文件序列化（JSON格式，多场景支持）
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
- [x] 光照系统（基础光源：点光源、方向光、聚光灯）
- [x] 阴影系统（完整实现：所有物体和光源支持阴影，导入模型支持阴影）

**目标**：能够创建可交互的3D游戏场景

### Phase 4: 高级功能

- [ ] 脚本编码（查看[第四章 脚本系统设计](#第四章-脚本系统设计)）
- [ ] 光照系统高级功能（烘焙、阴影）
- [ ] 地形系统
- [ ] 粒子系统
- [ ] 动画系统（详见 [第五章 方块建模器与骨骼动画引擎](#第五章-方块建模器与骨骼动画引擎)）
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

> 详细设计见 [第五章 方块建模器与骨骼动画引擎](#第五章-方块建模器与骨骼动画引擎) 第五、七章节

- [ ] Home 工作台框架（React Router 多页面布局）
- [ ] A3DE 编辑器路由迁移（嵌入 /editor 路由）
- [ ] 全局资源库骨架（存储目录 + 索引文件 + CRUD API）
- [ ] 资源库 UI（缩略图、标签、搜索）

**目标**：统一入口，支持多工具界面切换，建立跨项目资源共享机制

### Phase 7: 方块建模器（Voxel Editor MVP）

> 详细设计见 [第五章 方块建模器与骨骼动画引擎](#第五章-方块建模器与骨骼动画引擎) 第三、七章节

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

> 详细设计见 [第五章 方块建模器与骨骼动画引擎](#第五章-方块建模器与骨骼动画引擎) 第四、七章节

- [ ] AnimationManager 核心（mixerMap/actionMap + KeyframeTrackFactory）
- [ ] 动画面板 UI（播放控制栏 + 动画列表选择器）
- [ ] 时间轴 Canvas（Dope Sheet 渲染 + 关键帧拖拽交互）
- [ ] 轨道树解析（Clip.tracks → 树形结构显示）
- [ ] 关键帧 CRUD（添加/删除/拖动 + 双向绑定到 Three.js Track）
- [ ] 播放头同步（Mixer 更新 → 播放头自动滚动）

**目标**：在 A3DE 内部可以加载带动画的模型、查看/编辑关键帧、播放预览

### Phase 9: 骨骼系统

> 详细设计见 [第五章 方块建模器与骨骼动画引擎](#第五章-方块建模器与骨骼动画引擎) 4.3.4 及第七章节

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

## 1.7 可参考的开源项目

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

## 1.8 许可证

本项目将采用 GPL-3 开源许可证。


---
# 第二章 多场景系统设计

## 2.1 概述

多场景系统是 Astra 3D Engine 的核心功能之一，允许用户在一个项目中创建、管理和切换多个场景。这对于制作多关卡游戏、分离 UI 场景、管理大型项目至关重要。

### 设计目标

- **场景隔离**：每个场景独立管理自己的对象层级
- **快速切换**：场景切换流畅，不丢失数据
- **主场景标识**：标记游戏启动时加载的场景
- **持久化支持**：每个场景单独保存为 `.scene` 文件
- **资源共享**：所有场景共享同一个资源库（assets）

---

## 2.2 数据结构设计

### 2.1 当前状态（单场景）

```javascript
// App.jsx 当前结构
const [sceneObjects, setSceneObjects] = useState([]);
```

### 2.2 新状态结构（多场景）

```javascript
// 场景数组
const [scenes, setScenes] = useState([
  {
    id: 'scene-main-001', // 场景唯一标识
    name: 'Main Scene', // 场景名称
    objects: [], // 场景中的对象列表
    isMain: true, // 是否为主场景
    createdAt: '2026-06-15T10:00:00Z',
    updatedAt: '2026-06-15T15:30:00Z',
    settings: {
      // 场景设置
      ambientLight: { color: '#ffffff', intensity: 0.5 },
      backgroundColor: '#1a1a2e',
      fog: { enabled: false },
    },
  },
]);

// 当前激活的场景 ID
const [currentSceneId, setCurrentSceneId] = useState('scene-main-001');

// 获取当前场景（计算属性）
const currentScene = scenes.find((s) => s.id === currentSceneId);
const sceneObjects = currentScene?.objects || [];
```

### 2.3 场景对象结构

每个场景中的对象保持现有结构不变：

```javascript
{
  id: 'obj-001',
  name: 'Player',
  type: 'cube',
  position: [0, 1, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
  children: [],
  // ... 其他属性
}
```

---

## 2.3 UI 设计

### 3.1 场景选择器

在层级面板（HierarchyPanel）顶部添加场景选择器：

`┌─────────────────────────────────┐
│ ┌─────────────────────┐ ┌───┐   │
│ │ Main Scene        ▼ │ │ + │   │  ← 场景下拉 + 新建按钮
│ └─────────────────────┘ └───┘   │
├─────────────────────────────────┤
│ 📂 Main Scene          ⭐       │  ← 主场景标识（星号）
│ ├─ 🎲 Player                    │
│ ├─ 🎲 Enemies                   │
│ └─ 💡 Directional Light         │
├─────────────────────────────────┤
│ [+] Add Object                  │  ← 添加对象按钮
└─────────────────────────────────┘`

### 3.2 场景下拉菜单内容

点击场景下拉菜单显示：

`┌─────────────────────────────────┐
│ ⭐ Main Scene                   │  ← 主场景（带星号）
│   Level 1                       │
│   Level 2                       │
│   UI Scene                      │
│ ─────────────────────           │  ← 分隔线
│ + New Scene                     │  ← 新建场景
└─────────────────────────────────┘`

### 3.3 场景右键菜单

右键点击场景项显示：

`┌─────────────────────────────────┐
│ Rename                          │
│ Duplicate                       │
│ Set as Main Scene               │  ← 仅非主场景显示
│ ─────────────────────           │
│ Delete                          │  ← 主场景不可删除
└─────────────────────────────────┘`

---

## 2.4 核心功能实现

### 4.1 场景 CRUD 操作

#### 新建场景

```javascript
const handleCreateScene = useCallback(() => {
  const newId = `scene-${Date.now()}`;
  const newScene = {
    id: newId,
    name: `Scene ${scenes.length + 1}`,
    objects: [],
    isMain: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: getDefaultSceneSettings(),
  };

  setScenes((prev) => [...prev, newScene]);
  setCurrentSceneId(newId);
}, [scenes.length]);
```

#### 删除场景

```javascript
const handleDeleteScene = useCallback(
  (sceneId) => {
    const scene = scenes.find((s) => s.id === sceneId);

    // 主场景不可删除
    if (scene?.isMain) {
      showToast('Cannot delete main scene', 'error');
      return;
    }

    // 至少保留一个场景
    if (scenes.length <= 1) {
      showToast('Must keep at least one scene', 'error');
      return;
    }

    setScenes((prev) => prev.filter((s) => s.id !== sceneId));

    // 如果删除的是当前场景，切换到主场景
    if (currentSceneId === sceneId) {
      const mainScene = scenes.find((s) => s.isMain);
      setCurrentSceneId(mainScene?.id || scenes[0].id);
    }
  },
  [scenes, currentSceneId]
);
```

#### 重命名场景

```javascript
const handleRenameScene = useCallback((sceneId, newName) => {
  setScenes((prev) =>
    prev.map((s) =>
      s.id === sceneId ? { ...s, name: newName, updatedAt: new Date().toISOString() } : s
    )
  );
}, []);
```

#### 设置主场景

```javascript
const handleSetMainScene = useCallback((sceneId) => {
  setScenes((prev) =>
    prev.map((s) => ({
      ...s,
      isMain: s.id === sceneId,
      updatedAt: s.id === sceneId ? new Date().toISOString() : s.updatedAt,
    }))
  );
}, []);
```

### 4.2 场景切换逻辑

```javascript
const handleSwitchScene = useCallback(
  (newSceneId) => {
    // 1. 检查当前场景是否有未保存更改
    if (hasUnsavedChanges) {
      // 自动保存当前场景
      saveCurrentScene();
    }

    // 2. 切换到新场景
    setCurrentSceneId(newSceneId);

    // 3. 清空选中状态
    setSelectedObject(null);
    setSelectedObjects([]);

    // 4. 视口会自动重新渲染（因为 sceneObjects 变化）
  },
  [hasUnsavedChanges, currentSceneId]
);
```

### 4.3 对象操作适配

所有对象操作需要针对当前场景进行：

```javascript
// 添加对象
const handleAddObject = useCallback(
  (type) => {
    const newObject = createObject(type);

    setScenes((prev) =>
      prev.map((s) =>
        s.id === currentSceneId
          ? { ...s, objects: [...s.objects, newObject], updatedAt: new Date().toISOString() }
          : s
      )
    );
  },
  [currentSceneId]
);

// 更新对象
const handleUpdateObject = useCallback(
  (objectId, updates) => {
    setScenes((prev) =>
      prev.map((s) =>
        s.id === currentSceneId
          ? {
              ...s,
              objects: s.objects.map((obj) => (obj.id === objectId ? { ...obj, ...updates } : obj)),
              updatedAt: new Date().toISOString(),
            }
          : s
      )
    );
  },
  [currentSceneId]
);

// 删除对象
const handleDeleteObject = useCallback(
  (objectId) => {
    setScenes((prev) =>
      prev.map((s) =>
        s.id === currentSceneId
          ? {
              ...s,
              objects: s.objects.filter((obj) => obj.id !== objectId),
              updatedAt: new Date().toISOString(),
            }
          : s
      )
    );
  },
  [currentSceneId]
);
```

---

## 2.5 预制件系统适配

预制件（Prefab）是跨场景共享的资源，不存储在场景中：

```javascript
// 预制件独立管理，不属于任何场景
const [prefabs, setPrefabs] = useState([]);

// 实例化预制件到当前场景
const handleInstantiatePrefab = useCallback(
  (prefabId) => {
    const prefab = prefabs.find((p) => p.id === prefabId);
    if (!prefab) return;

    const instance = createPrefabInstance(prefab);

    setScenes((prev) =>
      prev.map((s) =>
        s.id === currentSceneId
          ? { ...s, objects: [...s.objects, instance], updatedAt: new Date().toISOString() }
          : s
      )
    );
  },
  [prefabs, currentSceneId]
);
```

---

## 2.6 文件存储格式

### 6.1 项目文件夹结构

`MyProject/
├── project.json              # 项目元数据（包含 mainScene 字段）
├── scenes/                   # 场景文件目录
│   ├── main.scene           # 主场景
│   ├── level1.scene         # 关卡1
│   ├── level2.scene         # 关卡2
│   └── ui.scene             # UI场景
├── assets/                   # 共享资源目录
│   ├── models/
│   ├── textures/
│   └── prefabs/
└── settings.json             # 编辑器设置`

### 6.2 project.json 更新

```json
{
  "version": "1.0.0",
  "name": "My Game",
  "mainScene": "scene-main-001", // 主场景 ID
  "scenes": [
    { "id": "scene-main-001", "file": "scenes/main.scene" },
    { "id": "scene-level1", "file": "scenes/level1.scene" },
    { "id": "scene-ui", "file": "scenes/ui.scene" }
  ],
  "createdAt": "2026-06-15T10:00:00Z",
  "updatedAt": "2026-06-15T15:30:00Z"
}
```

### 6.3 单个场景文件格式

```json
{
  "version": "1.0.0",
  "id": "scene-main-001",
  "name": "Main Scene",
  "isMain": true,
  "createdAt": "2026-06-15T10:00:00Z",
  "updatedAt": "2026-06-15T15:30:00Z",

  "settings": {
    "ambientLight": { "color": "#ffffff", "intensity": 0.5 },
    "backgroundColor": "#1a1a2e",
    "fog": { "enabled": false }
  },

  "objects": [
    { "id": "obj-001", "name": "Player", "type": "cube", ... },
    { "id": "obj-002", "name": "Enemy", "type": "sphere", ... }
  ]
}
```

---

## 2.7 导出/导入适配

### 7.1 导出项目 (.astra)

```javascript
async function exportProjectAsAstra(scenes, assets, projectMeta) {
  const zip = new JSZip();

  // 1. 添加项目元数据
  zip.file('project.json', JSON.stringify(projectMeta, null, 2));

  // 2. 添加所有场景文件
  for (const scene of scenes) {
    const sceneData = serializeScene(scene);
    zip.file(`scenes/${scene.id}.scene`, JSON.stringify(sceneData, null, 2));
  }

  // 3. 添加资源文件
  for (const asset of assets) {
    // ... 添加资源
  }

  // 4. 生成压缩包
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  return blob;
}
```

### 7.2 导入项目 (.astra)

```javascript
async function importProjectFromAstra(astraFile) {
  const zip = await JSZip.loadAsync(astraFile);

  // 1. 读取项目元数据
  const projectMeta = JSON.parse(await zip.file('project.json').async('string'));

  // 2. 读取所有场景
  const scenes = [];
  for (const sceneInfo of projectMeta.scenes) {
    const sceneData = JSON.parse(await zip.file(sceneInfo.file).async('string'));
    scenes.push(deserializeScene(sceneData));
  }

  // 3. 读取资源
  const assets = [];
  // ... 读取资源

  return { projectMeta, scenes, assets };
}
```

---

## 2.8 运行时支持

### 8.1 游戏启动流程

```javascript
// 运行时加载主场景
async function startGame(project) {
  // 1. 找到主场景
  const mainScene = project.scenes.find((s) => s.id === project.mainScene);

  // 2. 加载主场景
  await loadScene(mainScene);

  // 3. 启动游戏循环
  gameLoop.start();
}
```

### 8.2 场景切换（运行时）

```javascript
// 游戏运行时切换场景
async function loadSceneById(sceneId) {
  // 1. 清理当前场景
  clearCurrentScene();

  // 2. 加载新场景
  const sceneData = await fetchScene(sceneId);
  await loadScene(sceneData);

  // 3. 触发场景加载事件
  onSceneLoaded(sceneId);
}
```

---

## 2.9 实现步骤

### Phase 1: 状态结构改造

1. 修改 `App.jsx`，将 `sceneObjects` 改为 `scenes` 数组
2. 添加 `currentSceneId` 状态
3. 创建计算属性获取当前场景对象

### Phase 2: UI 实现

1. 在 `HierarchyPanel.jsx` 顶部添加场景选择器
2. 创建场景下拉菜单组件
3. 实现场景右键菜单

### Phase 3: 场景操作

1. 实现新建场景功能
2. 实现删除场景功能
3. 实现重命名场景功能
4. 实现设置主场景功能
5. 实现场景切换逻辑

### Phase 4: 对象操作适配

1. 修改所有对象操作函数，针对当前场景
2. 修改 Undo/Redo 系统，支持场景维度
3. 修改复制粘贴，限制在同一场景内

### Phase 5: 持久化

1. 修改项目导出，支持多场景文件
2. 修改项目导入，支持多场景文件
3. 实现场景单独保存/加载

### Phase 6: 运行时支持

1. 修改 Play 模式，从主场景启动
2. 添加运行时场景切换 API

---

## 2.10 注意事项

### 10.1 性能考虑

- 场景切换时，只加载当前场景的对象
- 大型项目使用懒加载，不一次性加载所有场景
- 场景切换动画可选（淡入淡出）

### 10.2 数据安全

- 切换场景前检查未保存更改
- 删除场景前确认提示
- 主场景不可删除

### 10.3 资源共享

- 所有场景共享同一个 assets 资源库
- 预制件不属于任何场景，可跨场景实例化
- GUID 引用机制确保资源引用稳定

---

## 2.11 总结

多场景系统是 Astra 3D Engine 从单场景编辑器升级为完整游戏引擎的关键功能。通过合理的 UI 设计、数据结构改造和持久化支持，用户可以轻松管理多关卡游戏、分离 UI 场景，为后续的游戏运行时打下基础。


---
# 第三章 项目格式设计

## 概述

本文档定义 Astra 3D Engine 项目的存储格式、文件结构和序列化机制。设计目标是：

- **开发友好**：文件夹结构便于编辑和版本控制
- **分享便捷**：支持导出为单一压缩包文件
- **增量保存**：只保存修改的部分，提升性能
- **引用稳定**：资源移动后引用不断

---

## 3.1 主流引擎方案对比

| 引擎        | 格式                    | 优点                             | 缺点                       |
| ----------- | ----------------------- | -------------------------------- | -------------------------- |
| **Unity**   | 文件夹 + .meta 文件     | Git 友好、增量保存、资源引用清晰 | 分享需打包、文件分散       |
| **Godot**   | 文件夹 + .tscn 文本场景 | 文本格式可读、Git 冲突易解决     | 分享需打包、文件分散       |
| **Blender** | 单文件 .blend           | 便于分享、自包含                 | 大文件性能差、无法增量保存 |
| **Unreal**  | .uproject + Content/    | 功能强大、资源管理完善           | 复杂、体积大               |

**Astra 采用方案**：开发阶段使用文件夹结构，分享时导出为 `.astra` 压缩包。

---

## 3.2 项目文件夹结构

```
MyProject/
├── project.json              # 项目元数据
├── settings.json             # 编辑器设置
│
├── scenes/                   # 场景文件目录
│   ├── main.scene           # 主场景
│   ├── level1.scene         # 关卡场景
│   └── ui.scene             # UI 场景
│
├── assets/                   # 资源文件目录
│   ├── models/              # 3D 模型
│   │   ├── character.glb
│   │   └── character.glb.meta
│   │
│   ├── textures/            # 纹理图片
│   │   ├── wood.png
│   │   └── wood.png.meta
│   │
│   ├── materials/           # 材质定义
│   │   └── wood_mat.json
│   │
│   ├── prefabs/             # 预制件
│   │   └── player.prefab
│   │
│   └── scripts/             # 脚本文件
│       └── player.js
│
├── library/                  # 缓存目录（不纳入版本控制）
│   ├── thumbnails/          # 预览缩略图
│   ├── imported/            # 导入后的优化资源
│   └── cache.json           # 缓存索引
│
└── build/                    # 构建输出目录
    └── web/
```

---

## 3.3 核心文件格式定义

### 3.1 项目元数据 (project.json)

```json
{
  "version": "1.0.0",
  "engineVersion": "0.1.0",
  "name": "My Game Project",
  "description": "A sample 3D game",
  "author": "Developer Name",
  "createdAt": "2026-05-17T10:00:00Z",
  "updatedAt": "2026-05-17T15:30:00Z",
  "mainScene": "main",
  "buildSettings": {
    "target": "web",
    "resolution": [1280, 720],
    "fullscreen": false
  }
}
```

### 3.2 编辑器设置 (settings.json)

```json
{
  "editor": {
    "theme": "dark",
    "language": "zh-CN",
    "autoSave": true,
    "autoSaveInterval": 300000
  },
  "viewport": {
    "gridVisible": true,
    "axesVisible": true,
    "cameraSpeed": 1.0
  },
  "layout": {
    "leftSidebarWidth": 250,
    "rightSidebarWidth": 300,
    "bottomPanelHeight": 200,
    "collapsedPanels": ["assets"]
  }
}
```

### 3.3 场景文件格式 (*.scene)

```json
{
  "version": "1.0.0",
  "id": "scene-main-001",
  "name": "Main Scene",
  "description": "The main game scene",

  "settings": {
    "ambientLight": {
      "color": "#ffffff",
      "intensity": 0.5
    },
    "backgroundColor": "#1a1a2e",
    "fog": {
      "enabled": false,
      "type": "linear",
      "color": "#ffffff",
      "near": 10,
      "far": 100
    }
  },

  "objects": [
    {
      "id": "obj-001",
      "name": "Player",
      "type": "group",
      "active": true,
      "transform": {
        "position": [0, 1, 0],
        "rotation": [0, 0, 0],
        "scale": [1, 1, 1]
      },
      "children": ["obj-002", "obj-003"],
      "components": [
        {
          "type": "MeshRenderer",
          "mesh": "guid://a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          "material": "guid://b2c3d4e5-f6a7-8901-bcde-f12345678901"
        },
        {
          "type": "Rigidbody",
          "mass": 1.0,
          "useGravity": true,
          "constraints": {
            "positionX": false,
            "positionY": false,
            "positionZ": false,
            "rotationX": true,
            "rotationY": false,
            "rotationZ": true
          }
        }
      ],
      "scripts": ["guid://c3d4e5f6-a7b8-9012-cdef-123456789012"]
    },
    {
      "id": "obj-002",
      "name": "Player Mesh",
      "type": "mesh",
      "transform": {
        "position": [0, 0, 0],
        "rotation": [0, 0, 0],
        "scale": [1, 1, 1]
      },
      "children": [],
      "components": []
    }
  ],

  "cameras": [
    {
      "id": "cam-001",
      "name": "Main Camera",
      "type": "perspective",
      "active": true,
      "transform": {
        "position": [0, 5, 10],
        "rotation": [-15, 0, 0],
        "scale": [1, 1, 1]
      },
      "properties": {
        "fov": 60,
        "near": 0.1,
        "far": 1000,
        "aspectRatio": "auto"
      }
    }
  ],

  "lights": [
    {
      "id": "light-001",
      "name": "Directional Light",
      "type": "directional",
      "transform": {
        "position": [0, 10, 0],
        "rotation": [-45, 30, 0],
        "scale": [1, 1, 1]
      },
      "properties": {
        "color": "#ffffff",
        "intensity": 1.0,
        "castShadow": true,
        "shadowResolution": 1024
      }
    }
  ]
}
```

### 3.4 资源元数据文件 (*.meta)

每个资源文件都有对应的 `.meta` 文件，存储 GUID 和导入设置：

```json
{
  "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "createdAt": "2026-05-17T10:00:00Z",
  "updatedAt": "2026-05-17T15:30:00Z",
  "importSettings": {
    "scale": 1.0,
    "generateNormals": true,
    "flipUVs": false,
    "animationImport": true,
    "compressMesh": true
  },
  "preview": {
    "thumbnailPath": "library/thumbnails/a1b2c3d4.png",
    "vertexCount": 1234,
    "triangleCount": 567
  }
}
```

### 3.5 材质文件格式 (*.json)

```json
{
  "version": "1.0.0",
  "guid": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "name": "Wood Material",
  "type": "standard",
  "properties": {
    "albedo": {
      "type": "texture",
      "value": "guid://d4e5f6a7-b8c9-0123-def1-234567890123"
    },
    "albedoColor": "#ffffff",
    "metallic": 0.0,
    "roughness": 0.8,
    "normalMap": {
      "type": "texture",
      "value": "guid://e5f6a7b8-c9d0-1234-ef12-345678901234"
    },
    "emissive": {
      "type": "color",
      "value": "#000000"
    },
    "emissiveIntensity": 0.0
  }
}
```

### 3.6 预制件文件格式 (*.prefab)

```json
{
  "version": "1.0.0",
  "guid": "f6a7b8c9-d0e1-2345-f123-456789012345",
  "name": "Player Prefab",
  "description": "Player character with physics",
  "root": {
    "id": "prefab-root",
    "name": "Player",
    "type": "group",
    "transform": {
      "position": [0, 0, 0],
      "rotation": [0, 0, 0],
      "scale": [1, 1, 1]
    },
    "children": ["prefab-mesh", "prefab-collider"],
    "components": [
      {
        "type": "Rigidbody",
        "mass": 1.0,
        "useGravity": true
      }
    ]
  },
  "variants": [
    {
      "id": ["prefab-mesh"],
      "overrides": {
        "components": [
          {
            "type": "MeshRenderer",
            "mesh": "guid://a1b2c3d4-e5f6-7890-abcd-ef1234567890"
          }
        ]
      }
    }
  ]
}
```

---

## 3.4 资源引用机制

### 4.1 GUID 引用系统

使用 GUID（全局唯一标识符）而非文件路径引用资源，确保资源移动后引用不断：

```
路径引用（不推荐）：
"mesh": "assets/models/character.glb"

GUID 引用（推荐）：
"mesh": "guid://a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

### 4.2 引用解析流程

```
1. 编辑器加载项目
2. 扫描所有 .meta 文件，建立 GUID -> 路径 映射表
3. 解析场景文件时，将 GUID 引用解析为实际资源
4. 资源移动时，只更新 .meta 文件路径，GUID 不变
```

### 4.3 引用完整性检查

```javascript
class ReferenceValidator {
  validate(project) {
    const errors = [];
    const guidMap = this.buildGuidMap(project);

    for (const scene of project.scenes) {
      for (const ref of this.extractReferences(scene)) {
        if (!guidMap.has(ref.guid)) {
          errors.push({
            type: 'missing_reference',
            scene: scene.id,
            reference: ref.guid,
            message: `Missing reference: ${ref.guid} in scene ${scene.name}`,
          });
        }
      }
    }

    return errors;
  }
}
```

---

## 3.5 压缩包格式 (.astra)

### 5.1 格式定义

`.astra` 文件本质是标准 ZIP 压缩包，可用解压软件打开：

```
MyProject.astra
├── project.json
├── settings.json
├── scenes/
│   ├── main.scene
│   └── level1.scene
├── assets/
│   ├── models/
│   ├── textures/
│   └── materials/
├── manifest.json        # 资源清单和校验
└── README.txt           # 项目说明
```

### 5.2 清单文件 (manifest.json)

```json
{
  "version": "1.0.0",
  "createdAt": "2026-05-17T15:30:00Z",
  "files": [
    {
      "path": "project.json",
      "hash": "sha256:abc123...",
      "size": 512
    },
    {
      "path": "scenes/main.scene",
      "hash": "sha256:def456...",
      "size": 2048
    }
  ],
  "statistics": {
    "totalFiles": 25,
    "totalSize": 15728640,
    "sceneCount": 2,
    "assetCount": 15
  }
}
```

### 5.3 压缩选项

```javascript
const exportOptions = {
  compression: 'DEFLATE', // 压缩算法
  compressionLevel: 6, // 压缩级别 (1-9)
  includeLibrary: false, // 是否包含缓存
  includeBuild: false, // 是否包含构建输出
  encryptAssets: false, // 是否加密资源
  password: null, // 加密密码
};
```

---

## 3.6 保存策略

### 6.1 增量保存机制

| 操作          | 保存策略                  | 性能   |
| ------------- | ------------------------- | ------ |
| 修改对象属性  | 只保存当前场景文件        | ~10ms  |
| 添加/删除对象 | 保存当前场景文件          | ~10ms  |
| 切换场景      | 保存当前场景，加载新场景  | ~100ms |
| 导入资源      | 写入资源文件 + 生成 .meta | ~100ms |
| 项目设置变更  | 保存 settings.json        | ~5ms   |

### 6.2 自动保存

```javascript
class AutoSaveManager {
  constructor(projectManager, interval = 300000) {
    this.projectManager = projectManager;
    this.interval = interval;
    this.pendingChanges = new Set();
    this.timer = null;
  }

  markDirty(sceneId) {
    this.pendingChanges.add(sceneId);
    this.scheduleSave();
  }

  scheduleSave() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.interval);
  }

  async flush() {
    for (const sceneId of this.pendingChanges) {
      await this.projectManager.saveScene(sceneId);
    }
    this.pendingChanges.clear();
  }
}
```

### 6.3 保存队列

```javascript
class SaveQueue {
  constructor() {
    this.queue = [];
    this.saving = false;
  }

  enqueue(task) {
    this.queue.push(task);
    this.process();
  }

  async process() {
    if (this.saving || this.queue.length === 0) return;

    this.saving = true;
    const task = this.queue.shift();

    try {
      await task.execute();
    } catch (error) {
      console.error('Save failed:', error);
    }

    this.saving = false;
    this.process();
  }
}
```

---

## 3.7 项目管理器实现

### 7.1 核心类设计

```javascript
class ProjectManager {
  constructor() {
    this.projectPath = null;
    this.projectMeta = null;
    this.scenes = new Map();
    this.assets = new Map();
    this.guidMap = new Map();
    this.autoSave = null;
  }

  // 创建新项目
  async createProject(name, path) {
    this.projectPath = path;
    this.projectMeta = {
      version: '1.0.0',
      engineVersion: ENGINE_VERSION,
      name: name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mainScene: 'main',
    };

    await this.ensureDirectory(path);
    await this.saveProjectMeta();
    await this.createDefaultScene();

    return this;
  }

  // 打开项目
  async openProject(path) {
    this.projectPath = path;

    // 加载项目元数据
    this.projectMeta = await this.loadJson('project.json');

    // 构建 GUID 映射表
    await this.buildGuidMap();

    // 加载主场景
    await this.loadScene(this.projectMeta.mainScene);

    // 启动自动保存
    this.autoSave = new AutoSaveManager(this);

    return this;
  }

  // 保存场景
  async saveScene(sceneId) {
    const scene = this.scenes.get(sceneId);
    if (!scene) throw new Error(`Scene not found: ${sceneId}`);

    const sceneData = this.serializeScene(scene);
    await this.writeJson(`scenes/${sceneId}.scene`, sceneData);

    scene.dirty = false;
  }

  // 导出项目为压缩包
  async exportProject(outputPath, options = {}) {
    const zip = new JSZip();

    // 添加项目文件
    zip.file('project.json', JSON.stringify(this.projectMeta, null, 2));

    // 添加场景
    for (const [id, scene] of this.scenes) {
      zip.file(`scenes/${id}.scene`, JSON.stringify(scene, null, 2));
    }

    // 添加资源
    for (const [guid, asset] of this.assets) {
      const content = await this.readFile(asset.path);
      zip.file(asset.relativePath, content);

      if (asset.meta) {
        zip.file(`${asset.relativePath}.meta`, JSON.stringify(asset.meta, null, 2));
      }
    }

    // 生成清单
    const manifest = await this.generateManifest(zip);
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    // 生成压缩包
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: options.compression || 'DEFLATE',
      compressionOptions: { level: options.compressionLevel || 6 },
    });

    await saveAs(blob, outputPath);
  }

  // 导入压缩包项目
  async importProject(astraPath, targetPath) {
    const buffer = await this.readFile(astraPath);
    const zip = await JSZip.loadAsync(buffer);

    this.projectPath = targetPath;
    await this.ensureDirectory(targetPath);

    // 解压所有文件
    for (const [path, file] of Object.entries(zip.files)) {
      if (file.dir) continue;

      const content = await file.async('blob');
      await this.writeFile(path, content);
    }

    // 验证完整性
    const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
    await this.validateManifest(manifest);

    // 打开项目
    return this.openProject(targetPath);
  }

  // 构建 GUID 映射表
  async buildGuidMap() {
    this.guidMap.clear();

    const metaFiles = await this.glob('**/*.meta');

    for (const metaPath of metaFiles) {
      const meta = await this.loadJson(metaPath);
      const assetPath = metaPath.replace('.meta', '');

      this.guidMap.set(meta.guid, {
        path: assetPath,
        meta: meta,
      });
    }
  }

  // 解析 GUID 引用
  resolveReference(ref) {
    if (typeof ref !== 'string' || !ref.startsWith('guid://')) {
      return ref;
    }

    const guid = ref.replace('guid://', '');
    const entry = this.guidMap.get(guid);

    if (!entry) {
      console.warn(`Unresolved reference: ${guid}`);
      return null;
    }

    return entry.path;
  }
}
```

---

## 3.8 版本控制集成

### 8.1 .gitignore 配置

```gitignore
# 缓存目录
library/

# 构建输出
build/

# 编辑器临时文件
*.tmp
*.bak

# 系统文件
.DS_Store
Thumbs.db
```

### 8.2 文件变更检测

```javascript
class FileWatcher {
  constructor(projectPath) {
    this.watcher = null;
    this.handlers = new Map();
  }

  start() {
    this.watcher = chokidar.watch(this.projectPath, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
    });

    this.watcher
      .on('add', (path) => this.handleChange('add', path))
      .on('change', (path) => this.handleChange('change', path))
      .on('unlink', (path) => this.handleChange('unlink', path));
  }

  handleChange(event, path) {
    const handler = this.handlers.get(event);
    if (handler) handler(path);
  }

  on(event, handler) {
    this.handlers.set(event, handler);
  }
}
```

---

## 3.9 错误处理与恢复

### 9.1 保存失败处理

```javascript
class SaveErrorHandler {
  async handle(error, context) {
    switch (error.code) {
      case 'ENOSPC':
        return this.handleDiskFull(context);
      case 'EACCES':
        return this.handlePermissionDenied(context);
      case 'EISDIR':
        return this.handleInvalidPath(context);
      default:
        return this.handleUnknown(error, context);
    }
  }

  async handleDiskFull(context) {
    const action = await dialog.showMessageBox({
      type: 'error',
      title: '磁盘空间不足',
      message: '无法保存项目，磁盘空间不足。',
      buttons: ['清理缓存', '取消'],
    });

    if (action === 0) {
      await this.clearCache();
      return context.retry();
    }
  }
}
```

### 9.2 自动备份

```javascript
class BackupManager {
  constructor(projectManager, maxBackups = 5) {
    this.projectManager = projectManager;
    this.maxBackups = maxBackups;
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `backups/${timestamp}.astra`;

    await this.projectManager.exportProject(backupPath);
    await this.cleanOldBackups();
  }

  async cleanOldBackups() {
    const backups = await this.listBackups();

    if (backups.length > this.maxBackups) {
      const toDelete = backups.slice(0, backups.length - this.maxBackups);
      for (const backup of toDelete) {
        await this.deleteFile(backup);
      }
    }
  }
}
```

---

## 3.10 性能优化

### 10.1 大型项目处理

| 策略         | 描述                 |
| ------------ | -------------------- |
| 懒加载场景   | 只加载当前编辑的场景 |
| 资源预览缓存 | 缩略图单独存储       |
| 增量序列化   | 只序列化变更的对象   |
| Web Worker   | 后台保存，不阻塞 UI  |

### 10.2 资源导入优化

```javascript
class AssetImporter {
  async import(filePath) {
    // 1. 在 Web Worker 中处理
    const worker = new Worker('import-worker.js');

    // 2. 生成缩略图
    const thumbnail = await this.generateThumbnail(filePath);

    // 3. 优化资源（压缩、LOD 等）
    const optimized = await this.optimize(filePath);

    // 4. 生成 .meta 文件
    const meta = {
      guid: generateGuid(),
      importSettings: this.defaultSettings,
      preview: { thumbnailPath: thumbnail },
    };

    return { asset: optimized, meta };
  }
}
```

---

## 3.11 总结

| 场景         | 方案                   |
| ------------ | ---------------------- |
| **本地开发** | 文件夹结构 + JSON 格式 |
| **版本控制** | Git + .gitignore       |
| **分享项目** | 导出为 .astra 压缩包   |
| **自动保存** | 增量保存 + 定时触发    |
| **资源引用** | GUID 系统              |
| **错误恢复** | 自动备份 + 错误处理    |

此设计兼顾了开发效率、版本控制友好性和分享便捷性，适合 Web 端 3D 游戏引擎的使用场景。


---
# 第四章 脚本系统设计

## 概述

本文档详细描述了 Astra 3D Engine 的脚本系统设计，采用分层架构，让不同水平的用户都能轻松上手。

---

## 4.1 分层架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    Level 1: 预设组件                      │
│         拖拽即用，配置参数（零代码）                        │
│   [移动] [跳跃] [旋转] [碰撞检测] [播放音效] ...           │
├─────────────────────────────────────────────────────────┤
│                    Level 2: 积木编程                      │
│         可视化逻辑连接（简单逻辑）                          │
│   [当按键按下] → [播放动画] → [移动到位置]                 │
├─────────────────────────────────────────────────────────┤
│                    Level 3: 简化脚本                      │
│         类似 GDScript 的轻量脚本（高级逻辑）               │
│   func _update(): move_forward(speed)                   │
├─────────────────────────────────────────────────────────┤
│                    Level 4: JavaScript                   │
│         完整 JS 能力（专业开发者）                         │
│   class Player extends GameObject { ... }               │
└─────────────────────────────────────────────────────────┘
```

---

## 4.2 Level 1: 预设组件系统

### 2.1 组件基础结构

```javascript
// 组件基类
class Component {
  constructor(gameObject, config = {}) {
    this.gameObject = gameObject;
    this.enabled = true;
    this.uuid = generateUUID();

    // 从配置初始化属性
    Object.assign(this, this.getDefaultConfig(), config);
  }

  // 子类实现
  getDefaultConfig() {
    return {};
  }
  start() {} // 组件启动时调用
  update(deltaTime) {} // 每帧调用
  onDestroy() {} // 销毁时调用
}
```

### 2.2 预设组件列表

#### 移动类组件

```javascript
// 直线移动组件
class MoveForward extends Component {
  static displayName = '直线移动';
  static icon = '➡️';
  static category = '移动';

  getDefaultConfig() {
    return {
      speed: 5, // 移动速度
      direction: [0, 0, 1], // 移动方向
      localSpace: true, // 是否使用本地坐标系
    };
  }

  static properties = [
    { name: 'speed', type: 'number', label: '速度', min: 0, max: 100, step: 0.1 },
    { name: 'direction', type: 'vector3', label: '方向' },
    { name: 'localSpace', type: 'boolean', label: '本地坐标系' },
  ];

  update(deltaTime) {
    const moveVector = new THREE.Vector3(...this.direction)
      .normalize()
      .multiplyScalar(this.speed * deltaTime);

    if (this.localSpace) {
      moveVector.applyQuaternion(this.gameObject.quaternion);
    }

    this.gameObject.position.add(moveVector);
  }
}

// 键盘控制移动组件
class KeyboardMovement extends Component {
  static displayName = '键盘移动';
  static icon = '🎮';
  static category = '移动';

  getDefaultConfig() {
    return {
      forwardKey: 'W',
      backwardKey: 'S',
      leftKey: 'A',
      rightKey: 'D',
      speed: 5,
      sprintKey: 'Shift',
      sprintMultiplier: 2,
    };
  }

  static properties = [
    { name: 'forwardKey', type: 'key', label: '前进键' },
    { name: 'backwardKey', type: 'key', label: '后退键' },
    { name: 'leftKey', type: 'key', label: '左移键' },
    { name: 'rightKey', type: 'key', label: '右移键' },
    { name: 'speed', type: 'number', label: '速度', min: 0, max: 50 },
    { name: 'sprintKey', type: 'key', label: '冲刺键' },
    { name: 'sprintMultiplier', type: 'number', label: '冲刺倍率', min: 1, max: 5 },
  ];

  update(deltaTime) {
    const input = this.gameObject.engine.input;
    let speed = this.speed;

    if (input.isKeyDown(this.sprintKey)) {
      speed *= this.sprintMultiplier;
    }

    const velocity = new THREE.Vector3();

    if (input.isKeyDown(this.forwardKey)) velocity.z -= 1;
    if (input.isKeyDown(this.backwardKey)) velocity.z += 1;
    if (input.isKeyDown(this.leftKey)) velocity.x -= 1;
    if (input.isKeyDown(this.rightKey)) velocity.x += 1;

    if (velocity.length() > 0) {
      velocity.normalize().multiplyScalar(speed * deltaTime);
      this.gameObject.position.add(velocity);
    }
  }
}

// 跟随目标组件
class FollowTarget extends Component {
  static displayName = '跟随目标';
  static icon = '🎯';
  static category = '移动';

  getDefaultConfig() {
    return {
      target: null, // 目标对象引用
      offset: [0, 0, 0], // 偏移量
      smoothSpeed: 5, // 平滑速度
      followX: true,
      followY: true,
      followZ: true,
    };
  }

  static properties = [
    { name: 'target', type: 'gameObject', label: '目标对象' },
    { name: 'offset', type: 'vector3', label: '偏移量' },
    { name: 'smoothSpeed', type: 'number', label: '平滑速度', min: 0, max: 20 },
    { name: 'followX', type: 'boolean', label: '跟随X轴' },
    { name: 'followY', type: 'boolean', label: '跟随Y轴' },
    { name: 'followZ', type: 'boolean', label: '跟随Z轴' },
  ];

  update(deltaTime) {
    if (!this.target) return;

    const targetPos = this.target.position.clone().add(new THREE.Vector3(...this.offset));
    const currentPos = this.gameObject.position;

    const lerpFactor = 1 - Math.exp(-this.smoothSpeed * deltaTime);

    if (this.followX) currentPos.x = THREE.MathUtils.lerp(currentPos.x, targetPos.x, lerpFactor);
    if (this.followY) currentPos.y = THREE.MathUtils.lerp(currentPos.y, targetPos.y, lerpFactor);
    if (this.followZ) currentPos.z = THREE.MathUtils.lerp(currentPos.z, targetPos.z, lerpFactor);
  }
}
```

#### 旋转类组件

```javascript
// 持续旋转组件
class RotateContinuous extends Component {
  static displayName = '持续旋转';
  static icon = '🔄';
  static category = '旋转';

  getDefaultConfig() {
    return {
      rotationSpeed: [0, 45, 0], // 每秒旋转角度 (x, y, z)
      localSpace: true,
    };
  }

  static properties = [
    { name: 'rotationSpeed', type: 'vector3', label: '旋转速度(度/秒)' },
    { name: 'localSpace', type: 'boolean', label: '本地坐标系' },
  ];

  update(deltaTime) {
    const rotation = new THREE.Euler(
      THREE.MathUtils.degToRad(this.rotationSpeed[0] * deltaTime),
      THREE.MathUtils.degToRad(this.rotationSpeed[1] * deltaTime),
      THREE.MathUtils.degToRad(this.rotationSpeed[2] * deltaTime)
    );

    if (this.localSpace) {
      this.gameObject.rotation.x += rotation.x;
      this.gameObject.rotation.y += rotation.y;
      this.gameObject.rotation.z += rotation.z;
    } else {
      // 世界空间旋转
      const quaternion = new THREE.Quaternion().setFromEuler(rotation);
      this.gameObject.quaternion.premultiply(quaternion);
    }
  }
}

// 面向目标组件
class LookAtTarget extends Component {
  static displayName = '面向目标';
  static icon = '👁️';
  static category = '旋转';

  getDefaultConfig() {
    return {
      target: null,
      smoothSpeed: 5,
      lockX: false,
      lockY: false,
      lockZ: false,
    };
  }

  static properties = [
    { name: 'target', type: 'gameObject', label: '目标对象' },
    { name: 'smoothSpeed', type: 'number', label: '平滑速度', min: 0, max: 20 },
    { name: 'lockX', type: 'boolean', label: '锁定X轴' },
    { name: 'lockY', type: 'boolean', label: '锁定Y轴' },
    { name: 'lockZ', type: 'boolean', label: '锁定Z轴' },
  ];

  update(deltaTime) {
    if (!this.target) return;

    const direction = new THREE.Vector3().subVectors(
      this.target.position,
      this.gameObject.position
    );

    if (direction.length() < 0.001) return;

    const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      direction.normalize()
    );

    this.gameObject.quaternion.slerp(targetQuaternion, 1 - Math.exp(-this.smoothSpeed * deltaTime));
  }
}
```

#### 物理类组件

```javascript
// 简单重力组件
class SimpleGravity extends Component {
  static displayName = '简单重力';
  static icon = '⬇️';
  static category = '物理';

  getDefaultConfig() {
    return {
      gravity: -9.8,
      groundLevel: 0,
      bounceFactor: 0.5,
    };
  }

  static properties = [
    { name: 'gravity', type: 'number', label: '重力加速度', min: -50, max: 0 },
    { name: 'groundLevel', type: 'number', label: '地面高度' },
    { name: 'bounceFactor', type: 'number', label: '弹跳系数', min: 0, max: 1 },
  ];

  start() {
    this.velocity = 0;
  }

  update(deltaTime) {
    this.velocity += this.gravity * deltaTime;
    this.gameObject.position.y += this.velocity * deltaTime;

    // 地面碰撞检测
    if (this.gameObject.position.y <= this.groundLevel) {
      this.gameObject.position.y = this.groundLevel;
      this.velocity = -this.velocity * this.bounceFactor;

      if (Math.abs(this.velocity) < 0.1) {
        this.velocity = 0;
      }
    }
  }
}

// 跳跃组件
class JumpOnKey extends Component {
  static displayName = '按键跳跃';
  static icon = '🦘';
  static category = '物理';

  getDefaultConfig() {
    return {
      jumpKey: 'Space',
      jumpForce: 10,
      groundLevel: 0,
      doubleJump: false,
    };
  }

  static properties = [
    { name: 'jumpKey', type: 'key', label: '跳跃键' },
    { name: 'jumpForce', type: 'number', label: '跳跃力度', min: 0, max: 30 },
    { name: 'groundLevel', type: 'number', label: '地面高度' },
    { name: 'doubleJump', type: 'boolean', label: '允许二段跳' },
  ];

  start() {
    this.velocity = 0;
    this.jumpCount = 0;
    this.maxJumps = this.doubleJump ? 2 : 1;
  }

  update(deltaTime) {
    const input = this.gameObject.engine.input;

    // 检测跳跃输入
    if (input.isKeyJustPressed(this.jumpKey) && this.jumpCount < this.maxJumps) {
      this.velocity = this.jumpForce;
      this.jumpCount++;
    }

    // 应用重力
    this.velocity -= 20 * deltaTime;
    this.gameObject.position.y += this.velocity * deltaTime;

    // 地面检测
    if (this.gameObject.position.y <= this.groundLevel) {
      this.gameObject.position.y = this.groundLevel;
      this.velocity = 0;
      this.jumpCount = 0;
    }
  }
}
```

#### 触发器类组件

```javascript
// 区域触发器
class TriggerZone extends Component {
  static displayName = '区域触发器';
  static icon = '⚡';
  static category = '触发';

  getDefaultConfig() {
    return {
      size: [2, 2, 2],
      onEnter: null, // 事件：进入时
      onExit: null, // 事件：离开时
      targetTag: '', // 检测特定标签的对象
    };
  }

  static properties = [
    { name: 'size', type: 'vector3', label: '区域大小' },
    { name: 'onEnter', type: 'event', label: '进入事件' },
    { name: 'onExit', type: 'event', label: '离开事件' },
    { name: 'targetTag', type: 'string', label: '目标标签' },
  ];

  start() {
    this.objectsInside = new Set();
  }

  update(deltaTime) {
    const allObjects = this.gameObject.engine.sceneManager.getAllGameObjects();

    for (const obj of allObjects) {
      if (obj === this.gameObject) continue;
      if (this.targetTag && !obj.tags.includes(this.targetTag)) continue;

      const isInside = this.checkInside(obj);
      const wasInside = this.objectsInside.has(obj.id);

      if (isInside && !wasInside) {
        this.objectsInside.add(obj.id);
        this.triggerEvent('onEnter', obj);
      } else if (!isInside && wasInside) {
        this.objectsInside.delete(obj.id);
        this.triggerEvent('onExit', obj);
      }
    }
  }

  checkInside(other) {
    const halfSize = new THREE.Vector3(...this.size).multiplyScalar(0.5);
    const pos = this.gameObject.position;
    const otherPos = other.position;

    return (
      Math.abs(otherPos.x - pos.x) <= halfSize.x &&
      Math.abs(otherPos.y - pos.y) <= halfSize.y &&
      Math.abs(otherPos.z - pos.z) <= halfSize.z
    );
  }

  triggerEvent(eventName, otherObject) {
    const event = this[eventName];
    if (event && typeof event === 'function') {
      event(otherObject);
    }
  }
}
```

#### 动画类组件

```javascript
// 简单动画播放
class PlayAnimation extends Component {
  static displayName = '播放动画';
  static icon = '🎬';
  static category = '动画';

  getDefaultConfig() {
    return {
      animationName: '',
      loop: true,
      speed: 1,
      autoPlay: true,
    };
  }

  static properties = [
    { name: 'animationName', type: 'animation', label: '动画' },
    { name: 'loop', type: 'boolean', label: '循环' },
    { name: 'speed', type: 'number', label: '速度', min: 0.1, max: 5 },
    { name: 'autoPlay', type: 'boolean', label: '自动播放' },
  ];

  start() {
    if (this.autoPlay) {
      this.play();
    }
  }

  play() {
    const mixer = this.gameObject.animationMixer;
    if (mixer && this.animationName) {
      const action = mixer.clipAction(this.animationName);
      action.setLoop(this.loop ? THREE.LoopRepeat : THREE.LoopOnce);
      action.timeScale = this.speed;
      action.play();
    }
  }
}

// 颜色渐变
class ColorPulse extends Component {
  static displayName = '颜色脉冲';
  static icon = '🌈';
  static category = '动画';

  getDefaultConfig() {
    return {
      color1: '#ff0000',
      color2: '#0000ff',
      speed: 1,
    };
  }

  static properties = [
    { name: 'color1', type: 'color', label: '颜色1' },
    { name: 'color2', type: 'color', label: '颜色2' },
    { name: 'speed', type: 'number', label: '速度', min: 0.1, max: 10 },
  ];

  update(deltaTime) {
    const time = this.gameObject.engine.time * this.speed;
    const t = (Math.sin(time) + 1) / 2;

    const color1 = new THREE.Color(this.color1);
    const color2 = new THREE.Color(this.color2);

    const material = this.gameObject.getComponent('MeshRenderer')?.material;
    if (material) {
      material.color.lerpColors(color1, color2, t);
    }
  }
}
```

### 2.3 组件注册系统

```javascript
// 组件注册表
const ComponentRegistry = {
  components: new Map(),
  categories: new Map(),

  register(componentClass) {
    const name = componentClass.name;
    this.components.set(name, componentClass);

    // 按分类组织
    const category = componentClass.category || '其他';
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category).push(componentClass);
  },

  get(name) {
    return this.components.get(name);
  },

  getByCategory(category) {
    return this.categories.get(category) || [];
  },

  getAllCategories() {
    return Array.from(this.categories.keys());
  },
};

// 注册所有预设组件
ComponentRegistry.register(MoveForward);
ComponentRegistry.register(KeyboardMovement);
ComponentRegistry.register(FollowTarget);
ComponentRegistry.register(RotateContinuous);
ComponentRegistry.register(LookAtTarget);
ComponentRegistry.register(SimpleGravity);
ComponentRegistry.register(JumpOnKey);
ComponentRegistry.register(TriggerZone);
ComponentRegistry.register(PlayAnimation);
ComponentRegistry.register(ColorPulse);
```

---

## 4.3 Level 2: 积木编程系统

### 3.1 积木块类型

```javascript
// 积木块基类
class Block {
  constructor(config = {}) {
    this.id = generateUUID();
    this.type = this.constructor.type;
    this.next = null; // 下一个积木
    this.inputs = {}; // 输入连接
    this.config = config; // 配置参数
  }

  // 执行积木逻辑
  execute(context) {
    throw new Error('子类必须实现 execute 方法');
  }
}

// 事件积木（触发器）
class EventBlock extends Block {
  static type = 'event';
  static category = '事件';
}

// 条件积木
class ConditionBlock extends Block {
  static type = 'condition';
  static category = '条件';
}

// 动作积木
class ActionBlock extends Block {
  static type = 'action';
  static category = '动作';
}

// 值积木
class ValueBlock extends Block {
  static type = 'value';
  static category = '值';
}
```

### 3.2 预设积木块

```javascript
// 事件：游戏开始
class OnGameStart extends EventBlock {
  static displayName = '当游戏开始时';
  static icon = '▶️';

  execute(context) {
    // 触发后续积木链
    if (this.next) {
      this.next.execute(context);
    }
  }
}

// 事件：按键按下
class OnKeyPress extends EventBlock {
  static displayName = '当按键按下时';
  static icon = '⌨️';

  constructor(config) {
    super(config);
    this.key = config.key || 'Space';
  }

  static properties = [{ name: 'key', type: 'key', label: '按键' }];

  execute(context) {
    const input = context.engine.input;
    if (input.isKeyJustPressed(this.key)) {
      if (this.next) {
        this.next.execute(context);
      }
    }
  }
}

// 事件：碰撞发生
class OnCollision extends EventBlock {
  static displayName = '当碰撞发生时';
  static icon = '💥';

  constructor(config) {
    super(config);
    this.targetTag = config.targetTag || '';
  }

  static properties = [{ name: 'targetTag', type: 'string', label: '目标标签' }];

  execute(context) {
    // 由物理系统触发
  }
}

// 条件：如果
class IfCondition extends ConditionBlock {
  static displayName = '如果';
  static icon = '❓';

  constructor(config) {
    super(config);
    this.condition = config.condition; // 连接到值积木
    this.trueBranch = null; // true 分支
    this.falseBranch = null; // false 分支
  }

  execute(context) {
    const result = this.condition ? this.condition.execute(context) : false;

    if (result && this.trueBranch) {
      this.trueBranch.execute(context);
    } else if (!result && this.falseBranch) {
      this.falseBranch.execute(context);
    }

    if (this.next) {
      this.next.execute(context);
    }
  }
}

// 动作：移动对象
class MoveObject extends ActionBlock {
  static displayName = '移动对象';
  static icon = '➡️';

  constructor(config) {
    super(config);
    this.target = config.target;
    this.direction = config.direction;
    this.distance = config.distance;
  }

  static properties = [
    { name: 'target', type: 'gameObject', label: '目标对象' },
    { name: 'direction', type: 'vector3', label: '方向' },
    { name: 'distance', type: 'number', label: '距离' },
  ];

  execute(context) {
    const target = this.target || context.gameObject;
    const direction = new THREE.Vector3(...this.direction).normalize();
    target.position.add(direction.multiplyScalar(this.distance));

    if (this.next) {
      this.next.execute(context);
    }
  }
}

// 动作：设置位置
class SetPosition extends ActionBlock {
  static displayName = '设置位置';
  static icon = '📍';

  constructor(config) {
    super(config);
    this.target = config.target;
    this.position = config.position;
  }

  static properties = [
    { name: 'target', type: 'gameObject', label: '目标对象' },
    { name: 'position', type: 'vector3', label: '位置' },
  ];

  execute(context) {
    const target = this.target || context.gameObject;
    target.position.set(...this.position);

    if (this.next) {
      this.next.execute(context);
    }
  }
}

// 动作：播放音效
class PlaySound extends ActionBlock {
  static displayName = '播放音效';
  static icon = '🔊';

  constructor(config) {
    super(config);
    this.sound = config.sound;
    this.volume = config.volume || 1;
  }

  static properties = [
    { name: 'sound', type: 'audio', label: '音效' },
    { name: 'volume', type: 'number', label: '音量', min: 0, max: 1 },
  ];

  execute(context) {
    context.engine.audio.play(this.sound, this.volume);

    if (this.next) {
      this.next.execute(context);
    }
  }
}

// 动作：销毁对象
class DestroyObject extends ActionBlock {
  static displayName = '销毁对象';
  static icon = '🗑️';

  constructor(config) {
    super(config);
    this.target = config.target;
  }

  static properties = [{ name: 'target', type: 'gameObject', label: '目标对象' }];

  execute(context) {
    const target = this.target || context.gameObject;
    context.engine.sceneManager.destroy(target);

    if (this.next) {
      this.next.execute(context);
    }
  }
}

// 动作：生成对象
class SpawnObject extends ActionBlock {
  static displayName = '生成对象';
  static icon = '✨';

  constructor(config) {
    super(config);
    this.prefab = config.prefab;
    this.position = config.position;
  }

  static properties = [
    { name: 'prefab', type: 'prefab', label: '预制件' },
    { name: 'position', type: 'vector3', label: '位置' },
  ];

  execute(context) {
    const instance = context.engine.sceneManager.instantiate(this.prefab);
    instance.position.set(...this.position);

    if (this.next) {
      this.next.execute(context);
    }
  }
}

// 值：获取位置
class GetPosition extends ValueBlock {
  static displayName = '获取位置';
  static icon = '📍';

  constructor(config) {
    super(config);
    this.target = config.target;
  }

  static properties = [{ name: 'target', type: 'gameObject', label: '目标对象' }];

  execute(context) {
    const target = this.target || context.gameObject;
    return [target.position.x, target.position.y, target.position.z];
  }
}

// 值：数学运算
class MathOperation extends ValueBlock {
  static displayName = '数学运算';
  static icon = '🔢';

  constructor(config) {
    super(config);
    this.operation = config.operation; // "add", "subtract", "multiply", "divide"
    this.value1 = config.value1;
    this.value2 = config.value2;
  }

  static properties = [
    { name: 'operation', type: 'select', label: '运算', options: ['加', '减', '乘', '除'] },
    { name: 'value1', type: 'number', label: '值1' },
    { name: 'value2', type: 'number', label: '值2' },
  ];

  execute(context) {
    const v1 = typeof this.value1 === 'object' ? this.value1.execute(context) : this.value1;
    const v2 = typeof this.value2 === 'object' ? this.value2.execute(context) : this.value2;

    switch (this.operation) {
      case 'add':
        return v1 + v2;
      case 'subtract':
        return v1 - v2;
      case 'multiply':
        return v1 * v2;
      case 'divide':
        return v2 !== 0 ? v1 / v2 : 0;
    }
  }
}
```

### 3.3 积木编程可视化数据结构

```javascript
// 积木程序结构
const blockProgram = {
  id: 'program-1',
  name: '玩家控制',
  gameObjectId: 'player-uuid',
  blocks: [
    {
      id: 'block-1',
      type: 'OnKeyPress',
      config: { key: 'W' },
      next: 'block-2',
    },
    {
      id: 'block-2',
      type: 'MoveObject',
      config: {
        target: null, // null 表示当前对象
        direction: [0, 0, -1],
        distance: 0.5,
      },
      next: null,
    },
    {
      id: 'block-3',
      type: 'OnKeyPress',
      config: { key: 'Space' },
      next: 'block-4',
    },
    {
      id: 'block-4',
      type: 'PlaySound',
      config: {
        sound: 'jump.mp3',
        volume: 0.8,
      },
      next: 'block-5',
    },
    {
      id: 'block-5',
      type: 'MoveObject',
      config: {
        target: null,
        direction: [0, 1, 0],
        distance: 2,
      },
      next: null,
    },
  ],
};
```

---

## 4.4 Level 3: 简化脚本系统

### 4.1 脚本语法设计

```javascript
// 简化脚本语法示例
const scriptExample = `
// 玩家控制器脚本
extends GameObject

// 属性定义（可在 Inspector 中编辑）
property speed = 5
property jumpForce = 10
property groundTag = "Ground"

// 内部变量
var velocity = Vector3(0, 0, 0)
var isGrounded = false

// 生命周期函数
func start():
    print("玩家初始化")
    position = Vector3(0, 5, 0)

func update(delta):
    # 移动控制
    if Input.is_key_pressed("W"):
        move_forward(speed * delta)
    if Input.is_key_pressed("S"):
        move_backward(speed * delta)
    if Input.is_key_pressed("A"):
        move_left(speed * delta)
    if Input.is_key_pressed("D"):
        move_right(speed * delta)
    
    # 跳跃
    if Input.is_key_just_pressed("Space") and isGrounded:
        velocity.y = jumpForce
        isGrounded = false
    
    # 应用重力
    velocity.y -= 20 * delta
    position += velocity * delta
    
    # 地面检测
    if position.y <= 0:
        position.y = 0
        velocity.y = 0
        isGrounded = true

func on_collision_enter(other):
    if other.has_tag("Coin"):
        other.destroy()
        print("收集金币！")
`;
```

### 4.2 脚本解析器

```javascript
class ScriptParser {
  constructor() {
    this.keywords = [
      'extends',
      'property',
      'var',
      'func',
      'if',
      'else',
      'for',
      'while',
      'return',
      'and',
      'or',
      'not',
    ];
  }

  parse(source) {
    const lines = source
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
    const ast = {
      extends: null,
      properties: [],
      variables: [],
      functions: [],
    };

    let currentFunction = null;

    for (const line of lines) {
      // 解析 extends
      if (line.startsWith('extends ')) {
        ast.extends = line.substring(8).trim();
      }
      // 解析 property
      else if (line.startsWith('property ')) {
        const match = line.match(/property\s+(\w+)\s*=\s*(.+)/);
        if (match) {
          ast.properties.push({
            name: match[1],
            value: this.parseValue(match[2]),
          });
        }
      }
      // 解析 var
      else if (line.startsWith('var ')) {
        const match = line.match(/var\s+(\w+)\s*=\s*(.+)/);
        if (match) {
          ast.variables.push({
            name: match[1],
            value: this.parseValue(match[2]),
          });
        }
      }
      // 解析 func
      else if (line.startsWith('func ')) {
        const match = line.match(/func\s+(\w+)\s*\(([^)]*)\)\s*:?/);
        if (match) {
          currentFunction = {
            name: match[1],
            params: match[2]
              .split(',')
              .map((p) => p.trim())
              .filter((p) => p),
            body: [],
          };
          ast.functions.push(currentFunction);
        }
      }
      // 解析函数体
      else if (currentFunction) {
        currentFunction.body.push(this.parseStatement(line));
      }
    }

    return ast;
  }

  parseValue(valueStr) {
    valueStr = valueStr.trim();

    // 数字
    if (/^-?\d+(\.\d+)?$/.test(valueStr)) {
      return parseFloat(valueStr);
    }
    // 字符串
    if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
      return valueStr.slice(1, -1);
    }
    // Vector3
    if (valueStr.startsWith('Vector3(')) {
      const match = valueStr.match(/Vector3\(([^)]+)\)/);
      if (match) {
        const values = match[1].split(',').map((v) => parseFloat(v.trim()));
        return { type: 'Vector3', values };
      }
    }
    // 布尔值
    if (valueStr === 'true') return true;
    if (valueStr === 'false') return false;

    return valueStr; // 变量名或其他
  }

  parseStatement(line) {
    // 简化的语句解析
    return { raw: line };
  }
}
```

### 4.3 脚本运行时

```javascript
class ScriptRuntime {
  constructor(gameObject, ast) {
    this.gameObject = gameObject;
    this.ast = ast;
    this.variables = {};

    // 初始化变量
    for (const prop of ast.properties) {
      this.variables[prop.name] = this.evaluateValue(prop.value);
    }
    for (const variable of ast.variables) {
      this.variables[variable.name] = this.evaluateValue(variable.value);
    }
  }

  evaluateValue(value) {
    if (typeof value === 'object' && value.type === 'Vector3') {
      return new THREE.Vector3(...value.values);
    }
    return value;
  }

  callFunction(name, ...args) {
    const func = this.ast.functions.find((f) => f.name === name);
    if (!func) return;

    // 创建局部作用域
    const localScope = { ...this.variables };

    // 绑定参数
    func.params.forEach((param, i) => {
      localScope[param] = args[i];
    });

    // 执行函数体
    for (const statement of func.body) {
      this.executeStatement(statement, localScope);
    }
  }

  executeStatement(statement, scope) {
    const line = statement.raw;

    // 解析并执行语句
    // 这里需要更完整的解释器实现
    // 简化版本只处理基本语句

    // position = Vector3(...)
    if (line.includes('position =')) {
      const match = line.match(/position\s*=\s*Vector3\(([^)]+)\)/);
      if (match) {
        const values = match[1].split(',').map((v) => this.evaluateExpression(v.trim(), scope));
        this.gameObject.position.set(...values);
      }
    }

    // move_forward(...)
    if (line.includes('move_forward(')) {
      const match = line.match(/move_forward\(([^)]+)\)/);
      if (match) {
        const distance = this.evaluateExpression(match[1], scope);
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.gameObject.quaternion);
        this.gameObject.position.add(forward.multiplyScalar(distance));
      }
    }

    // print(...)
    if (line.includes('print(')) {
      const match = line.match(/print\(([^)]+)\)/);
      if (match) {
        console.log(this.evaluateExpression(match[1], scope));
      }
    }
  }

  evaluateExpression(expr, scope) {
    expr = expr.trim();

    // 数字
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
      return parseFloat(expr);
    }

    // 变量
    if (scope[expr] !== undefined) {
      return scope[expr];
    }

    // 简单乘法 (speed * delta)
    if (expr.includes('*')) {
      const parts = expr.split('*').map((p) => this.evaluateExpression(p.trim(), scope));
      return parts.reduce((a, b) => a * b, 1);
    }

    return expr;
  }
}
```

---

## 4.5 Level 4: JavaScript 脚本系统

### 5.1 脚本组件结构

```javascript
// 用户编写的 JavaScript 脚本
class PlayerController extends ScriptComponent {
  // 在 Inspector 中显示的属性
  static properties = {
    speed: { type: 'number', default: 5, min: 0, max: 20 },
    jumpForce: { type: 'number', default: 10 },
    mouseSensitivity: { type: 'number', default: 0.1 },
  };

  // 初始化
  start() {
    this.velocity = new THREE.Vector3();
    this.isGrounded = false;

    // 获取其他组件引用
    this.rigidbody = this.getComponent('Rigidbody');
    this.camera = this.findObjectByName('MainCamera');
  }

  // 每帧更新
  update(deltaTime) {
    this.handleMovement(deltaTime);
    this.handleJump();
    this.handleMouseLook();
  }

  handleMovement(deltaTime) {
    const input = this.engine.input;
    const moveDir = new THREE.Vector3();

    if (input.isKeyDown('W')) moveDir.z -= 1;
    if (input.isKeyDown('S')) moveDir.z += 1;
    if (input.isKeyDown('A')) moveDir.x -= 1;
    if (input.isKeyDown('D')) moveDir.x += 1;

    if (moveDir.length() > 0) {
      moveDir.normalize();
      moveDir.applyQuaternion(this.gameObject.quaternion);
      this.gameObject.position.add(moveDir.multiplyScalar(this.speed * deltaTime));
    }
  }

  handleJump() {
    const input = this.engine.input;

    if (input.isKeyJustPressed('Space') && this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
    }
  }

  handleMouseLook() {
    const input = this.engine.input;
    const mouseDelta = input.getMouseDelta();

    this.gameObject.rotation.y -= mouseDelta.x * this.mouseSensitivity;
  }

  // 碰撞回调
  onCollisionEnter(other) {
    if (other.hasTag('Ground')) {
      this.isGrounded = true;
    }
  }

  // 触发器回调
  onTriggerEnter(other) {
    if (other.hasTag('Coin')) {
      other.destroy();
      this.engine.emit('coinCollected');
    }
  }
}
```

### 5.2 脚本加载系统

```javascript
class ScriptLoader {
  constructor(engine) {
    this.engine = engine;
    this.loadedScripts = new Map();
  }

  // 从文本加载脚本
  loadFromSource(source, className) {
    try {
      // 创建安全的执行环境
      const sandbox = this.createSandbox();

      // 执行脚本
      const script = new Function(
        'THREE',
        'GameObject',
        'Component',
        'Vector3',
        'Input',
        'Time',
        `${source}\n return ${className};`
      )(
        sandbox.THREE,
        sandbox.GameObject,
        sandbox.Component,
        sandbox.Vector3,
        sandbox.Input,
        sandbox.Time
      );

      this.loadedScripts.set(className, script);
      return script;
    } catch (error) {
      console.error(`脚本加载失败: ${error.message}`);
      return null;
    }
  }

  // 创建沙箱环境
  createSandbox() {
    return {
      THREE: THREE,
      GameObject: GameObject,
      Component: Component,
      Vector3: THREE.Vector3,
      Input: this.engine.input.createProxy(),
      Time: {
        deltaTime: () => this.engine.deltaTime,
        time: () => this.engine.time,
      },
    };
  }

  // 实例化脚本组件
  instantiate(className, gameObject, config = {}) {
    const ScriptClass = this.loadedScripts.get(className);
    if (!ScriptClass) {
      console.error(`脚本未找到: ${className}`);
      return null;
    }

    const instance = new ScriptClass(gameObject, config);
    return instance;
  }
}
```

---

## 4.6 事件系统设计

### 6.1 事件管理器

```javascript
class EventManager {
  constructor() {
    this.listeners = new Map();
  }

  // 订阅事件
  on(eventName, callback, context = null) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }

    this.listeners.get(eventName).push({
      callback,
      context,
      once: false,
    });
  }

  // 订阅一次性事件
  once(eventName, callback, context = null) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }

    this.listeners.get(eventName).push({
      callback,
      context,
      once: true,
    });
  }

  // 取消订阅
  off(eventName, callback) {
    if (!this.listeners.has(eventName)) return;

    const listeners = this.listeners.get(eventName);
    const index = listeners.findIndex((l) => l.callback === callback);

    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  // 触发事件
  emit(eventName, ...args) {
    if (!this.listeners.has(eventName)) return;

    const listeners = this.listeners.get(eventName);
    const toRemove = [];

    for (const listener of listeners) {
      if (listener.context) {
        listener.callback.call(listener.context, ...args);
      } else {
        listener.callback(...args);
      }

      if (listener.once) {
        toRemove.push(listener);
      }
    }

    // 移除一次性监听器
    for (const listener of toRemove) {
      listeners.splice(listeners.indexOf(listener), 1);
    }
  }
}
```

### 6.2 预定义事件

```javascript
// 引擎内置事件
const EngineEvents = {
  // 生命周期事件
  GAME_START: 'game:start',
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',
  GAME_STOP: 'game:stop',

  // 场景事件
  SCENE_LOADED: 'scene:loaded',
  SCENE_UNLOADED: 'scene:unloaded',
  OBJECT_CREATED: 'object:created',
  OBJECT_DESTROYED: 'object:destroyed',

  // 物理事件
  COLLISION_ENTER: 'physics:collisionEnter',
  COLLISION_EXIT: 'physics:collisionExit',
  TRIGGER_ENTER: 'physics:triggerEnter',
  TRIGGER_EXIT: 'physics:triggerExit',

  // 输入事件
  KEY_DOWN: 'input:keyDown',
  KEY_UP: 'input:keyUp',
  MOUSE_DOWN: 'input:mouseDown',
  MOUSE_UP: 'input:mouseUp',
  MOUSE_MOVE: 'input:mouseMove',

  // 自定义事件
  CUSTOM: 'custom',
};
```

---

## 4.7 Inspector 面板集成

### 7.1 属性编辑器组件

```jsx
// InspectorPanel.jsx 中的组件编辑部分
function ComponentEditor({ component, onUpdate }) {
  const properties = component.constructor.properties || [];

  return (
    <div className="component-editor">
      <div className="component-header">
        <span className="component-icon">{component.constructor.icon}</span>
        <span className="component-name">{component.constructor.displayName}</span>
        <button className="remove-btn" onClick={() => onRemove(component)}>
          ×
        </button>
      </div>

      <div className="component-properties">
        {properties.map((prop) => (
          <PropertyField
            key={prop.name}
            property={prop}
            value={component[prop.name]}
            onChange={(value) => onUpdate(component, prop.name, value)}
          />
        ))}
      </div>
    </div>
  );
}

function PropertyField({ property, value, onChange }) {
  switch (property.type) {
    case 'number':
      return (
        <div className="property-row">
          <label>{property.label}</label>
          <input
            type="number"
            value={value}
            min={property.min}
            max={property.max}
            step={property.step || 1}
            onChange={(e) => onChange(parseFloat(e.target.value))}
          />
        </div>
      );

    case 'vector3':
      return (
        <div className="property-row">
          <label>{property.label}</label>
          <div className="vector-inputs">
            <input
              type="number"
              value={value[0]}
              step="0.1"
              onChange={(e) => onChange([parseFloat(e.target.value), value[1], value[2]])}
            />
            <input
              type="number"
              value={value[1]}
              step="0.1"
              onChange={(e) => onChange([value[0], parseFloat(e.target.value), value[2]])}
            />
            <input
              type="number"
              value={value[2]}
              step="0.1"
              onChange={(e) => onChange([value[0], value[1], parseFloat(e.target.value)])}
            />
          </div>
        </div>
      );

    case 'boolean':
      return (
        <div className="property-row">
          <label>{property.label}</label>
          <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
        </div>
      );

    case 'color':
      return (
        <div className="property-row">
          <label>{property.label}</label>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
      );

    case 'key':
      return (
        <div className="property-row">
          <label>{property.label}</label>
          <KeyInput value={value} onChange={onChange} />
        </div>
      );

    case 'gameObject':
      return (
        <div className="property-row">
          <label>{property.label}</label>
          <GameObjectSelector value={value} onChange={onChange} />
        </div>
      );

    case 'event':
      return (
        <div className="property-row">
          <label>{property.label}</label>
          <EventEditor value={value} onChange={onChange} />
        </div>
      );

    default:
      return null;
  }
}
```

### 7.2 添加组件面板

```jsx
function AddComponentPanel({ onAdd, onClose }) {
  const categories = ComponentRegistry.getAllCategories();
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);

  return (
    <div className="add-component-panel">
      <div className="panel-header">
        <h3>添加组件</h3>
        <button onClick={onClose}>×</button>
      </div>

      <div className="category-tabs">
        {categories.map((cat) => (
          <button
            key={cat}
            className={cat === selectedCategory ? 'active' : ''}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="component-list">
        {ComponentRegistry.getByCategory(selectedCategory).map((comp) => (
          <div key={comp.name} className="component-item" onClick={() => onAdd(comp.name)}>
            <span className="icon">{comp.icon}</span>
            <span className="name">{comp.displayName}</span>
            <span className="description">{comp.description || ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 4.8 数据序列化

### 8.1 场景保存格式

```javascript
// 场景数据结构
const sceneData = {
  version: '1.0',
  name: 'MyScene',

  // 游戏对象列表
  objects: [
    {
      id: 'obj-1',
      name: 'Player',
      tags: ['Player'],

      // 变换
      transform: {
        position: [0, 1, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },

      // 渲染
      mesh: {
        type: 'cube', // 或 "sphere", "plane", "model:uuid"
        material: {
          color: '#4a90d9',
          metalness: 0.3,
          roughness: 0.7,
        },
      },

      // 组件
      components: [
        {
          type: 'KeyboardMovement',
          config: {
            forwardKey: 'W',
            backwardKey: 'S',
            leftKey: 'A',
            rightKey: 'D',
            speed: 5,
          },
        },
        {
          type: 'JumpOnKey',
          config: {
            jumpKey: 'Space',
            jumpForce: 10,
            doubleJump: true,
          },
        },
      ],

      // 积木程序
      blockPrograms: [
        {
          id: 'bp-1',
          name: '收集金币',
          blocks: [
            { id: 'b1', type: 'OnTriggerEnter', config: { targetTag: 'Coin' }, next: 'b2' },
            { id: 'b2', type: 'DestroyObject', config: { target: 'other' }, next: 'b3' },
            { id: 'b3', type: 'PlaySound', config: { sound: 'coin.mp3' }, next: null },
          ],
        },
      ],

      // 子对象
      children: [],
    },
  ],

  // 资源引用
  assets: [
    { id: 'asset-1', type: 'model', path: 'models/character.glb' },
    { id: 'asset-2', type: 'audio', path: 'sounds/jump.mp3' },
  ],
};
```

### 8.2 导出为运行时格式

```javascript
class SceneExporter {
  export(scene) {
    const runtimeScene = {
      objects: [],
    };

    for (const obj of scene.objects) {
      const runtimeObj = {
        id: obj.id,
        transform: obj.transform,
        mesh: obj.mesh,
        scripts: [],
      };

      // 将组件转换为运行时脚本
      for (const comp of obj.components) {
        runtimeObj.scripts.push({
          type: 'component',
          name: comp.type,
          config: comp.config,
        });
      }

      // 将积木程序转换为运行时脚本
      for (const program of obj.blockPrograms) {
        runtimeObj.scripts.push({
          type: 'blocks',
          program: program,
        });
      }

      runtimeScene.objects.push(runtimeObj);
    }

    return JSON.stringify(runtimeScene, null, 2);
  }
}
```

---

## 4.9 实现优先级

### 第一阶段（MVP）

1. ✅ 组件基类和注册系统
2. ✅ 基础预设组件（移动、旋转、跳跃）
3. ✅ Inspector 面板组件编辑
4. ✅ 事件系统基础

### 第二阶段

1. 积木编程可视化编辑器
2. 积木块执行引擎
3. 更多预设组件

### 第三阶段

1. 简化脚本解析器
2. 脚本运行时
3. 脚本编辑器 UI

### 第四阶段

1. JavaScript 脚本支持
2. 脚本热重载
3. 调试工具

---

## 4.10 总结

本脚本系统采用分层设计，从零代码的预设组件到完整的 JavaScript 支持，满足不同水平用户的需求：

| 层级    | 目标用户   | 学习成本 | 灵活性 |
| ------- | ---------- | -------- | ------ |
| Level 1 | 完全新手   | 无       | 低     |
| Level 2 | 初学者     | 低       | 中     |
| Level 3 | 进阶用户   | 中       | 高     |
| Level 4 | 专业开发者 | 高       | 完全   |

建议从 Level 1 开始实现，逐步向上扩展，让用户能够随着技能提升自然过渡到更高层级。


---
# 第五章 方块建模器与骨骼动画引擎

> 版本: v1.0 | 日期: 2026-06-04
> 状态: 规划中

---

## 5.1 愿景与定位

Astra3DEngine（以下简称 **A3DE**）将从当前的 3D 场景编辑器，扩展为一个包含 **模型创建工具 + 骨骼动画引擎** 的完整工作台。用户可以在同一生态内完成从"造物"到"让物动起来"的全流程。

### 核心目标

1. 内置 **方块建模器（Voxel Editor）**：通过固定大小方块搭建 GLTF 模型，作为独立界面运行
2. 内置 **骨骼动画引擎（Animation Engine）**：集成在 A3DE 主编辑器内部，支持骨骼创建、关键帧编辑、动画播放与混合
3. 建立 **Home 工作台**：统一入口，管理项目、资源库、各工具界面切换
4. 建立 **全局资源库**：跨项目共享的资产中心，建模器产物存入此处供所有项目引用

---

## 5.2 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      HOME (工作台)                            │
│                                                             │
│  ┌──────────────────┐  ┌────────────────────────────────┐   │
│  │                  │  │                                │   │
│  │   最近项目列表    │  │   [ A3DE 编辑器 ]              │   │
│  │                  │  │   场景编辑 + 骨骼动画引擎        │   │
│  │   · Project_A    │  │                                │   │
│  │   · Project_B    │  │   [ 方块建模器 ]               │   │
│  │                  │  │   独立界面 · 模型创建           │   │
│  │   ──────────     │  │                                │   │
│  │   快捷入口        │  │                                │   │
│  │   ▸ 新建项目      │  │                                │   │
│  │   ▸ 打开项目      │  │                                │   │
│  │                  │  │                                │   │
│  └──────────────────┘  └────────────────────────────────┘   │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              个人资源库 (全局共享)                       │  │
│  │                                                        │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │  │
│  │  │ 模型    │ │ 材质   │ │ 贴图   │ │ 动画   │ ...     │  │
│  │  │ .glb   │ │        │ │        │ │ .anim  │        │  │
│  │  │ .avox  │ │        │ │        │ │        │        │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 架构原则

| 原则                  | 说明                                                          |
| --------------------- | ------------------------------------------------------------- |
| **Home 是容器**       | 类似 VS Code Activity Bar / Unity Hub，提供项目管理和工具入口 |
| **A3DE 与建模器平级** | 都是 Home 下的一级界面，各自独立运行                          |
| **资源库全局共享**    | 建模器产出的模型存入资源库，任何项目都能引用                  |
| **项目只存引用**      | 项目文件记录资源路径/ID，不复制资源本身                       |

### 数据流向

```
方块建模器 (独立界面)          全局资源库                A3DE 编辑器 (内置)
       │                          │                         │
       │  创建模型 character.glb   │                         │
       ├────────────────────────▶  │                         │
       │                          │  character.glb           │
       │                          ├────────────────────────▶ │
       │                          │                         │ 拖入场景
       │                          │                         │ 绑定骨骼 / 创建骨骼
       │                          │                         │ 编辑关键帧动画
       │                          │ ◀─────────────────────────┤
       │                          │  animation.anim (可选导出)│
       │                          │                         │
```

---

## 5.3 模块 A：方块建模器（Voxel Editor）

### 3.1 定位

- **独立界面**：不在 A3DE 内部弹窗，而是 Home 下的平级页面
- **资产创建工具**：类似 Blockbench / MagicaVoxel 的体素建模体验
- **产出物**：GLTF/GLB 模型 → 存入全局资源库

### 3.2 技术方案

#### 渲染核心：InstancedMesh

这是性能的关键决策。采用 Three.js `InstancedMesh` 实现万级方块的流畅渲染：

| 对比项         | 方案 A: 每方块一 Mesh | 方案 B: InstancedMesh (采用) | 方案 C: 合并几何体 |
| -------------- | --------------------- | ---------------------------- | ------------------ |
| Draw Calls     | N (每方块一次)        | **1 (全部)**                 | 1                  |
| 10000 方块 FPS | ~5                    | **60+**                      | 60+                |
| 单独拾取       | 天然支持              | 需额外实现                   | 困难               |
| 动态增删       | 天然支持              | 需更新矩阵数组               | 需重建几何体       |
| 适用场景       | 少量方块              | **大量动态方块**             | 静态模型           |

```javascript
// 核心渲染架构示意
class VoxelRenderer {
  constructor(scene, maxVoxels = 65536) {
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, maxVoxels);
    this.mesh.instanceMatrix = new THREE.InstancedBufferAttribute(
      new Float32Array(maxVoxels * 16),
      16 // 4x4 matrix
    );
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(maxVoxels * 4),
      4 // RGBA
    );
    this.count = 0; // 当前活跃方块数
    scene.add(this.mesh);
  }

  // 更新单个方块的位置和颜色
  updateVoxel(index, position, color) {
    const matrix = new THREE.Matrix4().setPosition(position);
    this.mesh.setMatrixAt(index, matrix);
    this.mesh.setColorAt(index, color);
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
```

#### 拾取方案（射线检测）

由于 InstancedMesh 不直接支持单实例射线检测，采用以下策略：

```javascript
// 方案：虚拟网格 + Raycaster
// 1. 维护一个不可见的网格辅助层（或空间哈希）
// 2. Raycaster 射线检测时查询最近的方块位置
// 3. 或使用 GPU Picker（渲染每个 instance 为唯一颜色后读像素）
```

### 3.3 数据结构

```typescript
// 项目数据格式 (.avox)
interface VoxelProject {
  name: string;
  version: string;

  // 网格配置
  voxelSize: number; // 方块单位尺寸 (默认 1)
  gridSize: { x: number; y: number; z: number }; // 网格范围

  // 方块数据
  voxels: Voxel[];

  // 分组/图层 (对应未来的骨骼绑定)
  groups: VoxelGroup[];

  // 调色板
  palette: string[]; // HEX 颜色数组

  // 元数据
  meta: {
    created: string;
    modified: string;
    author?: string;
  };
}

interface Voxel {
  id: string; // 唯一标识
  position: [number, number, number]; // 网格坐标 (整数)
  colorIndex: number; // 调色板索引
  groupId: string; // 所属分组 ID
}

interface VoxelGroup {
  id: string;
  name: string; // 如 "Head", "Body", "LeftArm"
  parentId: string | null; // 父组 ID (null = 根节点)
  pivot: [number, number, number]; // 组原点 (用于旋转轴心)
  transform: {
    position: [number, number, number];
    rotation: [number, number, number]; // Euler 角 (度)
    scale: [number, number, number];
  };
}
```

### 3.4 功能规划

#### Phase 1 — 核心建模 (MVP)

| 功能           | 描述                                       | 优先级 |
| -------------- | ------------------------------------------ | ------ |
| **3D 视口**    | OrbitControls 旋转/缩放/平移，网格地面参考 | P0     |
| **画笔工具**   | 点击网格面添加方块，按住拖动连续绘制       | P0     |
| **橡皮擦工具** | 点击/拖动删除方块                          | P0     |
| **选择工具**   | 点击选中单个方块，框选多个方块             | P0     |
| **移动工具**   | TransformControls Gizmo 移动选中方块       | P0     |
| **调色板**     | 预设颜色面板 + 自定义取色器                | P0     |
| **撤销/重做**  | 操作历史栈 (至少 50 步)                    | P0     |
| **图层/分组**  | 树形层级面板，支持嵌套分组                 | P1     |
| **镜像绘制**   | X/Y/Z 轴对称绘制模式                       | P1     |
| **快捷键**     | G(移动)/R(旋转)/S(缩放)/Delete/Ctrl+Z 等   | P1     |

#### Phase 2 — 导出导入

| 功能              | 描述                                          | 优先级 |
| ----------------- | --------------------------------------------- | ------ |
| **导出 GLTF/GLB** | 将方块合并为单一 Mesh，使用 GLTFExporter 导出 | P0     |
| **保存/打开项目** | 自定义 JSON 格式 (.avox)，含完整编辑状态      | P0     |
| **导入 GLTF**     | 加载外部模型到场景中作为参考                  | P1     |
| **导入 VOX**      | 兼容 MagicaVoxel 格式 (可选)                  | P2     |

#### Phase 3 — 高级功能

| 功能         | 描述                                    | 优先级 |
| ------------ | --------------------------------------- | ------ |
| **多视图**   | 正交三视图 (顶/前/侧) + 透视视图        | P1     |
| **材质系统** | 基础 PBR (粗糙度/金属度/法线)           | P2     |
| **纹理绘制** | UV 展开后的贴图绘制模式 (类 Blockbench) | P2     |
| **批量操作** | 复制/粘贴/阵列/镜像阵列                 | P2     |

### 3.5 UI 布局

```
┌──────────────────────────────────────────────────────────┐
│ 工具栏: [选择][画笔][橡皮擦][移动][旋转][缩放] [镜像] [撤销][重做] │
├────────────┬─────────────────────────────┬───────────────┤
│ 图层面板   │      3D 视口                 │   属性面板     │
│ ▼ Root     │                             │               │
│  ├ Head    │     ┌────┐                  │  位置: x y z  │
│  │  ■■■   │     │■■■│ ← 方块模型         │  缩放: x y z  │
│  │  ■■■   │     │■■■│                   │  旋转: x y z  │
│  └          │     └────┘                  │  颜色: #ff0000│
│  ├ Body    │                             │               │
│  └          │                             │ 分组: Head    │
│             │                             │               │
├────────────┴─────────────────────────────┴───────────────┤
│ 调色板: [#ff0000] [#00ff00] [#0000ff] [...] [+ 自定义]  │
└──────────────────────────────────────────────────────────┘
```

### 3.6 性能保障措施

| 问题             | 应对策略                                            |
| ---------------- | --------------------------------------------------- |
| 大量方块导致卡顿 | InstancedMesh 单 draw call；Web Worker 处理数据计算 |
| 撤销重做内存膨胀 | 命令模式 (Command Pattern) + 快照压缩；限制历史步数 |
| 导出大模型耗时   | Web Worker 中执行几何体合并 + GLTF 导出             |
| 拾取延迟         | 空间哈希加速射线检测；或 GPU Picker 方案            |

---

## 5.4 模块 B：骨骼动画引擎（Animation Engine）

### 4.1 定位

- **内置在 A3DE 主编辑器中**：不是独立界面，而是 A3DE 的一个功能面板
- **完整的动画管线**：从骨骼创建到关键帧编辑到运行时播放
- **蓝本参考**：[Astral3D 动画系统](../Astral3D/packages/sdk/lib/core/animation/) 的成熟架构

### 4.2 架构设计（基于 Astral3D 蓝本改进）

```
┌──────────────────────────────────────────────────────────┐
│                    A3DE 主编辑器                           │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ 层级面板  │ │ 属性面板  │ │ 资源面板  │ │ 动画面板    │  │ ← 在此
│  │          │ │          │ │          │ │            │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │                    3D 视口                            │  │
│  │        场景对象 + 实时动画预览                        │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ════════════════════════════════════════════════════    │
│                  动画引擎 (三层架构)                       │
│                                                          │
│  ┌───────────────────────────────────────────────────┐   │
│  │  UI 层 (React 组件)                                 │   │
│  │  ├── AnimationPanel      → 动画面板主容器            │   │
│  │  ├── AnimationToolbar    → 播放控制栏               │   │
│  │  ├── AnimationTimeline   → 时间轴编辑器              │   │
│  │  ├── TrackTree           → 左侧轨道树 (骨骼/属性)     │   │
│  │  ├── AnimationList       → 动画片段选择器             │   │
│  │  ├── SkeletonEditor      → 骨骼层级编辑器             │   │
│  │  └── KeyframeButton      → 关键帧快捷按钮组件         │   │
│  ├───────────────────────────────────────────────────┤   │
│  │  状态层 (Zustand / Context Store)                    │   │
│  │  └── animationStore                              │   │
│  │      · list / current / trackTree                  │   │
│  │      · currentTime / duration / timeScale          │   │
│  │      · play() / pause() / stop() / addKeyframe()   │   │
│  │      · skeleton Bones 树                           │   │
│  ├───────────────────────────────────────────────────┤   │
│  │  引擎层 (Core)                                       │   │
│  │  ├── AnimationManager                               │   │
│  │  │   · mixerMap: Map<uuid, AnimationMixer>          │   │
│  │  │   · actionMap: Map<uuid, AnimationAction>        │   │
│  │  │   · createEmptyAnimation()                       │   │
│  │  │   · reClipAction()                               │   │
│  │  │   └── KeyframeTrackFactory()                     │   │
│  │  ├── TimelineController                             │   │
│  │  │   · Canvas 时间轴渲染                             │   │
│  │  │   · 关键帧 CRUD                                  │   │
│  │  │   · 拖拽 & 吸附                                  │   │
│  │  │   · 播放头同步                                   │   │
│  │  └── SkeletonManager                                │   │
│  │      · 骨骼创建/删除/层级管理                        │   │
│  │      · 从 Group 自动生成骨骼                         │   │
│  │      · SkinnedMesh 绑定                             │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### 4.3 核心模块详解

#### 4.3.1 AnimationManager（动画混合器管理）

参考 Astral3D [`AnimationManager.ts`](../Astral3D/packages/sdk/lib/core/animation/AnimationManager.ts)：

```typescript
class AnimationManager {
  // 每个 Object3D 一个 Mixer（按 UUID 索引）
  private mixerMap: Map<string, THREE.AnimationMixer>;

  // 每个 AnimationClip.uuid → AnimationAction
  private actionMap: Map<string, THREE.AnimationAction>;

  /** 为指定对象创建空动画片段 */
  createEmptyAnimation(name: string, object: THREE.Object3D): AnimationAction;

  /** 修改关键帧后重建 Action（保证数据一致性） */
  reClipAction(action: AnimationAction, currentTime?: number): AnimationAction;

  /** 每帧更新所有活跃的 Mixer */
  update(delta: number): boolean;

  /** 清理指定对象的全部动画 */
  dispose(object: THREE.Object3D): void;
}
```

**关键设计决策（来自 Astral3D 经验）：**

- 双 Map 结构 (`mixerMap` + `actionMap`) 按 UUID 索引，清晰高效
- `reClipAction()` 是修改关键帧后的**必须操作**，否则 AnimationMixer 内部缓存不会更新
- 每帧只更新有活跃 Action 的 Mixer，避免无谓开销

#### 4.3.2 KeyframeTrackFactory（轨道类型工厂）

参考 Astral3D 同名函数，自动根据属性名推断轨道类型：

```typescript
function KeyframeTrackFactory(
  name: string,
  times: number[],
  values: number[],
  interpolation?: InterpolationModes
): KeyframeTrack {
  const attr = extractAttributeName(name);

  switch (attr) {
    case 'position':
      return new VectorKeyframeTrack(name, times, values);
    case 'rotation':
      return new VectorKeyframeTrack(name, times, values);
    case 'scale':
      return new VectorKeyframeTrack(name, times, values);
    case 'quaternion':
      return new QuaternionKeyframeTrack(name, times, values);
    case 'color':
    case 'emissive':
      return new ColorKeyframeTrack(name, times, values);
    case 'opacity':
    case 'intensity':
    case 'roughness':
    case 'metalness':
      return new NumberKeyframeTrack(name, times, values);
    case 'visible':
    case 'wireframe':
      return new BooleanKeyframeTrack(name, times, values);
    default:
      return new KeyframeTrack(name, times, values);
  }
}
```

#### 4.3.3 TimelineController（时间轴控制器）

参考 Astral3D [`TimelineTrack.ts`](../Astral3D/packages/sdk/lib/core/animation/TimelineTrack.ts)：

```typescript
class TimelineController extends EventDispatcher {
  // 底层时间轴 (Canvas 渲染)
  private timeline: Timeline;

  // 当前绑定的动画 Action
  bindAction: AnimationAction | null;

  // 数据模型
  model: ITimelineModel; // { rows: ITimelineRow[] }

  /** 设置轨道行（唯一变更入口） */
  setRows(rows: ITimelineRow[]): void;

  /** 在当前时间添加关键帧 */
  addKeyframe(attr: string): void;

  /** 删除选中的关键帧 */
  deleteSelectedKeyframes(): void;

  /** 关键帧被拖动时的回调（防抖 100ms） */
  onKeyframeChanged(event): void;

  /** 播放控制 */
  play(): void;
  pause(): void;
  stop(): void;
}
```

**关键机制（来自 Astral3D 经验）：**

- **双向绑定**：UI 关键帧 ↔ Three.js KeyframeTrack 实时同步
- **防抖更新**：关键帧拖动时 debounce 100ms 后重建 Track，避免频繁重建
- **播放头自动跟随**：Mixer 更新时若播放头超出可视区域则自动滚动
- **Canvas 渲染**：时间轴使用 Canvas 绘制，DOM 方案在大数量关键帧下性能不足

#### 4.3.4 SkeletonManager（骨骼管理器 — A3DE 新增）

这是 Astral3D 未覆盖的部分，A3DE 需要新增：

```typescript
interface BoneData {
  id: string;
  name: string;
  parentId: string | null;
  position: [number, number, number];
  rotation: [number, number, number]; // Euler 角 (度)
  length: number; // 显示长度
}

class SkeletonManager {
  /** 创建骨骼 */
  createBone(data: BoneData): THREE.Bone;

  /** 删除骨骼及其子骨骼 */
  removeBone(boneId: string): void;

  /** 设置骨骼父子关系 */
  setParent(boneId: string, parentId: string | null): void;

  /** 从方块模型的 Group 结构自动生成骨骼 */
  generateFromGroups(groups: VoxelGroup[]): THREE.Skeleton;

  /** 创建 SkinnedMesh 并绑定骨骼 */
  createSkinnedMesh(geometry, material, skeleton): THREE.SkinnedMesh;

  /** 自动计算蒙皮权重 (距离衰减) */
  autoSkin(skinnedMesh: THREE.SkinnedMesh, skeleton: THREE.Skeleton): void;

  /** 可视化骨骼 */
  createSkeletonHelper(skeleton: THREE.Skeleton): THREE.SkeletonHelper;
}
```

### 4.4 时间轴 UI 设计

```
┌─────────────────────────────────────────────────────────┐
│ 动画编辑器                                                │
│                                                         │
│ [▼ idle_run ▾] [+] [🔓]                                  │ ← 动画选择 + 新建 + 锁定
│                                                         │
│ ┌──────────────┬─────────────────────────────────────┐  │
│ │ 骨骼/属性树   │  时间轴 (Canvas)                      │  │
│ │              │                                      │  │
│ │ ▼ Character  │  0    5    10   15   20   25   30 帧 │  │
│ │  ├ Spine     │  │━━━━━●━━━━━━━━━━━━━●━━━━━━━━━━━━│  │
│ │  ├ Head      │  │   ●──────────────────●          │  │
│ │  ├ L_Arm     │  │   ●────●                          │  │
│ │  ├ R_Arm     │  │   ●────●                          │  │
│ │  ├ L_Leg     │  │ ●────●       ●                    │  │
│ │  └ R_Leg     │  │ ●────●       ●                    │  │
│ │              │                                      │  │
│ │  ├ material  │  │                                    │  │
│ │   └ opacity  │  │ ●──────────────────●              │  │
│ │              │                                      │  │
│ │              │  ━━━━━━━━━▶ 播放头                     │  │
│ └──────────────┴─────────────────────────────────────┘  │
│                                                         │
│ [⏮] [▶ 播放] [⏸ 暂停] [⏹ 停止] [⏭]  00:05 / 00:30   │
│ 速度: [1.0x    ]  循环: [✓]                              │
└─────────────────────────────────────────────────────────┘
```

**交互能力：**

| 操作                  | 说明                           |
| --------------------- | ------------------------------ |
| 点击空白区域          | 移动播放头                     |
| 拖动播放头            | 跳转时间，场景实时预览该帧姿态 |
| 拖动关键帧            | 移动关键帧时间位置 (防抖更新)  |
| 右键关键帧            | 删除关键帧                     |
| 点击属性行旁的 ◆ 按钮 | 在当前时间为该属性添加关键帧   |
| 滚轮                  | 缩放时间轴                     |
| 拖动时间轴背景        | 平移时间轴                     |
| 树节点展开/折叠       | 控制对应轨道行的显示/隐藏      |

### 4.5 动画运行时 API

```typescript
class AnimationRuntime {
  private manager: AnimationManager;

  /** 加载动画片段 */
  loadClip(object: THREE.Object3D, clip: AnimationClip): AnimationAction;

  /** 播放（支持 crossfade 过渡） */
  play(action: AnimationAction, fadeDuration?: number): void;

  /** 暂停/继续 */
  pause(action: AnimationAction): void;

  /** 停止 */
  stop(action: AnimationAction): void;

  /** 设置播放速度 */
  setTimeScale(scale: number): void;

  /** 多层动画混合 */
  blend(layers: Array<{ action: AnimationAction; weight: number }>): void;

  /** 每帧调用 */
  update(delta: number): void;
}
```

### 4.6 从方块模型到动画的工作流

```
Step 1: 在方块建模器中搭建模型
        定义 Group 分组 (Head, Body, Arms, Legs...)
        ↓
Step 2: 导出为 GLB → 存入全局资源库
        ↓
Step 3: 在 A3DE 中从资源库将模型拖入场景
        ↓
Step 4: 选择模型 → 打开动画面板
        ↓
Step 5a: 若模型已有骨骼动画 (外部导入)
        → 直接显示动画列表和轨道，可编辑/播放

Step 5b: 若是方块建模器产出的静态模型
        → 使用 SkeletonManager 从 Group 自动生成骨骼
        → 自动绑定 SkinnedMesh + 计算蒙皮权重
        ↓
Step 6: 在时间轴中选择骨骼属性 → 移动/旋转骨骼 → 添加关键帧
        ↓
Step 7: 播放预览 → 微调 → 保存
        动画可随项目保存，也可单独导出到资源库
```

### 4.7 功能规划

#### Phase 1 — 动画播放与基础编辑

| 功能                  | 描述                                        | 优先级 |
| --------------------- | ------------------------------------------- | ------ |
| **动画列表显示**      | 选中带动画的对象后显示其 AnimationClip 列表 | P0     |
| **播放控制**          | 播放/暂停/停止/跳转首尾                     | P0     |
| **时间轴 Dope Sheet** | Canvas 渲染的时间轴，显示关键帧             | P0     |
| **轨道树**            | 解析 Clip.tracks 为树形结构显示             | P0     |
| **添加关键帧**        | 在当前时间为选定属性插入关键帧              | P0     |
| **删除关键帧**        | 选中关键帧后删除                            | P0     |
| **拖动关键帧**        | 移动关键帧时间位置                          | P0     |
| **播放速度调节**      | timeScale 控制                              | P0     |
| **时间格式化**        | 00:00:00 格式显示                           | P0     |

#### Phase 2 — 骨骼系统

| 功能                  | 描述                          | 优先级 |
| --------------------- | ----------------------------- | ------ |
| **骨骼创建面板**      | 在 UI 中创建/编辑骨骼层级     | P0     |
| **骨骼可视化**        | SkeletonHelper 显示骨骼线框   | P0     |
| **从 Group 生成骨骼** | 方块模型分组 → 自动映射为骨骼 | P0     |
| **SkinnedMesh 绑定**  | 几何体绑定到骨骼              | P0     |
| **自动蒙皮权重**      | 基于距离衰减的自动权重分配    | P1     |
| **骨骼变换 Gizmo**    | 选中骨骼后用 Gizmo 调整姿态   | P1     |

#### Phase 3 — 高级动画功能

| 功能                   | 描述                                 | 优先级 |
| ---------------------- | ------------------------------------ | ------ |
| **曲线编辑器**         | 贝塞尔插值曲线视图 (可展开)          | P1     |
| **动画过渡/crossfade** | 两段动画之间的平滑过渡               | P1     |
| **动画混合**           | 同时播放多层动画 (如 idle + wave)    | P1     |
| **循环模式**           | Once/Loop/PingPong/Clamp             | P1     |
| **动画事件帧**         | 在特定时间触发回调/脚本              | P2     |
| **IK/FK 切换**         | 正向/反向运动学 (可选)               | P2     |
| **导出动画**           | 单独导出 AnimationClip 为 .anim 文件 | P2     |

---

## 5.5 Home 工作台

### 5.1 页面结构

```
Home (路由: / )
│
├── /editor          → A3DE 编辑器 (当前主界面)
│
├── /voxel-editor   → 方块建模器 (新增独立界面)
│
├── /settings        → 设置中心
│
└── /resources       → 资源库管理器 (可选独立页)
```

### 5.2 技术实现方式

两种可选方案：

| 方案                       | 实现                                                        | 优缺点                                                           |
| -------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- |
| **A: React Router 多页面** | 使用 react-router-dom，Home 作为 layout，子路由切换不同界面 | 简洁、标准 SPA 做法；但需处理 Three.js Scene 的挂载/卸载生命周期 |
| **B: Tab 切换**            | Home 顶部 Tab 栏，切换时 show/hide 不同组件                 | 所有界面常驻内存，切换无重建开销；但内存占用较高                 |

**推荐方案 A (Router)**：

- 各界面独立性更好，避免全局状态污染
- 可以通过 `keepalive` 或状态提升保留未激活界面的状态
- 与 VS Code / Unity Hub 的用户体验一致

### 5.3 全局资源库

#### 存储路径

```
~/Documents/Astra3DEngine/Resources/
├── models/
│   ├── character.glb
│   ├── tree.avox
│   └── ...
├── materials/
├── textures/
├── animations/
│   └── walk.anim
└── index.json           // 资源索引 (名称/类型/标签/缩略图)
```

#### 资源索引格式

```typescript
interface ResourceIndex {
  version: string;
  resources: ResourceEntry[];
}

interface ResourceEntry {
  id: string; // UUID
  name: string;
  type: 'model' | 'material' | 'texture' | 'animation';
  format: string; // 'glb' | 'avox' | 'png' | 'anim'
  filePath: string; // 相对路径
  thumbnail?: string; // 缩略图路径
  tags: string[];
  createdAt: string;
  updatedAt: string;
  meta: Record<string, any>; // 扩展元数据
}
```

---

## 5.6 技术选型总表

| 技术           | 选型                                 | 用途                 | 来源/理由                      |
| -------------- | ------------------------------------ | -------------------- | ------------------------------ |
| **3D 渲染**    | Three.js                             | 所有 3D 内容渲染     | 已有依赖                       |
| **方块渲染**   | `InstancedMesh`                      | 万级方块高性能渲染   | Three.js 内置                  |
| **时间轴渲染** | Canvas 2D (自绘或 `astral-timeline`) | 时间轴/Dope Sheet    | Astral3D 已验证；比 DOM 高性能 |
| **变换控件**   | `TransformControls`                  | 移动/旋转/缩放 Gizmo | Three.js 内置 (examples/jsm/)  |
| **骨骼可视化** | `SkeletonHelper`                     | 骨骼线框显示         | Three.js 内置                  |
| **GLTF 导出**  | `GLTFExporter`                       | 模型导出             | Three.js 内置                  |
| **GLTF 导入**  | `GLTFLoader`                         | 模型加载             | Three.js 内置                  |
| **动画混合器** | `AnimationMixer`                     | 运行时动画播放       | Three.js 内置                  |
| **状态管理**   | Zustand / React Context              | 动画状态管理         | 与现有架构一致                 |
| **撤销重做**   | Command Pattern + Immer              | 操作历史             | 轻量 immutable                 |
| **路由**       | react-router-dom v6                  | Home 多页面切换      | 标准 SPA 方案                  |
| **UI 组件**    | 现有组件体系                         | 面板/按钮/Modal 等   | 复用现有                       |

---

## 5.7 开发阶段规划

### 第一阶段：基础架构搭建

| 任务            | 说明                                | 依赖      |
| --------------- | ----------------------------------- | --------- |
| Home 工作台框架 | Router 布局 + 页面切换 + 项目入口   | 无        |
| 全局资源库骨架  | 存储目录 + 索引文件 + 基础 CRUD API | Home 框架 |
| A3DE 路由迁移   | 将当前 A3DE 主界面嵌入 /editor 路由 | Home 框架 |

### 第二阶段：方块建模器 MVP

| 任务                 | 说明                           | 依赖      |
| -------------------- | ------------------------------ | --------- |
| 建模器页面框架       | 独立 Three.js Scene + 基础布局 | Home 框架 |
| InstancedMesh 渲染器 | 方块绘制 + 拾取                | 无        |
| 画笔/橡皮擦工具      | 基础绘制交互                   | 渲染器    |
| 选择 + 变换工具      | 选中 + TransformControls       | 渲染器    |
| 调色板               | 颜色选择 UI                    | 无        |
| 撤销/重做            | 历史栈                         | 数据层    |
| 图层/分组            | 树形面板 + Group 管理          | 数据层    |
| GLTF 导出            | 合并几何体 + 导出              | 渲染器    |
| 项目保存/打开        | .avox 格式读写                 | 数据层    |

### 第三阶段：骨骼动画引擎 — 播放与编辑

| 任务                  | 说明                          | 依赖             |
| --------------------- | ----------------------------- | ---------------- |
| AnimationManager 核心 | mixerMap/actionMap + 工厂方法 | 无               |
| 动画面板 UI           | 播放控制栏 + 动画列表         | Manager 核心     |
| 时间轴 Canvas         | Dope Sheet 渲染 + 交互        | 无               |
| 轨道树解析            | Clip.tracks → 树形结构        | Manager 核心     |
| 关键帧 CRUD           | 添加/删除/拖动 + 双向绑定     | 时间轴 + Manager |
| 播放头同步            | Mixer 更新 → 播放头滚动       | 以上全部         |

### 第四阶段：骨骼系统

| 任务              | 说明                      | 依赖             |
| ----------------- | ------------------------- | ---------------- |
| SkeletonManager   | 骨骼 CRUD + 层级管理      | 无               |
| 骨骼可视化        | SkeletonHelper + 编辑面板 | SkeletonManager  |
| 从 Group 生成骨骼 | 建模器 Group → Bone 层级  | SkeletonManager  |
| SkinnedMesh 绑定  | 几何体 + 骨骼 + 权重      | SkeletonManager  |
| 自动蒙皮权重      | 距离衰减算法              | SkinnedMesh 绑定 |
| 骨骼变换 Gizmo    | 选中骨骼的姿态调整        | 骨骼可视化       |

### 第五阶段：打磨与高级功能

| 任务          | 说明                    | 依赖       |
| ------------- | ----------------------- | ---------- |
| 曲线编辑器    | 贝塞尔插值可视化        | 时间轴     |
| 动画混合/过渡 | crossfade + layer blend | 运行时     |
| 建模器多视图  | 正交三视图              | 建模器 MVP |
| 性能优化      | Web Worker + GPU Picker | 全局       |
| 资源库完善    | 缩略图/标签/搜索        | 资源库骨架 |

---

## 5.8 风险与应对

| 风险                           | 影响         | 应对策略                              |
| ------------------------------ | ------------ | ------------------------------------- |
| InstancedMesh 单实例拾取复杂   | 影响编辑体验 | 空间哈希加速 + GPU Picker 备选        |
| 万级方块编辑操作卡顿           | 影响响应性   | Web Worker 离线计算 + 增量更新        |
| 时间轴 Canvas 开发量大         | 延长开发周期 | 优先实现简化版（线性插值），后续迭代  |
| 骨骼蒙皮权重效果不自然         | 动画质量差   | 初期自动绑定 + 后期手动刷权重         |
| 多页面间 Three.js Context 冲突 | 渲染异常     | 每个页面独立 Scene/Renderer/Camera    |
| 资源库文件并发写入冲突         | 数据损坏     | 写锁 + 队列化写入                     |
| 内存占用过高 (多界面常驻)      | 卡顿         | Router 方案按需挂载卸载；大模型懒加载 |

---

## 5.9 附录：Astral3D 蓝本参考文件

| 文件             | 路径                                                                                         | 内容                      |
| ---------------- | -------------------------------------------------------------------------------------------- | ------------------------- |
| AnimationManager | `Astral3D/packages/sdk/lib/core/animation/AnimationManager.ts`                               | 动画混合器管理 + 轨道工厂 |
| TimelineTrack    | `Astral3D/packages/sdk/lib/core/animation/TimelineTrack.ts`                                  | 时间轴核心逻辑            |
| Animation Store  | `Astral3D/packages/editor/src/store/modules/animation.ts`                                    | Pinia 状态管理            |
| 动画面板容器     | `Astral3D/packages/editor/src/views/editor/components/extraPane/animation/index.vue`         | 播放控制栏                |
| 时间轴主体       | `Astral3D/packages/editor/src/views/editor/components/extraPane/animation/Animation.vue`     | 轨道树 + Canvas 时间轴    |
| 动画列表         | `Astral3D/packages/editor/src/views/editor/components/extraPane/animation/AnimationList.vue` | 片段选择下拉              |
| 侧边栏动画面板   | `Astral3D/packages/editor/src/views/editor/layouts/sidebar/SidebarAnimations.vue`            | 动画列表 + 时间缩放       |
| 关键帧按钮       | `Astral3D/packages/editor/src/components/es/EsKeyFrame.vue`                                  | 属性旁的关键帧添加按钮    |
