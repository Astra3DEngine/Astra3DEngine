# Astra3DEngine — 方块建模器与骨骼动画引擎策划案

> 版本: v1.0 | 日期: 2026-06-04
> 状态: 规划中

---

## 一、愿景与定位

Astra3DEngine（以下简称 **A3DE**）将从当前的 3D 场景编辑器，扩展为一个包含 **模型创建工具 + 骨骼动画引擎** 的完整工作台。用户可以在同一生态内完成从"造物"到"让物动起来"的全流程。

### 核心目标

1. 内置 **方块建模器（Voxel Editor）**：通过固定大小方块搭建 GLTF 模型，作为独立界面运行
2. 内置 **骨骼动画引擎（Animation Engine）**：集成在 A3DE 主编辑器内部，支持骨骼创建、关键帧编辑、动画播放与混合
3. 建立 **Home 工作台**：统一入口，管理项目、资源库、各工具界面切换
4. 建立 **全局资源库**：跨项目共享的资产中心，建模器产物存入此处供所有项目引用

---

## 二、整体架构

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

| 原则 | 说明 |
|------|------|
| **Home 是容器** | 类似 VS Code Activity Bar / Unity Hub，提供项目管理和工具入口 |
| **A3DE 与建模器平级** | 都是 Home 下的一级界面，各自独立运行 |
| **资源库全局共享** | 建模器产出的模型存入资源库，任何项目都能引用 |
| **项目只存引用** | 项目文件记录资源路径/ID，不复制资源本身 |

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

## 三、模块 A：方块建模器（Voxel Editor）

### 3.1 定位

- **独立界面**：不在 A3DE 内部弹窗，而是 Home 下的平级页面
- **资产创建工具**：类似 Blockbench / MagicaVoxel 的体素建模体验
- **产出物**：GLTF/GLB 模型 → 存入全局资源库

### 3.2 技术方案

#### 渲染核心：InstancedMesh

这是性能的关键决策。采用 Three.js `InstancedMesh` 实现万级方块的流畅渲染：

| 对比项 | 方案 A: 每方块一 Mesh | 方案 B: InstancedMesh (采用) | 方案 C: 合并几何体 |
|--------|---------------------|---------------------------|-----------------|
| Draw Calls | N (每方块一次) | **1 (全部)** | 1 |
| 10000 方块 FPS | ~5 | **60+** | 60+ |
| 单独拾取 | 天然支持 | 需额外实现 | 困难 |
| 动态增删 | 天然支持 | 需更新矩阵数组 | 需重建几何体 |
| 适用场景 | 少量方块 | **大量动态方块** | 静态模型 |

