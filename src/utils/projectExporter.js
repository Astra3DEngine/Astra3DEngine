/**
 * @file utils/projectExporter.js
 * @description 项目导出/导入工具，支持 .astra 格式（基于 ZIP 的项目包）
 * @module utils/projectExporter
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { PROJECT_FORMAT_VERSION, ENGINE_META } from '../meta.js';
import { generateGUID } from './id.js';
import { editorObjectToEngineObject, engineObjectToEditorObject } from './projectSchema.js';
import { Settings } from '../settings/settingsRegistry.js';
import { getLocale } from '../i18n/index.js';

const readSetting = (key, fallback) => {
  try {
    const value = Settings.get(key);
    return value === undefined ? fallback : value;
  } catch {
    return fallback;
  }
};

/**
 * 创建项目清单
 * @param {Array<Object>} files - 文件列表
 * @returns {Object} 清单对象
 */
export function createManifest(files) {
  return {
    version: PROJECT_FORMAT_VERSION,
    createdAt: new Date().toISOString(),
    files: files.map((f) => ({
      path: f.path,
      size: f.size,
    })),
    statistics: {
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
    },
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
    version: PROJECT_FORMAT_VERSION,
    engineVersion: ENGINE_META.version,
    name: projectData.name || 'Untitled Project',
    description: projectData.description || '',
    author: projectData.author || '',
    createdAt: projectData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mainScene: 'main',
    buildSettings: {
      target: 'web',
      resolution: [1280, 720],
      fullscreen: false,
    },
  };
  zip.file('project.json', JSON.stringify(projectJson, null, 2));

  // 兼容多场景（{ scenes: [...] }）与旧单场景（{ scene: { objects } }）两种输入
  const scenes = Array.isArray(projectData.scenes) ? projectData.scenes : null;
  const mainScene = scenes
    ? scenes.find((s) => s.id === projectData.mainScene) ||
      scenes.find((s) => s.isMain) ||
      scenes[0]
    : null;
  const sceneObjects = mainScene ? mainScene.objects : projectData.scene?.objects || [];

  const sceneData = {
    version: PROJECT_FORMAT_VERSION,
    id: `scene-${mainScene?.id || generateGUID()}`,
    name: mainScene?.name || 'Main Scene',
    settings: {
      ambientLight: {
        color: '#ffffff',
        intensity: 0.5,
      },
      backgroundColor: '#1a1a2e',
      fog: {
        enabled: false,
        type: 'linear',
        color: '#ffffff',
        near: 10,
        far: 100,
      },
      ...(mainScene?.settings || {}),
    },
    objects: sceneObjects.map(editorObjectToEngineObject),
    cameras: [
      {
        id: `cam-${generateGUID()}`,
        name: 'Main Camera',
        type: 'perspective',
        active: true,
        transform: {
          position: [0, 5, 10],
          rotation: [-15, 0, 0],
          scale: [1, 1, 1],
        },
        properties: {
          fov: 60,
          near: 0.1,
          far: 1000,
          aspectRatio: 'auto',
        },
      },
    ],
    lights: [
      {
        id: `light-${generateGUID()}`,
        name: 'Directional Light',
        type: 'directional',
        transform: {
          position: [0, 10, 0],
          rotation: [-45, 30, 0],
          scale: [1, 1, 1],
        },
        properties: {
          color: '#ffffff',
          intensity: 1.0,
          castShadow: true,
          shadowResolution: 1024,
        },
      },
    ],
  };
  zip.file('scenes/main.scene', JSON.stringify(sceneData, null, 2));

  const prefabsData = projectData.prefabs || [];
  prefabsData.forEach((prefab) => {
    const prefabData = {
      version: PROJECT_FORMAT_VERSION,
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
          scale: prefab.template?.scale || [1, 1, 1],
        },
        children: [],
        components: [
          {
            type: 'MeshRenderer',
            color: prefab.template?.color || '#ffffff',
          },
        ],
      },
    };
    zip.file(`prefabs/${prefab.name}.prefab`, JSON.stringify(prefabData, null, 2));
  });

  const settings = {
    editor: {
      theme: readSetting('theme', 'dark'),
      language: getLocale(),
      autoSave: readSetting('autosaveEnabled', true),
      autoSaveInterval: 60000,
    },
    viewport: {
      gridVisible: true,
      axesVisible: true,
      cameraSpeed: 1.0,
    },
    layout: {
      leftSidebarWidth: 250,
      rightSidebarWidth: 300,
      bottomPanelHeight: 200,
      collapsedPanels: [],
    },
  };
  zip.file('settings.json', JSON.stringify(settings, null, 2));

  // manifest 基于 zip 内真实文件生成，避免遗漏 prefabs/README 等
  const readme = `# ${projectData.name || 'Untitled Project'}

Created with Astra 3D Engine

## Contents
- scenes/main.scene - Main scene file
- settings.json - Editor settings
- manifest.json - Project manifest

## Statistics
- Total files: ${zip.files.length}
- Objects: ${sceneData.objects.length}
`;
  zip.file('README.txt', readme);

  const files = Object.keys(zip.files)
    .filter((path) => !path.endsWith('/'))
    .map((path) => ({ path, size: zip.file(path)?._data?.length || 0 }));

  const manifest = createManifest(files);
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
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

  // 版本校验：仅接受已知格式版本
  const SUPPORTED_VERSIONS = ['0.1.0', '1.0.0'];
  if (!SUPPORTED_VERSIONS.includes(projectJson.version)) {
    throw new Error(`Unsupported .astra format version: ${projectJson.version}`);
  }

  const sceneStr = await zip.file('scenes/main.scene')?.async('string');
  if (!sceneStr) {
    throw new Error('Invalid .astra file: missing main.scene');
  }

  const sceneData = JSON.parse(sceneStr);

  const prefabs = [];
  const prefabFolder = zip.folder('prefabs');
  if (prefabFolder) {
    const prefabFiles = Object.keys(zip.files).filter(
      (path) => path.startsWith('prefabs/') && path.endsWith('.prefab')
    );
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
            defaultRotation: [0, 0, 0],
          },
        });
      }
    }
  }

  const objects = sceneData.objects.map(engineObjectToEditorObject);

  return {
    version: projectJson.version,
    name: projectJson.name,
    description: projectJson.description,
    author: projectJson.author,
    createdAt: projectJson.createdAt,
    mainScene: 'scene-main-001',
    scenes: [
      {
        id: 'scene-main-001',
        name: sceneData.name || 'Main Scene',
        isMain: true,
        createdAt: projectJson.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: sceneData.settings,
        objects,
      },
    ],
    prefabs,
    settings: sceneData.settings,
  };
}
