/**
 * @file utils/projectExporter.js
 * @description 项目导出/导入工具，支持 .astra 格式（基于 ZIP 的项目包）
 * @module utils/projectExporter
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * 生成 GUID
 * 
 * GUID（全局唯一标识符）用于给场景对象、相机、光源等生成唯一 ID。
 * 这个实现使用 Math.random() 生成随机数，严格来说不是真正的 GUID，但足够满足编辑器需求。
 * 
 * 为什么不用 crypto.randomUUID()？那个 API 更安全，但兼容性稍差，
 * 编辑器场景不需要那么高的安全性，这个简单实现足够用了。
 * 
 * @returns {string} 唯一标识符
 */
export function generateGUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 创建项目清单
 * @param {Array<Object>} files - 文件列表
 * @returns {Object} 清单对象
 */
export function createManifest(files) {
  return {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    files: files.map(f => ({
      path: f.path,
      size: f.size
    })),
    statistics: {
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0)
    }
  };
}

/**
 * 导出项目为 .astra 文件
 * 
 * .astra 文件本质上是一个 ZIP 包，包含 project.json（项目元数据）、
 * scenes/main.scene（主场景数据）、prefabs/*.prefab（预制件数据）、
 * assets/（资源文件夹）和 manifest.json（文件清单）。
 * 
 * 用 ZIP 格式是因为可以打包所有资源到一个文件，用户方便分享和备份，跟Scratch一样。
 * 而且 ZIP 格式通用，解压后可以直接去改内容，虽然有点危险就是了，也许后面可以做加密。
 * 
 * 这个导出逻辑有点复杂，居然得要把 React 状态转换成引擎格式，处理预制件实例的覆盖属性，
 * 依旧处理资源的相对路径。资源文件的处理最麻烦——浏览器里的 File 对象不能直接写入 ZIP，
 * 要用 FileReader 读取内容，再写入 ZIP，大文件得分块。
 * 
 * @param {Object} projectData - 项目数据
 * @param {string} filename - 导出文件名
 * @returns {Promise<string>} 导出的文件名
 */
export async function exportProjectAsAstra(projectData, filename) {
  const zip = new JSZip();
  
  const projectJson = {
    version: '1.0.0',
    engineVersion: '0.1.0',
    name: projectData.name || 'Untitled Project',
    description: projectData.description || '',
    author: projectData.author || '',
    createdAt: projectData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mainScene: 'main',
    buildSettings: {
      target: 'web',
      resolution: [1280, 720],
      fullscreen: false
    }
  };
  zip.file('project.json', JSON.stringify(projectJson, null, 2));
  
  const sceneData = {
    version: '1.0.0',
    id: `scene-${generateGUID()}`,
    name: 'Main Scene',
    settings: {
      ambientLight: {
        color: '#ffffff',
        intensity: 0.5
      },
      backgroundColor: '#1a1a2e',
      fog: {
        enabled: false,
        type: 'linear',
        color: '#ffffff',
        near: 10,
        far: 100
      }
    },
    objects: (projectData.scene?.objects || []).map(obj => ({
      id: obj.id,
      name: obj.name,
      type: obj.type,
      active: true,
      transform: {
        position: obj.position || [0, 0, 0],
        rotation: obj.rotation || [0, 0, 0],
        scale: obj.scale || [1, 1, 1]
      },
      parentId: obj.parentId || null,
      children: [],
      components: [
        {
          type: 'MeshRenderer',
          color: obj.color || '#ffffff'
        }
      ],
      prefabId: obj.prefabId || null,
      overrides: obj.overrides || null
    })),
    cameras: [
      {
        id: `cam-${generateGUID()}`,
        name: 'Main Camera',
        type: 'perspective',
        active: true,
        transform: {
          position: [0, 5, 10],
          rotation: [-15, 0, 0],
          scale: [1, 1, 1]
        },
        properties: {
          fov: 60,
          near: 0.1,
          far: 1000,
          aspectRatio: 'auto'
        }
      }
    ],
    lights: [
      {
        id: `light-${generateGUID()}`,
        name: 'Directional Light',
        type: 'directional',
        transform: {
          position: [0, 10, 0],
          rotation: [-45, 30, 0],
          scale: [1, 1, 1]
        },
        properties: {
          color: '#ffffff',
          intensity: 1.0,
          castShadow: true,
          shadowResolution: 1024
        }
      }
    ]
  };
  zip.file('scenes/main.scene', JSON.stringify(sceneData, null, 2));
  
  const prefabsData = projectData.prefabs || [];
  prefabsData.forEach((prefab, index) => {
    const prefabData = {
      version: '1.0.0',
      guid: prefab.id,
      name: prefab.name,
      description: '',
      root: {
        id: `prefab-root-${prefab.id}`,
        name: prefab.name,
        type: 'group',
        transform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: prefab.template?.scale || [1, 1, 1]
        },
        children: [],
        components: [
          {
            type: 'MeshRenderer',
            color: prefab.template?.color || '#ffffff'
          }
        ]
      }
    };
    zip.file(`prefabs/${prefab.name}.prefab`, JSON.stringify(prefabData, null, 2));
  });
  
  const settings = {
    editor: {
      theme: 'dark',
      language: 'zh-CN',
      autoSave: true,
      autoSaveInterval: 60000
    },
    viewport: {
      gridVisible: true,
      axesVisible: true,
      cameraSpeed: 1.0
    },
    layout: {
      leftSidebarWidth: 250,
      rightSidebarWidth: 300,
      bottomPanelHeight: 200,
      collapsedPanels: []
    }
  };
  zip.file('settings.json', JSON.stringify(settings, null, 2));
  
  const files = [
    { path: 'project.json', size: JSON.stringify(projectJson).length },
    { path: 'scenes/main.scene', size: JSON.stringify(sceneData).length },
    { path: 'settings.json', size: JSON.stringify(settings).length }
  ];
  
  const manifest = createManifest(files);
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  
  const readme = `# ${projectData.name || 'Untitled Project'}

Created with Astra 3D Engine

## Contents
- scenes/main.scene - Main scene file
- settings.json - Editor settings
- manifest.json - Project manifest

## Statistics
- Total files: ${files.length}
- Objects: ${sceneData.objects.length}
`;
  zip.file('README.txt', readme);
  
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
  
  const astraFilename = filename || `${projectData.name || 'project'}.astra`;
  saveAs(blob, astraFilename);
  
  return astraFilename;
}