```javascript
// 核心渲染架构示意
class VoxelRenderer {
  constructor(scene, maxVoxels = 65536) {
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, maxVoxels);
    this.mesh.instanceMatrix = new THREE.InstancedBufferAttribute(
      new Float32Array(maxVoxels * 16), 16 // 4x4 matrix
    );
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(maxVoxels * 4), 4    // RGBA
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
  voxelSize: number;           // 方块单位尺寸 (默认 1)
  gridSize: { x: number; y: number; z: number }; // 网格范围

  // 方块数据
  voxels: Voxel[];

  // 分组/图层 (对应未来的骨骼绑定)
  groups: VoxelGroup[];

  // 调色板
  palette: string[];           // HEX 颜色数组

  // 元数据
  meta: {
    created: string;
    modified: string;
    author?: string;
  };
}

interface Voxel {
  id: string;                  // 唯一标识
  position: [number, number, number]; // 网格坐标 (整数)
  colorIndex: number;          // 调色板索引
  groupId: string;             // 所属分组 ID
}

interface VoxelGroup {
  id: string;
  name: string;                // 如 "Head", "Body", "LeftArm"
  parentId: string | null;     // 父组 ID (null = 根节点)
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

| 功能 | 描述 | 优先级 |
|------|------|--------|
| **3D 视口** | OrbitControls 旋转/缩放/平移，网格地面参考 | P0 |
| **画笔工具** | 点击网格面添加方块，按住拖动连续绘制 | P0 |
| **橡皮擦工具** | 点击/拖动删除方块 | P0 |
| **选择工具** | 点击选中单个方块，框选多个方块 | P0 |
| **移动工具** | TransformControls Gizmo 移动选中方块 | P0 |
| **调色板** | 预设颜色面板 + 自定义取色器 | P0 |
| **撤销/重做** | 操作历史栈 (至少 50 步) | P0 |
| **图层/分组** | 树形层级面板，支持嵌套分组 | P1 |
| **镜像绘制** | X/Y/Z 轴对称绘制模式 | P1 |
| **快捷键** | G(移动)/R(旋转)/S(缩放)/Delete/Ctrl+Z 等 | P1 |

#### Phase 2 — 导出导入

| 功能 | 描述 | 优先级 |
|------|------|--------|
| **导出 GLTF/GLB** | 将方块合并为单一 Mesh，使用 GLTFExporter 导出 | P0 |
| **保存/打开项目** | 自定义 JSON 格式 (.avox)，含完整编辑状态 | P0 |
| **导入 GLTF** | 加载外部模型到场景中作为参考 | P1 |
| **导入 VOX** | 兼容 MagicaVoxel 格式 (可选) | P2 |

#### Phase 3 — 高级功能

| 功能 | 描述 | 优先级 |
|------|------|--------|
| **多视图** | 正交三视图 (顶/前/侧) + 透视视图 | P1 |
| **材质系统** | 基础 PBR (粗糙度/金属度/法线) | P2 |
| **纹理绘制** | UV 展开后的贴图绘制模式 (类 Blockbench) | P2 |
| **批量操作** | 复制/粘贴/阵列/镜像阵列 | P2 |

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

| 问题 | 应对策略 |
|------|---------|
| 大量方块导致卡顿 | InstancedMesh 单 draw call；Web Worker 处理数据计算 |
| 撤销重做内存膨胀 | 命令模式 (Command Pattern) + 快照压缩；限制历史步数 |
| 导出大模型耗时 | Web Worker 中执行几何体合并 + GLTF 导出 |
| 拾取延迟 | 空间哈希加速射线检测；或 GPU Picker 方案 |

---

## 四、模块 B：骨骼动画引擎（Animation Engine）

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
    case 'position':  return new VectorKeyframeTrack(name, times, values);
    case 'rotation':  return new VectorKeyframeTrack(name, times, values);
    case 'scale':     return new VectorKeyframeTrack(name, times, values);
    case 'quaternion':return new QuaternionKeyframeTrack(name, times, values);
    case 'color':
    case 'emissive':  return new ColorKeyframeTrack(name, times, values);
    case 'opacity':
    case 'intensity':
    case 'roughness':
    case 'metalness': return new NumberKeyframeTrack(name, times, values);
    case 'visible':
    case 'wireframe': return new BooleanKeyframeTrack(name, times, values);
    default:          return new KeyframeTrack(name, times, values);
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
  model: ITimelineModel;  // { rows: ITimelineRow[] }

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
  length: number;           // 显示长度
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

| 操作 | 说明 |
|------|------|
| 点击空白区域 | 移动播放头 |
| 拖动播放头 | 跳转时间，场景实时预览该帧姿态 |
| 拖动关键帧 | 移动关键帧时间位置 (防抖更新) |
| 右键关键帧 | 删除关键帧 |
| 点击属性行旁的 ◆ 按钮 | 在当前时间为该属性添加关键帧 |
| 滚轮 | 缩放时间轴 |
| 拖动时间轴背景 | 平移时间轴 |
| 树节点展开/折叠 | 控制对应轨道行的显示/隐藏 |

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

| 功能 | 描述 | 优先级 |
|------|------|--------|
| **动画列表显示** | 选中带动画的对象后显示其 AnimationClip 列表 | P0 |
| **播放控制** | 播放/暂停/停止/跳转首尾 | P0 |
| **时间轴 Dope Sheet** | Canvas 渲染的时间轴，显示关键帧 | P0 |
| **轨道树** | 解析 Clip.tracks 为树形结构显示 | P0 |
| **添加关键帧** | 在当前时间为选定属性插入关键帧 | P0 |
| **删除关键帧** | 选中关键帧后删除 | P0 |
| **拖动关键帧** | 移动关键帧时间位置 | P0 |
| **播放速度调节** | timeScale 控制 | P0 |
| **时间格式化** | 00:00:00 格式显示 | P0 |

#### Phase 2 — 骨骼系统

| 功能 | 描述 | 优先级 |
|------|------|--------|
| **骨骼创建面板** | 在 UI 中创建/编辑骨骼层级 | P0 |
| **骨骼可视化** | SkeletonHelper 显示骨骼线框 | P0 |
| **从 Group 生成骨骼** | 方块模型分组 → 自动映射为骨骼 | P0 |
| **SkinnedMesh 绑定** | 几何体绑定到骨骼 | P0 |
| **自动蒙皮权重** | 基于距离衰减的自动权重分配 | P1 |
| **骨骼变换 Gizmo** | 选中骨骼后用 Gizmo 调整姿态 | P1 |

#### Phase 3 — 高级动画功能

| 功能 | 描述 | 优先级 |
|------|------|--------|
| **曲线编辑器** | 贝塞尔插值曲线视图 (可展开) | P1 |
| **动画过渡/crossfade** | 两段动画之间的平滑过渡 | P1 |
| **动画混合** | 同时播放多层动画 (如 idle + wave) | P1 |
| **循环模式** | Once/Loop/PingPong/Clamp | P1 |
| **动画事件帧** | 在特定时间触发回调/脚本 | P2 |
| **IK/FK 切换** | 正向/反向运动学 (可选) | P2 |
| **导出动画** | 单独导出 AnimationClip 为 .anim 文件 | P2 |

---

## 五、Home 工作台

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

| 方案 | 实现 | 优缺点 |
|------|------|--------|
| **A: React Router 多页面** | 使用 react-router-dom，Home 作为 layout，子路由切换不同界面 | 简洁、标准 SPA 做法；但需处理 Three.js Scene 的挂载/卸载生命周期 |
| **B: Tab 切换** | Home 顶部 Tab 栏，切换时 show/hide 不同组件 | 所有界面常驻内存，切换无重建开销；但内存占用较高 |

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
  id: string;            // UUID
  name: string;
  type: 'model' | 'material' | 'texture' | 'animation';
  format: string;        // 'glb' | 'avox' | 'png' | 'anim'
  filePath: string;      // 相对路径
  thumbnail?: string;    // 缩略图路径
  tags: string[];
  createdAt: string;
  updatedAt: string;
  meta: Record<string, any>; // 扩展元数据
}
```

