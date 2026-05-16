# Astra 3D Engine - 项目格式设计文档

## 概述

本文档定义 Astra 3D Engine 项目的存储格式、文件结构和序列化机制。设计目标是：

- **开发友好**：文件夹结构便于编辑和版本控制
- **分享便捷**：支持导出为单一压缩包文件
- **增量保存**：只保存修改的部分，提升性能
- **引用稳定**：资源移动后引用不断

---

## 一、主流引擎方案对比

| 引擎 | 格式 | 优点 | 缺点 |
|------|------|------|------|
| **Unity** | 文件夹 + .meta 文件 | Git 友好、增量保存、资源引用清晰 | 分享需打包、文件分散 |
| **Godot** | 文件夹 + .tscn 文本场景 | 文本格式可读、Git 冲突易解决 | 分享需打包、文件分散 |
| **Blender** | 单文件 .blend | 便于分享、自包含 | 大文件性能差、无法增量保存 |
| **Unreal** | .uproject + Content/ | 功能强大、资源管理完善 | 复杂、体积大 |

**Astra 采用方案**：开发阶段使用文件夹结构，分享时导出为 `.astra` 压缩包。

---

## 二、项目文件夹结构

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

## 三、核心文件格式定义

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

## 四、资源引用机制

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
            message: `Missing reference: ${ref.guid} in scene ${scene.name}`
          });
        }
      }
    }
    
    return errors;
  }
}
```

---

## 五、压缩包格式 (.astra)

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
  compression: 'DEFLATE',      // 压缩算法
  compressionLevel: 6,         // 压缩级别 (1-9)
  includeLibrary: false,       // 是否包含缓存
  includeBuild: false,         // 是否包含构建输出
  encryptAssets: false,        // 是否加密资源
  password: null               // 加密密码
};
```

---

## 六、保存策略

### 6.1 增量保存机制

| 操作 | 保存策略 | 性能 |
|------|----------|------|
| 修改对象属性 | 只保存当前场景文件 | ~10ms |
| 添加/删除对象 | 保存当前场景文件 | ~10ms |
| 切换场景 | 保存当前场景，加载新场景 | ~100ms |
| 导入资源 | 写入资源文件 + 生成 .meta | ~100ms |
| 项目设置变更 | 保存 settings.json | ~5ms |

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

## 七、项目管理器实现

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
      mainScene: 'main'
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
      compressionOptions: { level: options.compressionLevel || 6 }
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
        meta: meta
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

## 八、版本控制集成

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
      persistent: true
    });
    
    this.watcher
      .on('add', path => this.handleChange('add', path))
      .on('change', path => this.handleChange('change', path))
      .on('unlink', path => this.handleChange('unlink', path));
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

## 九、错误处理与恢复

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
      buttons: ['清理缓存', '取消']
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

## 十、性能优化

### 10.1 大型项目处理

| 策略 | 描述 |
|------|------|
| 懒加载场景 | 只加载当前编辑的场景 |
| 资源预览缓存 | 缩略图单独存储 |
| 增量序列化 | 只序列化变更的对象 |
| Web Worker | 后台保存，不阻塞 UI |

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
      preview: { thumbnailPath: thumbnail }
    };
    
    return { asset: optimized, meta };
  }
}
```

---

## 十一、总结

| 场景 | 方案 |
|------|------|
| **本地开发** | 文件夹结构 + JSON 格式 |
| **版本控制** | Git + .gitignore |
| **分享项目** | 导出为 .astra 压缩包 |
| **自动保存** | 增量保存 + 定时触发 |
| **资源引用** | GUID 系统 |
| **错误恢复** | 自动备份 + 错误处理 |

此设计兼顾了开发效率、版本控制友好性和分享便捷性，适合 Web 端 3D 游戏引擎的使用场景。