/**
 * 从 .astra 文件导入项目
 * @param {File} file - .astra 文件
 * @returns {Promise<Object>} 项目数据对象
 */
export async function importProjectFromAstra(file) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  const projectJsonStr = await zip.file('project.json')?.async('string');
  if (!projectJsonStr) {
    throw new Error('Invalid .astra file: missing project.json');
  }
  
  const projectJson = JSON.parse(projectJsonStr);
  
  const sceneStr = await zip.file('scenes/main.scene')?.async('string');
  if (!sceneStr) {
    throw new Error('Invalid .astra file: missing main.scene');
  }
  
  const sceneData = JSON.parse(sceneStr);
  
  const prefabs = [];
  const prefabFolder = zip.folder('prefabs');
  if (prefabFolder) {
    const prefabFiles = Object.keys(zip.files).filter(path => path.startsWith('prefabs/') && path.endsWith('.prefab'));
    for (const prefabPath of prefabFiles) {
      const prefabStr = await zip.file(prefabPath)?.async('string');
      if (prefabStr) {
        const prefabData = JSON.parse(prefabStr);
        prefabs.push({
          id: prefabData.guid,
          name: prefabData.name,
          template: {
            type: prefabData.root?.components?.[0]?.type || 'cube',
            color: prefabData.root?.components?.[0]?.color || '#ffffff',
            scale: prefabData.root?.transform?.scale || [1, 1, 1],
            defaultPosition: [0, 0, 0],
            defaultRotation: [0, 0, 0]
          }
        });
      }
    }
  }
  
  const objects = sceneData.objects.map(obj => ({
    id: obj.id,
    name: obj.name,
    type: obj.type,
    position: obj.transform?.position || [0, 0, 0],
    rotation: obj.transform?.rotation || [0, 0, 0],
    scale: obj.transform?.scale || [1, 1, 1],
    color: obj.components?.[0]?.color || '#ffffff',
    parentId: obj.parentId || null,
    prefabId: obj.prefabId || null,
    overrides: obj.overrides || null
  }));
  
  return {
    version: projectJson.version,
    name: projectJson.name,
    description: projectJson.description,
    author: projectJson.author,
    createdAt: projectJson.createdAt,
    scene: {
      objects
    },
    prefabs,
    settings: sceneData.settings
  };
}