---

## 六、技术选型总表

| 技术 | 选型 | 用途 | 来源/理由 |
|------|------|------|----------|
| **3D 渲染** | Three.js | 所有 3D 内容渲染 | 已有依赖 |
| **方块渲染** | `InstancedMesh` | 万级方块高性能渲染 | Three.js 内置 |
| **时间轴渲染** | Canvas 2D (自绘或 `astral-timeline`) | 时间轴/Dope Sheet | Astral3D 已验证；比 DOM 高性能 |
| **变换控件** | `TransformControls` | 移动/旋转/缩放 Gizmo | Three.js 内置 (examples/jsm/) |
| **骨骼可视化** | `SkeletonHelper` | 骨骼线框显示 | Three.js 内置 |
| **GLTF 导出** | `GLTFExporter` | 模型导出 | Three.js 内置 |
| **GLTF 导入** | `GLTFLoader` | 模型加载 | Three.js 内置 |
| **动画混合器** | `AnimationMixer` | 运行时动画播放 | Three.js 内置 |
| **状态管理** | Zustand / React Context | 动画状态管理 | 与现有架构一致 |
| **撤销重做** | Command Pattern + Immer | 操作历史 | 轻量 immutable |
| **路由** | react-router-dom v6 | Home 多页面切换 | 标准 SPA 方案 |
| **UI 组件** | 现有组件体系 | 面板/按钮/Modal 等 | 复用现有 |

---

## 七、开发阶段规划

### 第一阶段：基础架构搭建

| 任务 | 说明 | 依赖 |
|------|------|------|
| Home 工作台框架 | Router 布局 + 页面切换 + 项目入口 | 无 |
| 全局资源库骨架 | 存储目录 + 索引文件 + 基础 CRUD API | Home 框架 |
| A3DE 路由迁移 | 将当前 A3DE 主界面嵌入 /editor 路由 | Home 框架 |

### 第二阶段：方块建模器 MVP

| 任务 | 说明 | 依赖 |
|------|------|------|
| 建模器页面框架 | 独立 Three.js Scene + 基础布局 | Home 框架 |
| InstancedMesh 渲染器 | 方块绘制 + 拾取 | 无 |
| 画笔/橡皮擦工具 | 基础绘制交互 | 渲染器 |
| 选择 + 变换工具 | 选中 + TransformControls | 渲染器 |
| 调色板 | 颜色选择 UI | 无 |
| 撤销/重做 | 历史栈 | 数据层 |
| 图层/分组 | 树形面板 + Group 管理 | 数据层 |
| GLTF 导出 | 合并几何体 + 导出 | 渲染器 |
| 项目保存/打开 | .avox 格式读写 | 数据层 |

