# Astra 3D Engine - 多场景系统设计文档

## 一、概述

多场景系统是 Astra 3D Engine 的核心功能之一，允许用户在一个项目中创建、管理和切换多个场景。这对于制作多关卡游戏、分离 UI 场景、管理大型项目至关重要。

### 设计目标

- **场景隔离**：每个场景独立管理自己的对象层级
- **快速切换**：场景切换流畅，不丢失数据
- **主场景标识**：标记游戏启动时加载的场景
- **持久化支持**：每个场景单独保存为 `.scene` 文件
- **资源共享**：所有场景共享同一个资源库（assets）

---

## 二、数据结构设计

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
    id: 'scene-main-001',       // 场景唯一标识
    name: 'Main Scene',         // 场景名称
    objects: [],                // 场景中的对象列表
    isMain: true,               // 是否为主场景
    createdAt: '2026-06-15T10:00:00Z',
    updatedAt: '2026-06-15T15:30:00Z',
    settings: {                 // 场景设置
      ambientLight: { color: '#ffffff', intensity: 0.5 },
      backgroundColor: '#1a1a2e',
      fog: { enabled: false }
    }
  }
]);

// 当前激活的场景 ID
const [currentSceneId, setCurrentSceneId] = useState('scene-main-001');

// 获取当前场景（计算属性）
const currentScene = scenes.find(s => s.id === currentSceneId);
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

## 三、UI 设计

### 3.1 场景选择器

在层级面板（HierarchyPanel）顶部添加场景选择器：

``┌─────────────────────────────────┐
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
└─────────────────────────────────┘``

### 3.2 场景下拉菜单内容

点击场景下拉菜单显示：

``┌─────────────────────────────────┐
│ ⭐ Main Scene                   │  ← 主场景（带星号）
│   Level 1                       │
│   Level 2                       │
│   UI Scene                      │
│ ─────────────────────           │  ← 分隔线
│ + New Scene                     │  ← 新建场景
└─────────────────────────────────┘``

### 3.3 场景右键菜单

右键点击场景项显示：

``┌─────────────────────────────────┐
│ Rename                          │
│ Duplicate                       │
│ Set as Main Scene               │  ← 仅非主场景显示
│ ─────────────────────           │
│ Delete                          │  ← 主场景不可删除
└─────────────────────────────────┘``

---

## 四、核心功能实现

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
    settings: getDefaultSceneSettings()
  };
  
  setScenes(prev => [...prev, newScene]);
  setCurrentSceneId(newId);
}, [scenes.length]);
```

#### 删除场景

```javascript
const handleDeleteScene = useCallback((sceneId) => {
  const scene = scenes.find(s => s.id === sceneId);
  
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
  
  setScenes(prev => prev.filter(s => s.id !== sceneId));
  
  // 如果删除的是当前场景，切换到主场景
  if (currentSceneId === sceneId) {
    const mainScene = scenes.find(s => s.isMain);
    setCurrentSceneId(mainScene?.id || scenes[0].id);
  }
}, [scenes, currentSceneId]);
```

#### 重命名场景

```javascript
const handleRenameScene = useCallback((sceneId, newName) => {
  setScenes(prev => prev.map(s => 
    s.id === sceneId 
      ? { ...s, name: newName, updatedAt: new Date().toISOString() }
      : s
  ));
}, []);
```

#### 设置主场景

```javascript
const handleSetMainScene = useCallback((sceneId) => {
  setScenes(prev => prev.map(s => ({
    ...s,
    isMain: s.id === sceneId,
    updatedAt: s.id === sceneId ? new Date().toISOString() : s.updatedAt
  })));
}, []);
```

### 4.2 场景切换逻辑

```javascript
const handleSwitchScene = useCallback((newSceneId) => {
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
}, [hasUnsavedChanges, currentSceneId]);
```

### 4.3 对象操作适配

所有对象操作需要针对当前场景进行：

```javascript
// 添加对象
const handleAddObject = useCallback((type) => {
  const newObject = createObject(type);
  
  setScenes(prev => prev.map(s => 
    s.id === currentSceneId
      ? { ...s, objects: [...s.objects, newObject], updatedAt: new Date().toISOString() }
      : s
  ));
}, [currentSceneId]);

// 更新对象
const handleUpdateObject = useCallback((objectId, updates) => {
  setScenes(prev => prev.map(s => 
    s.id === currentSceneId
      ? {
          ...s,
          objects: s.objects.map(obj => 
            obj.id === objectId ? { ...obj, ...updates } : obj
          ),
          updatedAt: new Date().toISOString()
        }
      : s
  ));
}, [currentSceneId]);

// 删除对象
const handleDeleteObject = useCallback((objectId) => {
  setScenes(prev => prev.map(s => 
    s.id === currentSceneId
      ? {
          ...s,
          objects: s.objects.filter(obj => obj.id !== objectId),
          updatedAt: new Date().toISOString()
        }
      : s
  ));
}, [currentSceneId]);
```

---

## 五、预制件系统适配

预制件（Prefab）是跨场景共享的资源，不存储在场景中：

```javascript
// 预制件独立管理，不属于任何场景
const [prefabs, setPrefabs] = useState([]);

// 实例化预制件到当前场景
const handleInstantiatePrefab = useCallback((prefabId) => {
  const prefab = prefabs.find(p => p.id === prefabId);
  if (!prefab) return;
  
  const instance = createPrefabInstance(prefab);
  
  setScenes(prev => prev.map(s => 
    s.id === currentSceneId
      ? { ...s, objects: [...s.objects, instance], updatedAt: new Date().toISOString() }
      : s
  ));
}, [prefabs, currentSceneId]);
```

---

## 六、文件存储格式

### 6.1 项目文件夹结构

``MyProject/
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
└── settings.json             # 编辑器设置``

### 6.2 project.json 更新

```json
{
  "version": "1.0.0",
  "name": "My Game",
  "mainScene": "scene-main-001",    // 主场景 ID
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

## 七、导出/导入适配

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

## 八、运行时支持

### 8.1 游戏启动流程

```javascript
// 运行时加载主场景
async function startGame(project) {
  // 1. 找到主场景
  const mainScene = project.scenes.find(s => s.id === project.mainScene);
  
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

## 九、实现步骤

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

## 十、注意事项

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

## 十一、总结

多场景系统是 Astra 3D Engine 从单场景编辑器升级为完整游戏引擎的关键功能。通过合理的 UI 设计、数据结构改造和持久化支持，用户可以轻松管理多关卡游戏、分离 UI 场景，为后续的游戏运行时打下基础。