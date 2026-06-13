/**
 * @file App.jsx
 * @description Astra 3D Engine 主应用组件，整合所有编辑器功能模块
 * @module App
 * 
 * 主要职责：
 * - 状态管理：场景对象、资源、预制件、选择状态、主题、语言等
 * - 文件操作：项目保存、加载、新建、导出/导入
 * - 对象操作：添加、删除、更新、复制、粘贴、重命名
 * - 预制件系统：创建、实例化、更新、断开连接
 * - 快捷键处理：保存、撤销、重做、工具切换
 * - 插件系统初始化
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import MultiViewport from './components/MultiViewport.jsx';
import HierarchyPanel from './components/HierarchyPanel.jsx';
import InspectorPanel from './components/InspectorPanel.jsx';
import AssetsPanel from './components/AssetsPanel.jsx';
import PrefabsPanel from './components/PrefabsPanel.jsx';
import Toolbar from './components/Toolbar.jsx';
import PreferencesModal from './components/PreferencesModal.jsx';
import SnapshotsModal from './components/SnapshotsModal.jsx';
import PluginSettingsModal from './components/PluginSettingsModal.jsx';
import ResizablePanel from './components/ResizablePanel.jsx';
import FileBrowserDialog from './components/FileBrowserDialog.jsx';
import { msg, toggleLocale, getLocale, setLocale } from './i18n/index.js';
import { useHistory } from './hooks/useHistory.js';
import { useAutoSave } from './hooks/useAutoSave.js';
import { useRecentProjects } from './hooks/useRecentProjects.js';
import { useDialog, DialogProvider } from './hooks/useDialog.jsx';
import { useToast, ToastProvider } from './hooks/useToast.jsx';
import { exportProjectAsAstra, importProjectFromAstra } from './utils/projectExporter.js';
import { initPlugins, getPluginManager, setPluginLocale } from './plugins';
import createPluginApi from './plugins/api.js';
import { applyTheme } from './utils/themeManager.js';

const getBasename = (filePath) => {
  if (!filePath) return '';
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1] || '';
};

/**
 * 应用核心内容组件
 * @description 包含所有编辑器状态和功能的实际实现
 * @returns {JSX.Element} 编辑器界面
 */