### 第三阶段：骨骼动画引擎 — 播放与编辑

| 任务 | 说明 | 依赖 |
|------|------|------|
| AnimationManager 核心 | mixerMap/actionMap + 工厂方法 | 无 |
| 动画面板 UI | 播放控制栏 + 动画列表 | Manager 核心 |
| 时间轴 Canvas | Dope Sheet 渲染 + 交互 | 无 |
| 轨道树解析 | Clip.tracks → 树形结构 | Manager 核心 |
| 关键帧 CRUD | 添加/删除/拖动 + 双向绑定 | 时间轴 + Manager |
| 播放头同步 | Mixer 更新 → 播放头滚动 | 以上全部 |

### 第四阶段：骨骼系统

| 任务 | 说明 | 依赖 |
|------|------|------|
| SkeletonManager | 骨骼 CRUD + 层级管理 | 无 |
| 骨骼可视化 | SkeletonHelper + 编辑面板 | SkeletonManager |
| 从 Group 生成骨骼 | 建模器 Group → Bone 层级 | SkeletonManager |
| SkinnedMesh 绑定 | 几何体 + 骨骼 + 权重 | SkeletonManager |
| 自动蒙皮权重 | 距离衰减算法 | SkinnedMesh 绑定 |
| 骨骼变换 Gizmo | 选中骨骼的姿态调整 | 骨骼可视化 |

### 第五阶段：打磨与高级功能

| 任务 | 说明 | 依赖 |
|------|------|------|
| 曲线编辑器 | 贝塞尔插值可视化 | 时间轴 |
| 动画混合/过渡 | crossfade + layer blend | 运行时 |
| 建模器多视图 | 正交三视图 | 建模器 MVP |
| 性能优化 | Web Worker + GPU Picker | 全局 |
| 资源库完善 | 缩略图/标签/搜索 | 资源库骨架 |

---

## 八、风险与应对

| 风险 | 影响 | 应对策略 |
|------|------|---------|
| InstancedMesh 单实例拾取复杂 | 影响编辑体验 | 空间哈希加速 + GPU Picker 备选 |
| 万级方块编辑操作卡顿 | 影响响应性 | Web Worker 离线计算 + 增量更新 |
| 时间轴 Canvas 开发量大 | 延长开发周期 | 优先实现简化版（线性插值），后续迭代 |
| 骨骼蒙皮权重效果不自然 | 动画质量差 | 初期自动绑定 + 后期手动刷权重 |
| 多页面间 Three.js Context 冲突 | 渲染异常 | 每个页面独立 Scene/Renderer/Camera |
| 资源库文件并发写入冲突 | 数据损坏 | 写锁 + 队列化写入 |
| 内存占用过高 (多界面常驻) | 卡顿 | Router 方案按需挂载卸载；大模型懒加载 |

---

## 九、附录：Astral3D 蓝本参考文件

| 文件 | 路径 | 内容 |
|------|------|---------|
| AnimationManager | `Astral3D/packages/sdk/lib/core/animation/AnimationManager.ts` | 动画混合器管理 + 轨道工厂 |
| TimelineTrack | `Astral3D/packages/sdk/lib/core/animation/TimelineTrack.ts` | 时间轴核心逻辑 |
| Animation Store | `Astral3D/packages/editor/src/store/modules/animation.ts` | Pinia 状态管理 |
| 动画面板容器 | `Astral3D/packages/editor/src/views/editor/components/extraPane/animation/index.vue` | 播放控制栏 |
| 时间轴主体 | `Astral3D/packages/editor/src/views/editor/components/extraPane/animation/Animation.vue` | 轨道树 + Canvas 时间轴 |
| 动画列表 | `Astral3D/packages/editor/src/views/editor/components/extraPane/animation/AnimationList.vue` | 片段选择下拉 |
| 侧边栏动画面板 | `Astral3D/packages/editor/src/views/editor/layouts/sidebar/SidebarAnimations.vue` | 动画列表 + 时间缩放 |
| 关键帧按钮 | `Astral3D/packages/editor/src/components/es/EsKeyFrame.vue` | 属性旁的关键帧添加按钮 |