function AppContent() {
  const dialog = useDialog();
  const toast = useToast();
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedObjects, setSelectedObjects] = useState([]);
  const {
    state: sceneObjects,
    setState: setSceneObjectsWithHistory,
    recordCurrentState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetHistory
  } = useHistory([]);
  const [currentTool, setCurrentTool] = useState('select');
  const [isPlaying, setIsPlaying] = useState(false);
  const [locale, setLocaleState] = useState(getLocale());
  // 光渲染开关状态，默认开启喵
  const [lightRenderingEnabled, setLightRenderingEnabled] = useState(() => {
    const saved = localStorage.getItem('astra-light-rendering');
    return saved !== 'false'; // 默认开启，只有明确设置为 'false' 才关闭
  });
  
  useEffect(() => {
    setPluginLocale(getLocale());
  }, []);
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [prefabs, setPrefabs] = useState([]);
  const [selectedPrefab, setSelectedPrefab] = useState(null);
  const gltfLoaderRef = useRef(new GLTFLoader());
  const objLoaderRef = useRef(new OBJLoader());
  const fileHandleRef = useRef(null);
  const [projectFileName, setProjectFileName] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('astra-theme');
    return saved || 'dark';
  });
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isSnapshotsOpen, setIsSnapshotsOpen] = useState(false);
  const [isPluginSettingsOpen, setIsPluginSettingsOpen] = useState(false);
  const [isFileBrowserOpen, setIsFileBrowserOpen] = useState(false);
  const [fileBrowserMode, setFileBrowserMode] = useState('open');
  const [fileBrowserResolve, setFileBrowserResolve] = useState(null);
  const [isAssetsPanelCollapsed, setIsAssetsPanelCollapsed] = useState(() => {
    const saved = localStorage.getItem('astra-panel-assets-collapsed');
    return saved === 'true';
  });
  const pluginManagerRef = useRef(null);
  
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    const saved = localStorage.getItem('astra-autosave-enabled');
    return saved !== 'false';
  });
  
  const [maxSnapshots, setMaxSnapshots] = useState(() => {
    const saved = localStorage.getItem('astra-max-snapshots');
    return saved ? parseInt(saved, 10) : 10;
  });
  
  const [hierarchyCollapsed, setHierarchyCollapsed] = useState(() => {
    const saved = localStorage.getItem('astra-panel-hierarchy-collapsed');
    return saved === 'true';
  });
  const [prefabsCollapsed, setPrefabsCollapsed] = useState(() => {
    const saved = localStorage.getItem('astra-panel-prefabs-collapsed');
    return saved === 'true';
  });
  const [inspectorCollapsed, setInspectorCollapsed] = useState(() => {
    const saved = localStorage.getItem('astra-panel-inspector-collapsed');
    return saved === 'true';
  });
  
  const leftSidebarAllCollapsed = hierarchyCollapsed && prefabsCollapsed;

  const hasFileSystemAccess = 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  const handleToggleLocale = useCallback(() => {
    toggleLocale();
    const newLocale = getLocale();
    setLocaleState(newLocale);
    setPluginLocale(newLocale);
  }, []);

  const handleSetLocale = useCallback((locale) => {
    setLocale(locale);
    setLocaleState(locale);
    setPluginLocale(locale);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme(prev => {
      const newTheme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('astra-theme', newTheme);
      applyTheme(newTheme);
      return newTheme;
    });
  }, []);

  const handleSetTheme = useCallback((newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('astra-theme', newTheme);
    applyTheme(newTheme);
  }, []);

  const handleToggleAutoSave = useCallback(() => {
    setAutoSaveEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('astra-autosave-enabled', String(newValue));
      return newValue;
    });
  }, []);

  const handleSetMaxSnapshots = useCallback((value) => {
    const clampedValue = Math.max(1, Math.min(50, value));
    setMaxSnapshots(clampedValue);
    localStorage.setItem('astra-max-snapshots', String(clampedValue));
  }, []);

  // 光渲染开关变化处理喵
  const handleLightRenderingChange = useCallback((enabled) => {
    setLightRenderingEnabled(enabled);
    localStorage.setItem('astra-light-rendering', String(enabled));
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const initPluginSystem = async () => {
      pluginManagerRef.current = await initPlugins();
      
      const api = createPluginApi({
        sceneObjects,
        setSceneObjects: setSceneObjectsWithHistory,
        selectedObjectId: selectedObject?.id,
        setSelectedObjectId: (id) => {
          const obj = sceneObjects.find(o => o.id === id);
          setSelectedObject(obj);
        },
        assets,
        setAssets,
        prefabs,
        setPrefabs,
        theme,
        setTheme,
        locale,
        setLocale: handleSetLocale,
        showNotification: (message, type) => {
          if (type === 'success') toast.success(message);
          else if (type === 'error') toast.error(message);
          else toast.info(message);
        },
        viewportRef: null,
        sceneRef: null,
        cameraRef: null,
        rendererRef: null,
      });
      
      pluginManagerRef.current.setApi(api);
    };
    
    initPluginSystem();
  }, []);

  /**
   * 对象选择处理
   * 
   * 这里实现了多选逻辑，支持 Ctrl+点击切换选中状态。如果对象已选中就取消选中，
   * 如果对象未选中就添加到选中列表。这简直是天才般的逻辑。
   * 
   * 取消选中后，需要更新 selectedObject（单选状态），用 setTimeout 延迟更新，
   * 避免 React 批量更新冲突，于是就 setSelectedObjects 和 setSelectedObject 在同一个函数里调用，
   * WTF，批量处理的时候还可能导致 selectedObject 更新不及时。看来只能 setTimeout 0 强制在下一个事件循环更新。
   * 
   * 更好的方案是使用 useReducer 统一管理选中状态，但现在的更简单直观，毕竟秉持着能跑就行。
   * 
   * @param {Object} object - 要选中的对象
   * @param {boolean} isMultiSelect - 是否多选模式
   * @param {Array} objectsToSelect - 要选中的对象列表（用于文件夹选中所有子对象）
   */
  const handleObjectSelect = useCallback((object, isMultiSelect = false, objectsToSelect = null) => {
    if (!object) return;
    
    if (objectsToSelect) {
      if (isMultiSelect) {
        setSelectedObjects(prev => {
          const allIds = new Set(objectsToSelect.map(o => o.id));
          const isAlreadySelected = prev.some(o => o && allIds.has(o.id));
          if (isAlreadySelected) {
            const newSelection = prev.filter(o => o && !allIds.has(o.id));
            setTimeout(() => {
              setSelectedObject(newSelection.length > 0 ? newSelection[0] : null);
            }, 0);
            return newSelection;
          } else {
            setSelectedObject(object);
            return [...prev, ...objectsToSelect];
          }
        });
      } else {
        setSelectedObject(object);
        setSelectedObjects(objectsToSelect);
      }
      return;
    }
    
    if (isMultiSelect) {
      setSelectedObjects(prev => {
        const isSelected = prev.some(o => o && o.id === object.id);
        if (isSelected) {
          const newSelection = prev.filter(o => o && o.id !== object.id);
          setTimeout(() => {
            setSelectedObject(newSelection.length > 0 ? newSelection[0] : null);
          }, 0);
          return newSelection;
        } else {
          setSelectedObject(object);
          return [...prev, object];
        }
      });
    } else {
      setSelectedObject(object);
      setSelectedObjects([object]);
    }
  }, []);

  /**
   * 生成唯一的对象名称
   * 
   * 如果名称已存在，会自动添加数字后缀，例如：
   * - "Cube" -> "Cube_1"（如果"Cube"已存在）
   * - "Cube_1" -> "Cube_2"（如果"Cube_1"已存在）
   * 
   * 这个函数确保每个对象的名称都是唯一的，避免在层级面板中混淆，
   * 也防止基于名称的查找逻辑失效。
   * 
   * @param {string} baseName - 基础名称
   * @param {Array} existingObjects - 已存在的对象列表
   * @param {number} excludeId - 要排除的对象ID（用于重命名时排除自己）
   * @returns {string} 唯一的名称
   */
  const generateUniqueName = useCallback((baseName, existingObjects, excludeId = null) => {
    const existingNames = existingObjects
      .filter(obj => obj.id !== excludeId)
      .map(obj => obj.name);
    
    if (!existingNames.includes(baseName)) {
      return baseName;
    }
    
    const match = baseName.match(/^(.+?)_(\d+)$/);
    if (match) {
      const prefix = match[1];
      const num = parseInt(match[2]);
      let newName = `${prefix}_${num + 1}`;
      while (existingNames.includes(newName)) {
        newName = `${prefix}_${parseInt(newName.split('_').pop()) + 1}`;
      }
      return newName;
    }
    
    let counter = 1;
    let newName = `${baseName}_${counter}`;
    while (existingNames.includes(newName)) {
      counter++;
      newName = `${baseName}_${counter}`;
    }
    return newName;
  }, []);

  /**
   * 添加对象到场景
   * 
   * 支持的对象类型：
   * - cube：立方体
   * - sphere：球体
   * - plane：平面
   * - folder：文件夹（用于组织对象）
   * - model：模型（需要asset参数）
   * 
   * @param {string} type - 对象类型
   * @param {Object} asset - 资源对象（模型时使用）
   */
  const handleAddObject = useCallback((type, asset = null) => {
    setSceneObjectsWithHistory(prev => {
      let baseName;
      let newObject;
      
      if (type === 'folder') {
        baseName = 'Folder';
        const uniqueName = generateUniqueName(baseName, prev);
        
        newObject = {
          id: Date.now(),
          name: uniqueName,
          type: 'folder',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          isFolder: true,
          children: []
        };
      } else if (type === 'pointLight') {
        baseName = 'Point Light';
        const uniqueName = generateUniqueName(baseName, prev);
        
        newObject = {
          id: Date.now(),
          name: uniqueName,
          type: 'pointLight',
          position: [0, 2, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          color: '#ffffff',
          intensity: 2, // 提高默认强度
          distance: 10, // 设置有效距离
          decay: 1, // 降低衰减
          isLight: true,
          lightType: 'point'
        };
      } else if (type === 'directionalLight') {
        baseName = 'Directional Light';
        const uniqueName = generateUniqueName(baseName, prev);
        
        newObject = {
          id: Date.now(),
          name: uniqueName,
          type: 'directionalLight',
          position: [1, 2, 1],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          color: '#ffffff',
          intensity: 1.5, // 提高默认强度
          isLight: true,
          lightType: 'directional'
        };
      } else if (type === 'spotLight') {
        baseName = 'Spot Light';
        const uniqueName = generateUniqueName(baseName, prev);
        
        newObject = {
          id: Date.now(),
          name: uniqueName,
          type: 'spotLight',
          position: [0, 2, 0],
          rotation: [-Math.PI / 4, 0, 0],
          scale: [1, 1, 1],
          color: '#ffffff',
          intensity: 3, // 提高默认强度
          distance: 10, // 设置有效距离
          decay: 1, // 降低衰减
          angle: Math.PI / 4, // 增大角度
          penumbra: 0.3, // 添加半影
          isLight: true,
          lightType: 'spot'
        };
      } else if (asset && (asset.type === 'gltf' || asset.type === 'glb' || asset.type === 'obj')) {
        baseName = asset.name.replace(/\.[^.]+$/, '');
        const uniqueName = generateUniqueName(baseName, prev);
        
        newObject = {
          id: Date.now(),
          name: uniqueName,
          type: 'model',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          color: '#ffffff',
          assetId: asset.id,
          isModel: true,
          textureId: null,
          uvScale: [1, 1],
          uvOffset: [0, 0]
        };
      } else {
        baseName = type.charAt(0).toUpperCase() + type.slice(1);
        const uniqueName = generateUniqueName(baseName, prev);
        
        newObject = {
          id: Date.now(),
          name: uniqueName,
          type: type,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          color: '#66ccff',
          faceTextures: type === 'cube' ? {
            right: null,
            left: null,
            top: null,
            bottom: null,
            front: null,
            back: null
          } : undefined,
          textureId: (type === 'sphere' || type === 'plane') ? null : undefined,
          uvScale: (type === 'sphere' || type === 'plane') ? [1, 1] : undefined,
          uvOffset: (type === 'sphere' || type === 'plane') ? [0, 0] : undefined
        };
      }
      
      setSelectedObject(newObject);
      setSelectedObjects([newObject]);
      return [...prev, newObject];
    });
  }, [setSceneObjectsWithHistory, generateUniqueName]);

  const textureLoaderRef = useRef(new THREE.TextureLoader());

  /**
   * 导入资源处理
   * 
   * 这里处理文件导入，支持三种类型：
   * - GLTF/GLB 模型：使用 GLTFLoader 加载，计算边界盒和中心点
   * - OBJ 模型：使用 OBJLoader 加载，OBJ 不像 GLTF 有 scene 属性，直接返回 Group/Mesh
   * - 图片文件：使用 TextureLoader 加载，设置正确的 colorSpace
   * 
   * OBJ 文件加载后需要手动计算边界盒，因为 OBJLoader 返回的是原始几何体。
   * 
   * 使用 URL.createObjectURL 创建临时 URL，删除资源时要 URL.revokeObjectURL 释放内存，
   * 不然内存泄漏了直接老冯飞天。
   *
   * 对于带 resourceMap 的 GLTF 文件，使用 URL modifier 来拦截资源加载请求喵！
   */
  const handleImportAsset = useCallback((fileOrObject) => {
    // 检查是否是带 resourceMap 的对象喵！
    if (fileOrObject && fileOrObject.file && fileOrObject.resourceMap) {
      console.log('Importing GLTF with resourceMap:', fileOrObject);
      console.log('resourceMap keys:', Array.from(fileOrObject.resourceMap.keys()));
      
      const file = fileOrObject.file;
      const resourceMap = fileOrObject.resourceMap;
      
      const asset = {
        id: Date.now(),
        name: file.name,
        type: 'gltf',
        assetType: 'model',
        file: file,
        url: URL.createObjectURL(file)
      };
      
      // 创建 URL modifier 来拦截资源加载请求喵！
      // 将 GLTF 文件中引用的资源路径转换为 blob URL
      const urlMap = new Map();
      
      // 为每个资源文件创建 blob URL
      // 难以想象为什么会有人导入模型文件夹
      for (const [relativePath, resourceFile] of resourceMap) {
        const blobUrl = URL.createObjectURL(resourceFile);
        urlMap.set(relativePath, blobUrl);
        console.log('Created blob URL for', relativePath, ':', blobUrl);
      }
      
      console.log('urlMap keys:', Array.from(urlMap.keys()));
      
      // 创建自定义的 LoadingManager 喵！
      const manager = new THREE.LoadingManager();
      
      // 使用 setURLModifier 来拦截 URL 喵！
      manager.setURLModifier((url) => {
        console.log('URL modifier received:', url);
        
        // 尝试多种路径格式来匹配喵！
        // GLTF 文件中的路径可能是：
        // - 相对路径（如 textures/xxx.jpg）
        // - 文件名（如 xxx.bin）
        // - 带 ./ 前缀的路径（如 ./textures/xxx.jpg）
        
        // 1. 直接匹配
        if (urlMap.has(url)) {
          console.log('URL matched directly:', url, '->', urlMap.get(url));
          return urlMap.get(url);
        }
        
        // 2. 去掉 ./ 前缀后匹配
        const urlWithoutDotSlash = url.startsWith('./') ? url.substring(2) : url;
        if (urlMap.has(urlWithoutDotSlash)) {
          console.log('URL matched after removing ./:', url, '->', urlMap.get(urlWithoutDotSlash));
          return urlMap.get(urlWithoutDotSlash);
        }
        
        // 3. 添加 ./ 前缀后匹配
        const urlWithDotSlash = './' + url;
        if (urlMap.has(urlWithDotSlash)) {
          console.log('URL matched after adding ./:', url, '->', urlMap.get(urlWithDotSlash));
          return urlMap.get(urlWithDotSlash);
        }
        
        // 4. 尝试匹配文件名
        const fileName = url.split('/').pop();
        for (const [key, blobUrl] of urlMap) {
          const keyFileName = key.split('/').pop();
          if (keyFileName === fileName) {
            console.log('URL matched by filename:', url, '->', blobUrl);
            return blobUrl;
          }
        }
        
        console.log('URL not matched:', url);
        return url;
      });
      
      // 创建 GLTFLoader 并使用自定义的 LoadingManager 
      const gltfLoader = new GLTFLoader(manager);
      
      // 使用 FileReader 读取 GLTF 文件内容
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target.result;
        
        // 使用 parse 方法而不是 load 方法
        // parse 方法不会修改 URL，这样 URL modifier 可以正确拦截
        gltfLoader.parse(
          arrayBuffer,
          '', // path 参数设置为空字符串
          (gltf) => {
            console.log('GLTF parsed successfully:', gltf);
            
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const center = new THREE.Vector3();
            box.getCenter(center);
            
            asset.gltfScene = gltf.scene;
            asset.center = center.clone();
            asset.size = box.getSize(new THREE.Vector3());
            
            console.log('GLTF scene:', gltf.scene);
            console.log('GLTF scene children:', gltf.scene.children);
            console.log('GLTF center:', center);
            console.log('GLTF size:', asset.size);
            
            // 加载时就设置阴影属性和材质转换喵
            gltf.scene.traverse((child) => {
              if (child.isMesh) {
                child.geometry.computeBoundingBox();
                child.geometry.computeVertexNormals();
                child.castShadow = true;
                child.receiveShadow = true;
                
                if (child.material) {
                  const convertMaterial = (mat) => {
                    if (mat.type === 'MeshBasicMaterial' || 
                        mat.type === 'MeshLambertMaterial' || 
                        mat.type === 'MeshPhongMaterial') {
                      const oldMat = mat;
                      const newMat = new THREE.MeshStandardMaterial({
                        color: oldMat.color || 0xffffff,
                        map: oldMat.map,
                        transparent: oldMat.transparent,
                        opacity: oldMat.opacity,
                        side: THREE.FrontSide,
                        metalness: mat.type === 'MeshPhongMaterial' ? 
                          (oldMat.shininess ? Math.min(oldMat.shininess / 100, 1) : 0.1) : 0.1,
                        roughness: mat.type === 'MeshPhongMaterial' ? 
                          (oldMat.shininess ? 1 - Math.min(oldMat.shininess / 100, 1) : 0.8) : 0.8,
                        emissive: oldMat.emissive || 0x000000
                      });
                      newMat.needsUpdate = true;
                      return newMat;
                    }
                    return mat;
                  };
                  
                  if (Array.isArray(child.material)) {
                    child.material = child.material.map(convertMaterial);
                  } else {
                    child.material = convertMaterial(child.material);
                  }
                }
              }
            });
            
            setAssets(prev => [...prev, asset]);
            console.log('Asset added:', asset);
            
            // 释放 blob URL 喵！
            for (const blobUrl of urlMap.values()) {
              URL.revokeObjectURL(blobUrl);
            }
          },
          (error) => {
            console.error('Error parsing GLTF:', error);
            
            // 你坏了你也给我释放 blob URL 喵！
            for (const blobUrl of urlMap.values()) {
              URL.revokeObjectURL(blobUrl);
            }
          }
        );
      };
      
      reader.readAsArrayBuffer(file);
      return;
    }
    
    // 正常的文件导入
    const file = fileOrObject;
    const fileExt = file.name.split('.').pop().toLowerCase();
    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
    const modelExts = ['gltf', 'glb', 'obj'];
    
    let assetType;
    if (modelExts.includes(fileExt)) {
      assetType = 'model';
    } else if (imageExts.includes(fileExt)) {
      assetType = 'texture';
    } else {
      assetType = 'unknown';
    }

    const asset = {
      id: Date.now(),
      name: file.name,
      type: fileExt,
      assetType: assetType,
      file: file,
      url: URL.createObjectURL(file)
    };

    if (assetType === 'model') {
      // OBJ 文件用 OBJLoader，GLTF/GLB 用 GLTFLoader
      if (fileExt === 'obj') {
        objLoaderRef.current.load(
          asset.url,
          (obj) => {
            // OBJLoader 返回的是 Group，需要计算边界盒
            const box = new THREE.Box3().setFromObject(obj);
            const center = new THREE.Vector3();
            box.getCenter(center);
            
            asset.gltfScene = obj; // 复用 gltfScene 字段存储加载结果
            asset.center = center.clone();
            asset.size = box.getSize(new THREE.Vector3());
            
            // OBJ 模型需要特殊处理：将所有子 Mesh 的位置相对于中心点偏移
            // 这样 clone 后的 modelContent 的几何中心会在局部原点
            // 不然缩放时相对位置计算会出错，模型会乱飞
            obj.traverse((child) => {
              if (child.isMesh) {
                child.geometry.computeBoundingBox();
                child.geometry.computeVertexNormals();
                child.position.sub(center);
                
                child.castShadow = true;
                child.receiveShadow = true;
                
                if (child.material) {
                  const convertMaterial = (mat) => {
                    const oldMat = mat;
                    
                    let specularIntensity = 0;
                    if (oldMat.specular) {
                      specularIntensity = (oldMat.specular.r + oldMat.specular.g + oldMat.specular.b) / 3;
                    }
                    
                    const metalness = specularIntensity < 0.1 ? 0.0 : Math.min(specularIntensity, 0.5);
                    const roughness = oldMat.shininess ? Math.max(1 - oldMat.shininess / 100, 0.5) : 0.8;
                    
                    const newMat = new THREE.MeshStandardMaterial({
                      color: oldMat.color || 0xffffff,
                      map: oldMat.map,
                      transparent: oldMat.transparent,
                      opacity: oldMat.opacity,
                      side: THREE.FrontSide,
                      metalness: metalness,
                      roughness: roughness,
                      emissive: oldMat.emissive || 0x000000
                    });
                    newMat.needsUpdate = true;
                    oldMat.dispose();
                    return newMat;
                  };
                  
                  if (Array.isArray(child.material)) {
                    child.material = child.material.map(convertMaterial);
                  } else {
                    child.material = convertMaterial(child.material);
                  }
                }
              }
            });
            
            obj.position.set(0, 0, 0);
            
            setAssets(prev => [...prev, asset]);
          },
          undefined,
          (error) => {
            console.error('Error loading OBJ:', error);
          }
        );
      } else {
        // GLTF/GLB 加载
        gltfLoaderRef.current.load(
          asset.url,
          (gltf) => {
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const center = new THREE.Vector3();
            box.getCenter(center);
            
            asset.gltfScene = gltf.scene;
            asset.center = center.clone();
            asset.size = box.getSize(new THREE.Vector3());
            
            gltf.scene.traverse((child) => {
              if (child.isMesh) {
                child.geometry.computeBoundingBox();
                child.geometry.computeVertexNormals();
                child.castShadow = true;
                child.receiveShadow = true;
                
                if (child.material) {
                  const convertMaterial = (mat) => {
                    if (mat.type === 'MeshBasicMaterial' || 
                        mat.type === 'MeshLambertMaterial' || 
                        mat.type === 'MeshPhongMaterial') {
                      const oldMat = mat;
                      const newMat = new THREE.MeshStandardMaterial({
                        color: oldMat.color || 0xffffff,
                        map: oldMat.map,
                        transparent: oldMat.transparent,
                        opacity: oldMat.opacity,
                        side: THREE.FrontSide,
                        metalness: mat.type === 'MeshPhongMaterial' ? 
                          (oldMat.shininess ? Math.min(oldMat.shininess / 100, 1) : 0.1) : 0.1,
                        roughness: mat.type === 'MeshPhongMaterial' ? 
                          (oldMat.shininess ? 1 - Math.min(oldMat.shininess / 100, 1) : 0.8) : 0.8,
                        emissive: oldMat.emissive || 0x000000
                      });
                      newMat.needsUpdate = true;
                      return newMat;
                    }
                    return mat;
                  };
                  
                  if (Array.isArray(child.material)) {
                    child.material = child.material.map(convertMaterial);
                  } else {
                    child.material = convertMaterial(child.material);
                  }
                }
              }
            });
            
            setAssets(prev => [...prev, asset]);
          },
          undefined,
          (error) => {
            console.error('Error loading GLTF:', error);
          }
        );
      }
    } else if (assetType === 'texture') {
      textureLoaderRef.current.load(
        asset.url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          asset.texture = texture;
          setAssets(prev => [...prev, asset]);
        },
        undefined,
        (error) => {
          console.error('Error loading texture:', error);
          setAssets(prev => [...prev, asset]);
        }
      );
    } else {
      setAssets(prev => [...prev, asset]);
    }
  }, []);

  /**
   * 选择资源时的处理
   * 
   * 如果选择的是模型资源，直接导入为部件层级。
   */
  const handleSelectAsset = useCallback((asset) => {
    setSelectedAsset(asset);
    if (asset.assetType === 'model' && asset.gltfScene) {
      handleImportModelParts(asset);
    } else if (asset.assetType === 'model') {
      handleAddObject('model', asset);
    }
  }, [handleAddObject]);

  /**
   * 导入模型为部件层级（重写版本喵）
   * 
   * 解析GLTF/OBJ模型的内部层级结构，保留原本的分组关系。
   * Group 转换成 folder 对象，Mesh 转换成 mesh 对象。
   * 
   * meshPath 不包含 gltfScene.name，直接从子对象开始喵！
   * 这样 Viewport.jsx 的查找逻辑就简单了喵！
   */
  const handleImportModelParts = useCallback((asset) => {
    console.log('handleImportModelParts called with asset:', asset);
    console.log('asset.gltfScene:', asset?.gltfScene);
    console.log('asset.gltfScene.name:', asset?.gltfScene?.name);
    console.log('asset.gltfScene.children:', asset?.gltfScene?.children?.map(c => ({ name: c.name, isMesh: c.isMesh, isGroup: c.isGroup })));
    
    if (!asset || !asset.gltfScene) {
      console.log('handleImportModelParts: asset or gltfScene is null, returning');
      return;
    }

    setSceneObjectsWithHistory(prev => {
      console.log('handleImportModelParts: starting to parse model');
      
      const modelBaseName = asset.name.replace(/\.[^.]+$/, '');
      const rootFolderName = generateUniqueName(modelBaseName, prev);
      const baseId = Date.now();
      
      const modelCenter = asset.center || new THREE.Vector3(0, 0, 0);
      console.log('modelCenter:', modelCenter);
      
      const allNewObjects = [];
      let idCounter = 0;
      
      /**
       * 递归解析模型层级结构（简化版本喵）
       * 
       * meshPath 不包含根节点的名称，直接从子对象开始
       * 这样 Viewport.jsx 的查找逻辑就简单了喵！
       * 
       * 这样创建场景模型的时候就可以正常显示和拖动了。
       * 
       * @param {THREE.Object3D} threeObj - Three.js 对象（Group 或 Mesh）
       * @param {number} parentId - 父对象 ID
       * @param {string} meshPath - mesh 的路径（不包含根节点名称）
       * @returns {Object} 创建的场景对象
       */
      const parseObject3D = (threeObj, parentId, meshPath) => {
        const objId = baseId + idCounter;
        idCounter++;
        
        // 获取世界变换
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();
        threeObj.getWorldPosition(worldPos);
        threeObj.getWorldQuaternion(worldQuat);
        threeObj.getWorldScale(worldScale);
        
        // 计算相对于模型中心的位置喵
        const relativePos = worldPos.clone().sub(modelCenter);
        const worldEuler = new THREE.Euler().setFromQuaternion(worldQuat);
        
        // 生成唯一名称
        // 如果有名称，就用它，否则用 Mesh 或 Group 名称
        // 这样可以确保每个对象都有一个唯一的名称，方便查找和管理
        // 以及用来设置父子对象
        const objName = generateUniqueName(threeObj.name || (threeObj.isMesh ? 'Mesh' : 'Group'), [...prev, ...allNewObjects]);
        
        console.log('parseObject3D: threeObj.name=', threeObj.name, 'meshPath=', meshPath, 'isMesh=', threeObj.isMesh);
        
        if (threeObj.isMesh) {
          // Mesh 类型，支持单独贴图喵
          const meshObj = {
            id: objId,
            name: objName,
            type: 'mesh',
            position: [relativePos.x, relativePos.y, relativePos.z],
            rotation: [
              THREE.MathUtils.radToDeg(worldEuler.x),
              THREE.MathUtils.radToDeg(worldEuler.y),
              THREE.MathUtils.radToDeg(worldEuler.z)
            ],
            scale: [worldScale.x, worldScale.y, worldScale.z],
            parentId: parentId,
            assetId: asset.id,
            meshPath: meshPath, // 直接使用传入的 meshPath 喵！
            textureId: null,
            uvScale: [1, 1],
            uvOffset: [0, 0]
          };
          console.log('Created mesh object:', meshObj);
          allNewObjects.push(meshObj);
          return meshObj;
        } else {
          // Group 类型（包括有子对象的任意 Object3D）
          const folderObj = {
            id: objId,
            name: objName,
            type: 'folder',
            position: [relativePos.x, relativePos.y, relativePos.z],
            rotation: [
              THREE.MathUtils.radToDeg(worldEuler.x),
              THREE.MathUtils.radToDeg(worldEuler.y),
              THREE.MathUtils.radToDeg(worldEuler.z)
            ],
            scale: [worldScale.x, worldScale.y, worldScale.z],
            isFolder: true,
            children: [],
            parentId: parentId,
            assetId: asset.id,
            meshPath: meshPath
          };
          console.log('Created folder object:', folderObj);
          
          // 递归处理子对象，meshPath 是子对象的名称喵！
          threeObj.children.forEach(child => {
            // 子对象的 meshPath 是父对象的 meshPath + '/' + 子对象的名称
            // 如果父对象的 meshPath 是空字符串，子对象的 meshPath 就是子对象的名称喵！
            const childMeshPath = meshPath ? `${meshPath}/${child.name}` : child.name;
            const childObj = parseObject3D(child, objId, childMeshPath);
            if (childObj) {
              folderObj.children.push(childObj.id);
            }
          });
          
          allNewObjects.push(folderObj);
          return folderObj;
        }
      };
      
      // 从模型的根节点开始解析喵！
      // 根节点的 meshPath 是空字符串（不包含根节点的名称）
      // 这样 Viewport.jsx 的查找逻辑就简单了喵！
      const rootObj = parseObject3D(asset.gltfScene, null, '');
      
      // 重命名根对象为模型名称喵
      if (rootObj) {
        const existingNames = [...prev, ...allNewObjects.filter(o => o.id !== rootObj.id)];
        rootObj.name = generateUniqueName(rootFolderName, existingNames);
        console.log('Renamed root object to:', rootObj.name);
      }
      
      // 选中根文件夹和所有新创建的对象喵
      if (rootObj) {
        setSelectedObject(rootObj);
        setSelectedObjects(allNewObjects);
        console.log('Selected root object and all new objects:', allNewObjects.length);
      }
      
      console.log('handleImportModelParts: created objects:', allNewObjects);
      return [...prev, ...allNewObjects];
    });
  }, [setSceneObjectsWithHistory, generateUniqueName]);

  const handleDeleteAsset = useCallback((asset) => {
    if (asset.url) {
      URL.revokeObjectURL(asset.url);
    }
    setAssets(prev => prev.filter(a => a.id !== asset.id));
    if (selectedAsset?.id === asset.id) {
      setSelectedAsset(null);
    }
  }, [selectedAsset]);

  const handleRenameAsset = useCallback((asset, newName) => {
    setAssets(prev => prev.map(a => 
      a.id === asset.id ? { ...a, name: newName } : a
    ));
  }, []);

  const handleDeleteObject = useCallback((id) => {
    setSceneObjectsWithHistory(prev => prev.filter(obj => obj.id !== id));
    setSelectedObject(prev => prev && prev.id === id ? null : prev);
    setSelectedObjects(prev => prev.filter(o => o.id !== id));
  }, [setSceneObjectsWithHistory]);

  const handleDeleteSelectedObjects = useCallback(() => {
    if (selectedObjects.length === 0) return;
    
    const idsToDelete = selectedObjects.filter(o => o).map(o => o.id);
    setSceneObjectsWithHistory(prev => prev.filter(obj => !idsToDelete.includes(obj.id)));
    setSelectedObject(null);
    setSelectedObjects([]);
  }, [selectedObjects, setSceneObjectsWithHistory]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      switch (e.key.toLowerCase()) {
        case 'q':
          setCurrentTool('select');
          break;
        case 'w':
          setCurrentTool('move');
          break;
        case 'e':
          setCurrentTool('rotate');
          break;
        case 'r':
          setCurrentTool('scale');
          break;
        case 'delete':
        case 'backspace':
          if (selectedObjects.length > 1) {
            handleDeleteSelectedObjects();
          } else if (selectedObject) {
            handleDeleteObject(selectedObject.id);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObject, selectedObjects, handleDeleteObject, handleDeleteSelectedObjects]);

  const handleUpdateObject = useCallback((id, updates, recordHistory = true) => {
    setSceneObjectsWithHistory(prev => prev.map(obj =>
      obj.id === id ? { ...obj, ...updates } : obj
    ), recordHistory);
    setSelectedObject(prev => prev && prev.id === id ? { ...prev, ...updates } : prev);
  }, [setSceneObjectsWithHistory]);

  const [clipboard, setClipboard] = useState(null);

  /**
   * 复制对象到剪贴板
   * 
   * 支持单选和多选复制：
   * - 单选：复制单个对象
   * - 多选：复制所有选中的对象
   * 
   * @param {number} id - 要复制的对象ID（单选时使用）
   */
  const handleCopyObject = useCallback((id) => {
    if (selectedObjects && selectedObjects.length > 1) {
      const objectsToCopy = selectedObjects.map(obj => ({ ...obj }));
      setClipboard({ type: 'multi', objects: objectsToCopy });
    } else {
      const obj = sceneObjects.find(o => o.id === id);
      if (obj) {
        setClipboard({ type: 'single', object: { ...obj } });
      }
    }
  }, [sceneObjects, selectedObjects]);

  /**
   * 从剪贴板粘贴对象
   * 
   * 支持单选和多选粘贴：
   * - 单选：粘贴单个对象，位置偏移1单位
   * - 多选：粘贴所有对象，每个对象位置偏移1单位
   * 
   * 粘贴后会自动选中新创建的对象。
   */
  const handlePasteObject = useCallback(() => {
    if (!clipboard) return null;

    setSceneObjectsWithHistory(prev => {
      if (clipboard.type === 'multi') {
        const newObjects = clipboard.objects.map((obj, index) => {
          const baseName = obj.name;
          const uniqueName = generateUniqueName(baseName, prev);
          
          return {
            ...obj,
            id: Date.now() + index,
            name: uniqueName,
            position: [
              obj.position[0] + 1,
              obj.position[1],
              obj.position[2]
            ],
            parentId: null
          };
        });
        
        setSelectedObject(newObjects[0]);
        setSelectedObjects(newObjects);
        return [...prev, ...newObjects];
      } else {
        const baseName = clipboard.object.name;
        const uniqueName = generateUniqueName(baseName, prev);

        const newObj = {
          ...clipboard.object,
          id: Date.now(),
          name: uniqueName,
          position: [
            clipboard.object.position[0] + 1,
            clipboard.object.position[1],
            clipboard.object.position[2]
          ],
          parentId: null
        };

        setSelectedObject(newObj);
        setSelectedObjects([newObj]);
        return [...prev, newObj];
      }
    });
    return true;
  }, [clipboard, setSceneObjectsWithHistory, generateUniqueName]);

  /**
   * 复制对象（原地复制）
   * 
   * 支持单选和多选复制：
   * - 单选：复制单个对象，位置偏移1单位
   * - 多选：复制所有选中的对象，每个对象位置偏移1单位
   * 
   * @param {number} id - 要复制的对象ID（单选时使用）
   */
  const handleDuplicateObject = useCallback((id) => {
    setSceneObjectsWithHistory(prev => {
      if (selectedObjects && selectedObjects.length > 1 && 
          selectedObjects.some(o => o && o.id === id)) {
        const newObjects = selectedObjects.map((obj, index) => {
          const baseName = obj.name;
          const uniqueName = generateUniqueName(baseName, prev);
          
          return {
            ...obj,
            id: Date.now() + index,
            name: uniqueName,
            position: [
              obj.position[0] + 1,
              obj.position[1],
              obj.position[2]
            ],
            parentId: null
          };
        });
        
        setSelectedObject(newObjects[0]);
        setSelectedObjects(newObjects);
        return [...prev, ...newObjects];
      } else {
        const obj = prev.find(o => o.id === id);
        if (!obj) return prev;

        const baseName = obj.name;
        const uniqueName = generateUniqueName(baseName, prev);

        const newObj = {
          ...obj,
          id: Date.now(),
          name: uniqueName,
          position: [
            obj.position[0] + 1,
            obj.position[1],
            obj.position[2]
          ],
          parentId: null
        };

        setSelectedObject(newObj);
        setSelectedObjects([newObj]);
        return [...prev, newObj];
      }
    });
    return true;
  }, [setSceneObjectsWithHistory, generateUniqueName, selectedObjects]);

  const handleRenameObject = useCallback((id, newName) => {
    setSceneObjectsWithHistory(prev => {
      const uniqueName = generateUniqueName(newName, prev, id);
      const updatedObjects = prev.map(obj =>
        obj.id === id ? { ...obj, name: uniqueName } : obj
      );
      setSelectedObject(prev => prev && prev.id === id ? { ...prev, name: uniqueName } : prev);
      return updatedObjects;
    }, true);
  }, [setSceneObjectsWithHistory, generateUniqueName]);

  const handleReorderObjects = useCallback((draggedId, targetId, position) => {
    setSceneObjectsWithHistory(prev => {
      const objects = [...prev];

      const draggedIndex = objects.findIndex(o => o.id === draggedId);
      if (draggedIndex === -1) return prev;

      const draggedObj = { ...objects[draggedIndex] };

      const getAllDescendantIds = (parentId) => {
        const descendants = new Set([parentId]);
        objects.filter(o => o.parentId === parentId).forEach(child => {
          const childDescendants = getAllDescendantIds(child.id);
          childDescendants.forEach(id => descendants.add(id));
        });
        return descendants;
      };

      const draggedDescendants = getAllDescendantIds(draggedId);

      if (targetId === null) {
        draggedObj.parentId = null;
        objects.splice(draggedIndex, 1);
        objects.push(draggedObj);
        return objects;
      }

      if (draggedDescendants.has(targetId)) return prev;

      const targetIndex = objects.findIndex(o => o.id === targetId);
      if (targetIndex === -1) return prev;

      const targetObj = objects[targetIndex];

      if (position === 'inside') {
        draggedObj.parentId = targetId;
      } else {
        draggedObj.parentId = targetObj.parentId || null;
      }

      objects.splice(draggedIndex, 1);

      const newTargetIndex = objects.findIndex(o => o.id === targetId);
      if (newTargetIndex === -1) {
        objects.push(draggedObj);
        return objects;
      }

      let insertIndex;
      if (position === 'inside') {
        insertIndex = newTargetIndex + 1;
        for (let i = newTargetIndex + 1; i < objects.length; i++) {
          if (objects[i].parentId === targetId) insertIndex = i + 1;
          else break;
        }
      } else if (position === 'before') {
        insertIndex = newTargetIndex;
      } else {
        insertIndex = newTargetIndex + 1;
        const targetParentId = targetObj.parentId;
        if (targetParentId) {
          for (let i = newTargetIndex + 1; i < objects.length; i++) {
            if (objects[i].parentId === targetParentId) insertIndex = i + 1;
            else break;
          }
        }
      }

      objects.splice(insertIndex, 0, draggedObj);
      return objects;
    });
  }, [setSceneObjectsWithHistory]);

  const handleCreatePrefab = useCallback((objectId) => {
    const obj = sceneObjects.find(o => o.id === objectId);
    if (!obj) return null;

    const prefab = {
      id: Date.now(),
      name: `${obj.name}_Prefab`,
      template: {
        type: obj.type,
        color: obj.color,
        scale: [...obj.scale],
        defaultPosition: [0, 0, 0],
        defaultRotation: [0, 0, 0],
        assetId: obj.assetId,
        isModel: obj.isModel
      }
    };

    setPrefabs(prev => [...prev, prefab]);

    setSceneObjectsWithHistory(prev => prev.map(o =>
      o.id === objectId ? { 
        ...o, 
        prefabId: prefab.id,
        overrides: { scale: false, color: false }
      } : o
    ));

    return prefab;
  }, [sceneObjects, setSceneObjectsWithHistory]);

  const handleInstantiatePrefab = useCallback((prefabId, position = null) => {
    const prefab = prefabs.find(p => p.id === prefabId);
    if (!prefab) return;

    const instancePosition = position || [...prefab.template.defaultPosition];
    const instance = {
      id: Date.now(),
      name: `${prefab.name}_Instance`,
      prefabId: prefab.id,
      type: prefab.template.type,
      position: instancePosition,
      rotation: [...prefab.template.defaultRotation],
      scale: [...prefab.template.scale],
      color: prefab.template.color,
      assetId: prefab.template.assetId,
      isModel: prefab.template.isModel,
      overrides: { scale: false, color: false }
    };

    setSceneObjectsWithHistory(prev => [...prev, instance]);
    return instance;
  }, [prefabs, setSceneObjectsWithHistory]);

  const handleDeletePrefab = useCallback((prefabId) => {
    setSceneObjectsWithHistory(prev => prev.map(obj => 
      obj.prefabId === prefabId 
        ? { 
            ...obj, 
            prefabId: null,
            type: prefabs.find(p => p.id === prefabId)?.template.type || obj.type,
            overrides: undefined
          }
        : obj
    ));

    setPrefabs(prev => prev.filter(p => p.id !== prefabId));
    setSelectedPrefab(prev => prev && prev.id === prefabId ? null : prev);
  }, [prefabs, setSceneObjectsWithHistory]);

  const handleUpdatePrefab = useCallback((prefabId, updates) => {
    setPrefabs(prev => prev.map(p => 
      p.id === prefabId ? { ...p, ...updates } : p
    ));

    setSceneObjectsWithHistory(prev => prev.map(obj => {
      if (obj.prefabId !== prefabId) return obj;

      const prefab = prefabs.find(p => p.id === prefabId);
      if (!prefab) return obj;

      const newObj = { ...obj };
      
      if (!obj.overrides?.scale && updates.template?.scale) {
        newObj.scale = [...updates.template.scale];
      }
      if (!obj.overrides?.color && updates.template?.color) {
        newObj.color = updates.template.color;
      }

      return newObj;
    }), false);
  }, [prefabs, setSceneObjectsWithHistory]);

  const handleDisconnectPrefab = useCallback((objectId) => {
    const obj = sceneObjects.find(o => o.id === objectId);
    if (!obj || !obj.prefabId) return;

    const prefab = prefabs.find(p => p.id === obj.prefabId);
    
    setSceneObjectsWithHistory(prev => prev.map(o =>
      o.id === objectId ? { 
        ...o, 
        prefabId: null,
        type: prefab?.template.type || o.type,
        assetId: prefab?.template.assetId,
        isModel: prefab?.template.isModel,
        overrides: undefined
      } : o
    ));
  }, [sceneObjects, prefabs, setSceneObjectsWithHistory]);

  const handleApplyToPrefab = useCallback((objectId) => {
    const obj = sceneObjects.find(o => o.id === objectId);
    if (!obj || !obj.prefabId) return;

    handleUpdatePrefab(obj.prefabId, {
      template: {
        ...prefabs.find(p => p.id === obj.prefabId)?.template,
        color: obj.color,
        scale: [...obj.scale]
      }
    });

    setSceneObjectsWithHistory(prev => prev.map(o =>
      o.id === objectId ? { 
        ...o, 
        overrides: { scale: false, color: false }
      } : o
    ));
  }, [sceneObjects, prefabs, handleUpdatePrefab, setSceneObjectsWithHistory]);

  const getProjectData = useCallback(() => {
    return {
      version: '0.1.0',
      name: projectFileName || 'Untitled Project',
      timestamp: new Date().toISOString(),
      scene: {
        objects: sceneObjects.map(obj => ({
          id: obj.id,
          name: obj.name,
          type: obj.type,
          position: obj.position,
          rotation: obj.rotation,
          scale: obj.scale,
          color: obj.color,
          assetId: obj.assetId,
          isModel: obj.isModel,
          prefabId: obj.prefabId,
          parentId: obj.parentId || null,
          overrides: obj.overrides
        }))
      },
      prefabs: prefabs.map(prefab => ({
        id: prefab.id,
        name: prefab.name,
        template: prefab.template
      })),
      assets: assets.map(asset => ({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        assetType: asset.assetType
      }))
    };
  }, [sceneObjects, prefabs, assets, projectFileName]);

  const { save: autoSave, scheduleSave, loadSnapshots, loadSnapshot, deleteSnapshot, clearAll: clearAutoSave } = useAutoSave(getProjectData, 60000, maxSnapshots);
  
  const { recentProjects, addRecentProject, openRecentProject, removeRecentProject } = useRecentProjects();

  useEffect(() => {
    if (autoSaveEnabled && sceneObjects.length > 0) {
      scheduleSave();
    }
  }, [sceneObjects, prefabs, assets, autoSaveEnabled, scheduleSave]);

  const writeToFile = async (handle, data) => {
    try {
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
    } catch (error) {
      if (error.name === 'InvalidStateError') {
        throw new Error('FILE_HANDLE_INVALID');
      }
      throw error;
    }
  };

  const openFileBrowser = useCallback((mode, options = {}) => {
    setFileBrowserMode(mode);
    setIsFileBrowserOpen(true);
    
    return new Promise((resolve) => {
      setFileBrowserResolve(() => resolve);
    });
  }, []);
  
  const handleFileBrowserSelect = useCallback((filePath) => {
    if (fileBrowserResolve) {
      fileBrowserResolve(filePath);
    }
    setIsFileBrowserOpen(false);
    setFileBrowserResolve(null);
  }, [fileBrowserResolve]);
  
  const handleFileBrowserClose = useCallback(() => {
    if (fileBrowserResolve) {
      fileBrowserResolve(null);
    }
    setIsFileBrowserOpen(false);
    setFileBrowserResolve(null);
  }, [fileBrowserResolve]);

  const handleSaveAsProject = useCallback(async () => {
    const projectData = getProjectData();

    if (isElectron) {
      try {
        const filePath = await openFileBrowser('save', {
          title: '保存项目',
          defaultPath: projectFileName || 'astra_project.json',
          filters: [
            { name: 'Astra Project', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });
        
        if (!filePath) return;
        
        const fileName = getBasename(filePath);
        
        const writeResult = await window.electronAPI.writeFile(filePath, JSON.stringify(projectData, null, 2));
        
        if (!writeResult.success) {
          toast.error('保存失败: ' + writeResult.error);
          return;
        }
        
        fileHandleRef.current = filePath;
        setProjectFileName(fileName);
        setHasUnsavedChanges(false);
        toast.success(`已保存: ${fileName}`);
        console.log('Project saved as:', fileName);
      } catch (error) {
        console.error('Error saving file:', error);
        toast.error('保存失败: ' + error.message);
      }
      return;
    }

    if (hasFileSystemAccess) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: projectFileName || 'astra_project.json',
          types: [{
            description: 'Astra Project',
            accept: { 'application/json': ['.json'] }
          }]
        });
        
        fileHandleRef.current = handle;
        setProjectFileName(handle.name);
        await writeToFile(handle, projectData);
        setHasUnsavedChanges(false);
        toast.success(`已保存: ${handle.name}`);
        console.log('Project saved as:', handle.name);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error saving file:', error);
        }
      }
    } else {
      const jsonString = JSON.stringify(projectData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = projectFileName || `astra_project_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setHasUnsavedChanges(false);
      toast.success(`已保存: ${projectFileName || 'astra_project.json'}`);
    }
  }, [getProjectData, hasFileSystemAccess, isElectron, projectFileName, toast, openFileBrowser]);

  const verifyFileHandle = async (handle) => {
    try {
      const permission = await handle.queryPermission({ mode: 'readwrite' });
      if (permission === 'granted') {
        return true;
      }
      const requestPermission = await handle.requestPermission({ mode: 'readwrite' });
      return requestPermission === 'granted';
    } catch (e) {
      return false;
    }
  };

  const handleSaveProject = useCallback(async () => {
    const projectData = getProjectData();

    if (isElectron && fileHandleRef.current) {
      const filePath = fileHandleRef.current;
      const writeResult = await window.electronAPI.writeFile(filePath, JSON.stringify(projectData, null, 2));
      
      if (!writeResult.success) {
        toast.error('保存失败: ' + writeResult.error);
        return;
      }
      
      setHasUnsavedChanges(false);
      toast.success(`已保存: ${projectFileName}`);
      console.log('Project saved:', projectFileName);
      return;
    }

    if (hasFileSystemAccess && fileHandleRef.current) {
      const hasPermission = await verifyFileHandle(fileHandleRef.current);
      
      if (!hasPermission) {
        const shouldReselect = await dialog.confirm(
          '文件访问权限已失效。是否选择新的保存位置？',
          '保存失败'
        );
        if (shouldReselect) {
          fileHandleRef.current = null;
          await handleSaveAsProject();
        }
        return;
      }

      try {
        await writeToFile(fileHandleRef.current, projectData);
        setHasUnsavedChanges(false);
        toast.success(`已保存: ${projectFileName}`);
        console.log('Project saved:', projectFileName);
        return;
      } catch (error) {
        if (error.message === 'FILE_HANDLE_INVALID') {
          const shouldReselect = await dialog.confirm(
            '文件可能已被外部修改或移动。是否选择新的保存位置？',
            '保存失败'
          );
          if (shouldReselect) {
            fileHandleRef.current = null;
            await handleSaveAsProject();
          }
          return;
        }
        console.error('Error saving file:', error);
        toast.error('保存失败: ' + error.message);
        return;
      }
    }

    handleSaveAsProject();
  }, [getProjectData, hasFileSystemAccess, isElectron, projectFileName, dialog, handleSaveAsProject, toast]);

  const handleLoadProject = useCallback(async () => {
    if (isElectron) {
      try {
        const filePath = await openFileBrowser('open', {
          title: '打开项目',
          filters: [
            { name: 'Astra Project', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });
        
        if (!filePath) return;
        
        const readResult = await window.electronAPI.readFile(filePath);
        
        if (!readResult.success) {
          toast.error('读取失败: ' + readResult.error);
          return;
        }
        
        const projectData = JSON.parse(readResult.content);
        
        if (projectData.version && projectData.scene) {
          const fileName = getBasename(filePath);
          const projectName = projectData.name || fileName.replace('.json', '');
          
          fileHandleRef.current = filePath;
          setProjectFileName(projectName);
          resetHistory(projectData.scene.objects || []);
          setPrefabs(projectData.prefabs || []);
          setSelectedObject(null);
          setSelectedObjects([]);
          setSelectedPrefab(null);
          setAssets(projectData.assets || []);
          setHasUnsavedChanges(false);
          clearAutoSave();
          toast.success(`已打开: ${projectName}`);
          console.log('Project loaded:', projectName);
        } else {
          toast.error('无效的项目文件格式');
        }
      } catch (error) {
        console.error('Error loading file:', error);
        toast.error('打开失败: ' + error.message);
      }
      return;
    }

    if (hasFileSystemAccess) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{
            description: 'Astra Project',
            accept: { 'application/json': ['.json'] }
          }]
        });
        
        const file = await handle.getFile();
        const text = await file.text();
        const projectData = JSON.parse(text);
        
        if (projectData.version && projectData.scene) {
          fileHandleRef.current = handle;
          const projectName = projectData.name || handle.name.replace('.json', '');
          setProjectFileName(projectName);
          resetHistory(projectData.scene.objects || []);
          setPrefabs(projectData.prefabs || []);
          setSelectedObject(null);
          setSelectedObjects([]);
          setSelectedPrefab(null);
          setHasUnsavedChanges(false);
          clearAutoSave();
          addRecentProject(projectName, handle);
          console.log('Project loaded:', projectName);
        } else {
          console.error('Invalid project file format');
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error loading file:', error);
        }
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const text = await file.text();
          const projectData = JSON.parse(text);
          
          if (projectData.version && projectData.scene) {
            const projectName = projectData.name || file.name.replace('.json', '');
            setProjectFileName(projectName);
            resetHistory(projectData.scene.objects || []);
            setPrefabs(projectData.prefabs || []);
            setSelectedObject(null);
            setSelectedObjects([]);
            setSelectedPrefab(null);
            setHasUnsavedChanges(false);
            clearAutoSave();
            console.log('Project loaded:', projectName);
          } else {
            console.error('Invalid project file format');
          }
        } catch (error) {
          console.error('Error parsing project file:', error);
        }
      };
      
      input.click();
    }
  }, [hasFileSystemAccess, isElectron, resetHistory, clearAutoSave, addRecentProject, toast, openFileBrowser]);

  const handleNewProject = useCallback(async () => {
    if (hasUnsavedChanges || sceneObjects.length > 0) {
      const confirmNew = await dialog.confirm(msg('menu.confirmNew'), msg('menu.newProject'));
      if (!confirmNew) return;
    }
    
    fileHandleRef.current = null;
    setProjectFileName(null);
    resetHistory([]);
    setPrefabs([]);
    setSelectedObject(null);
    setSelectedObjects([]);
    setSelectedPrefab(null);
    setAssets([]);
    setSelectedAsset(null);
    setHasUnsavedChanges(false);
    clearAutoSave();
  }, [sceneObjects.length, hasUnsavedChanges, resetHistory, clearAutoSave, dialog]);

  const handleOpenRecentProject = useCallback(async (project) => {
    if (!hasFileSystemAccess) {
      await dialog.alert('File System Access API not supported', 'Error');
      return;
    }

    const handle = await openRecentProject(project.id);
    
    if (!handle) {
      const shouldRemove = await dialog.confirm(
        `文件可能已被移动或删除。是否从最近项目列表中移除？`,
        `无法访问 "${project.name}"`
      );
      if (shouldRemove) {
        await removeRecentProject(project.id);
      }
      return;
    }

    try {
      const file = await handle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);
      
      fileHandleRef.current = handle;
      resetHistory(data.scene?.objects || []);
      setPrefabs(data.prefabs || []);
      setProjectFileName(project.name);
      setSelectedObject(null);
      setSelectedObjects([]);
      setSelectedPrefab(null);
      setAssets(data.assets || []);
      setHasUnsavedChanges(false);
      
      addRecentProject(project.name, handle);
    } catch (error) {
      console.error('Failed to open recent project:', error);
    }
  }, [hasFileSystemAccess, openRecentProject, removeRecentProject, resetHistory, addRecentProject, dialog]);

  const handleExportAsAstra = useCallback(async () => {
    try {
      const projectData = getProjectData();
      const filename = await exportProjectAsAstra(projectData, projectData.name + '.astra');
      console.log('Project exported as:', filename);
    } catch (error) {
      console.error('Export failed:', error);
      await dialog.alert(msg('menu.exportFailed') + ': ' + error.message, 'Error');
    }
  }, [getProjectData, dialog]);

  const handleImportAstra = useCallback(async () => {
    if (isElectron) {
      try {
        const filePath = await openFileBrowser('open', {
          title: msg('menu.importAstra'),
          filters: [
            { name: 'Astra Package', extensions: ['astra'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });
        
        if (!filePath) return;
        
        const readResult = await window.electronAPI.readFile(filePath);
        
        if (!readResult.success) {
          toast.error(msg('menu.importFailed') + ': ' + readResult.error);
          return;
        }
        
        const fileName = getBasename(filePath);
        const file = new File([readResult.content], fileName, { type: 'application/octet-stream' });
        const projectData = await importProjectFromAstra(file);
        
        setProjectFileName(projectData.name + '.astra');
        resetHistory(projectData.scene.objects || []);
        setPrefabs(projectData.prefabs || []);
        setSelectedObject(null);
        setSelectedObjects([]);
        setSelectedPrefab(null);
        setHasUnsavedChanges(false);
        clearAutoSave();
        toast.success(`已导入: ${projectData.name}.astra`);
        console.log('Project imported from .astra:', fileName);
      } catch (error) {
        console.error('Import failed:', error);
        toast.error(msg('menu.importFailed') + ': ' + error.message);
      }
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.astra';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const projectData = await importProjectFromAstra(file);
        
        setProjectFileName(projectData.name + '.astra');
        resetHistory(projectData.scene.objects || []);
        setPrefabs(projectData.prefabs || []);
        setSelectedObject(null);
        setSelectedObjects([]);
        setSelectedPrefab(null);
        setHasUnsavedChanges(false);
        clearAutoSave();
        addRecentProject({
          name: projectData.name,
          path: file.name
        });
        console.log('Project imported from .astra:', file.name);
      } catch (error) {
        console.error('Import failed:', error);
        await dialog.alert(msg('menu.importFailed') + ': ' + error.message, 'Error');
      }
    };
    
    input.click();
  }, [resetHistory, clearAutoSave, addRecentProject, dialog, isElectron, openFileBrowser, toast]);

  const handleRestoreSnapshot = useCallback((snapshotData) => {
    if (snapshotData && snapshotData.scene) {
      resetHistory(snapshotData.scene.objects || []);
      setPrefabs(snapshotData.prefabs || []);
      setProjectFileName(snapshotData.name || null);
      setSelectedObject(null);
      setSelectedObjects([]);
      console.log('Restored snapshot:', snapshotData.name);
    }
  }, [resetHistory]);

  useEffect(() => {
    const handleFileShortcuts = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.key === 'F5') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
        return;
      }
      
      const modifier = e.ctrlKey || e.metaKey;
      if (modifier) {
        const key = e.key.toLowerCase();
        
        if (key === 's') {
          e.preventDefault();
          if (e.shiftKey) {
            handleSaveAsProject();
          } else {
            handleSaveProject();
          }
        } else if (key === 'o') {
          e.preventDefault();
          handleLoadProject();
        } else if (key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (key === 'y') {
          e.preventDefault();
          redo();
        }
      }
      
      if (modifier && e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewProject();
      }
    };

    document.addEventListener('keydown', handleFileShortcuts);
    return () => document.removeEventListener('keydown', handleFileShortcuts);
  }, [handleSaveProject, handleSaveAsProject, handleLoadProject, handleNewProject, undo, redo]);

  return (
    <div className="app-container">
      <Toolbar
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        onToggleLocale={handleToggleLocale}
        onSetLocale={handleSetLocale}
        onSaveProject={handleSaveProject}
        onSaveAsProject={handleSaveAsProject}
        onLoadProject={handleLoadProject}
        onNewProject={handleNewProject}
        projectFileName={projectFileName}
        onToggleTheme={handleToggleTheme}
        theme={theme}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onOpenPreferences={() => setIsPreferencesOpen(true)}
        recentProjects={recentProjects}
        onOpenRecentProject={handleOpenRecentProject}
        onExportAsAstra={handleExportAsAstra}
        onImportAstra={handleImportAstra}
        onOpenSnapshots={() => setIsSnapshotsOpen(true)}
        onOpenPluginSettings={() => setIsPluginSettingsOpen(true)}
      />

      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        theme={theme}
        onSetTheme={handleSetTheme}
        onToggleLocale={handleToggleLocale}
        onSetLocale={handleSetLocale}
        autoSaveEnabled={autoSaveEnabled}
        onToggleAutoSave={handleToggleAutoSave}
        maxSnapshots={maxSnapshots}
        onSetMaxSnapshots={handleSetMaxSnapshots}
      />

      <SnapshotsModal
        isOpen={isSnapshotsOpen}
        onClose={() => setIsSnapshotsOpen(false)}
        onLoadSnapshots={loadSnapshots}
        onLoadSnapshot={loadSnapshot}
        onDeleteSnapshot={deleteSnapshot}
        onClearAll={clearAutoSave}
        onRestoreSnapshot={handleRestoreSnapshot}
      />

      <PluginSettingsModal
        isOpen={isPluginSettingsOpen}
        onClose={() => setIsPluginSettingsOpen(false)}
      />

      <FileBrowserDialog
        isOpen={isFileBrowserOpen}
        onClose={handleFileBrowserClose}
        onSelect={handleFileBrowserSelect}
        mode={fileBrowserMode}
        title={fileBrowserMode === 'save' ? '保存项目' : '打开项目'}
        filters={[
          { name: 'Astra Project', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]}
      />

      <div className="main-content-wrapper">
        <div className="main-content">
          <ResizablePanel 
            side="left" 
            minWidth={200} 
            maxWidth={500} 
            defaultWidth={280}
            className={`left-sidebar ${leftSidebarAllCollapsed ? 'all-collapsed' : ''}`}
          >
            <HierarchyPanel
              objects={sceneObjects}
              selectedObject={selectedObject}
              selectedObjects={selectedObjects}
              onSelectObject={handleObjectSelect}
              onAddObject={handleAddObject}
              onDeleteObject={handleDeleteObject}
              onDeleteSelectedObjects={handleDeleteSelectedObjects}
              onCreatePrefab={handleCreatePrefab}
              prefabs={prefabs}
              onCopyObject={handleCopyObject}
              onPasteObject={handlePasteObject}
              onDuplicateObject={handleDuplicateObject}
              onRenameObject={handleRenameObject}
              clipboard={clipboard}
              vertical={leftSidebarAllCollapsed}
              onCollapseChange={setHierarchyCollapsed}
              onReorderObjects={handleReorderObjects}
            />
            <PrefabsPanel
              prefabs={prefabs}
              sceneObjects={sceneObjects}
              selectedPrefab={selectedPrefab}
              onSelectPrefab={setSelectedPrefab}
              onInstantiatePrefab={handleInstantiatePrefab}
              onDeletePrefab={handleDeletePrefab}
              vertical={leftSidebarAllCollapsed}
              onCollapseChange={setPrefabsCollapsed}
            />
          </ResizablePanel>

          <div className="center-area">
            <MultiViewport
              objects={sceneObjects}
              assets={assets}
              selectedObject={selectedObject}
              selectedObjects={selectedObjects}
              onSelectObject={handleObjectSelect}
              currentTool={currentTool}
              onToolChange={setCurrentTool}
              isPlaying={isPlaying}
              onUpdateObject={handleUpdateObject}
              onRecordHistory={recordCurrentState}
              theme={theme}
              lightRenderingEnabled={lightRenderingEnabled}
              onLightRenderingChange={handleLightRenderingChange}
            />
          </div>

          <ResizablePanel 
            side="right" 
            minWidth={200} 
            maxWidth={500} 
            defaultWidth={300}
            className={`right-sidebar ${inspectorCollapsed ? 'all-collapsed' : ''}`}
          >
            <InspectorPanel
              selectedObject={selectedObject}
              onUpdateObject={handleUpdateObject}
              onDeleteObject={handleDeleteObject}
              prefabs={prefabs}
              onDisconnectPrefab={handleDisconnectPrefab}
              onApplyToPrefab={handleApplyToPrefab}
              vertical={inspectorCollapsed}
              onCollapseChange={setInspectorCollapsed}
              assets={assets}
              objects={sceneObjects}
            />
          </ResizablePanel>
        </div>

        <ResizablePanel 
          direction="vertical"
          minHeight={80} 
          maxHeight={400} 
          defaultHeight={150}
          className="bottom-area"
          collapsed={isAssetsPanelCollapsed}
        >
          <AssetsPanel
            assets={assets}
            onImport={handleImportAsset}
            onSelectAsset={handleSelectAsset}
            selectedAsset={selectedAsset}
            onDeleteAsset={handleDeleteAsset}
            onRenameAsset={handleRenameAsset}
            onCollapseChange={setIsAssetsPanelCollapsed}
          />
        </ResizablePanel>
      </div>

      <div className="status-bar">
        <span>{msg('app.title')} {msg('app.version')}</span>
        <span>{msg('status.objects', { count: sceneObjects.length })}</span>
        <span>
          {selectedObject
            ? msg('status.selected', { name: selectedObject.name })
            : msg('status.noSelection')}
        </span>
      </div>
    </div>
  );
}

function App() {
  return (
    <DialogProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </DialogProvider>
  );
}

export default App;