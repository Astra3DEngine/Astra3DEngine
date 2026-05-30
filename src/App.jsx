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
import MultiViewport from './components/MultiViewport.jsx';
import HierarchyPanel from './components/HierarchyPanel.jsx';
import InspectorPanel from './components/InspectorPanel.jsx';
import AssetsPanel from './components/AssetsPanel.jsx';
import PrefabsPanel from './components/PrefabsPanel.jsx';
import Toolbar from './components/Toolbar.jsx';
import PreferencesModal from './components/PreferencesModal.jsx';
import SnapshotsModal from './components/SnapshotsModal.jsx';
import PluginSettingsModal from './components/PluginSettingsModal.jsx';
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
  
  useEffect(() => {
    setPluginLocale(getLocale());
  }, []);
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [prefabs, setPrefabs] = useState([]);
  const [selectedPrefab, setSelectedPrefab] = useState(null);
  const gltfLoaderRef = useRef(new GLTFLoader());
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
   */
  const handleObjectSelect = useCallback((object, isMultiSelect = false) => {
    if (!object) return;
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

  const handleAddObject = useCallback((type, asset = null) => {
    if (asset && (asset.type === 'gltf' || asset.type === 'glb')) {
      const newObject = {
        id: Date.now(),
        name: asset.name,
        type: 'model',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: '#ffffff',
        assetId: asset.id,
        isModel: true
      };
      setSceneObjectsWithHistory(prev => [...prev, newObject]);
    } else {
      const newObject = {
        id: Date.now(),
        name: `${type}_1`,
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
        textureId: (type === 'sphere' || type === 'plane') ? null : undefined
      };
      setSceneObjectsWithHistory(prev => [...prev, newObject]);
    }
  }, [setSceneObjectsWithHistory]);

  const textureLoaderRef = useRef(new THREE.TextureLoader());

  /**
   * 导入资源处理
   * 
   * 这里处理文件导入，支持两种类型。模型文件（GLTF/GLB）使用 GLTFLoader 加载，
   * 计算模型边界盒和中心点。GLTF 加载是异步的，要用回调处理。
   * 
   * 图片文件（PNG/JPG/WebP 等）使用 TextureLoader 加载，设置正确的 colorSpace（SRGBColorSpace），
   * 不设置 colorSpace 会导致颜色偏暗。
   * 
   * 使用 URL.createObjectURL 创建临时 URL，删除资源时要 URL.revokeObjectURL 释放内存，
   * 不然内存泄漏了直接老冯飞天。
   * 
   * 文件类型判断很暴力：直接看扩展名。更好的方案是检查文件 MIME 类型，但浏览器是傻逼。
   */
  const handleImportAsset = useCallback((file) => {
    const fileExt = file.name.split('.').pop().toLowerCase();
    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
    const modelExts = ['gltf', 'glb'];
    
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
            }
          });
          
          setAssets(prev => [...prev, asset]);
        },
        undefined,
        (error) => {
          console.error('Error loading GLTF:', error);
        }
      );
    } else if (assetType === 'texture') {
      textureLoaderRef.current.load(
        asset.url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
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

  const handleSelectAsset = useCallback((asset) => {
    setSelectedAsset(asset);
    if (asset.assetType === 'model') {
      handleAddObject('model', asset);
    }
  }, [handleAddObject]);

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

  const handleCopyObject = useCallback((id) => {
    const obj = sceneObjects.find(o => o.id === id);
    if (obj) {
      setClipboard({ ...obj });
    }
  }, [sceneObjects]);

  const handlePasteObject = useCallback(() => {
    if (!clipboard) return null;

    const newObj = {
      ...clipboard,
      id: Date.now(),
      name: `${clipboard.name}_copy`,
      position: [
        clipboard.position[0] + 1,
        clipboard.position[1],
        clipboard.position[2]
      ]
    };

    setSceneObjectsWithHistory(prev => [...prev, newObj]);
    setSelectedObject(newObj);
    return newObj;
  }, [clipboard, setSceneObjectsWithHistory]);

  const handleDuplicateObject = useCallback((id) => {
    const obj = sceneObjects.find(o => o.id === id);
    if (!obj) return null;

    const newObj = {
      ...obj,
      id: Date.now(),
      name: `${obj.name}_copy`,
      position: [
        obj.position[0] + 1,
        obj.position[1],
        obj.position[2]
      ]
    };

    setSceneObjectsWithHistory(prev => [...prev, newObj]);
    setSelectedObject(newObj);
    return newObj;
  }, [sceneObjects, setSceneObjectsWithHistory]);

  const handleRenameObject = useCallback((id, newName) => {
    handleUpdateObject(id, { name: newName });
  }, [handleUpdateObject]);

  const handleReorderObjects = useCallback((draggedId, targetId, position) => {
    console.log('=== handleReorderObjects ===');
    console.log('draggedId:', draggedId, 'targetId:', targetId, 'position:', position);
    
    setSceneObjectsWithHistory(prev => {
      console.log('prev objects:', prev.map(o => ({ id: o.id, name: o.name, parentId: o.parentId })));
      
      const objects = [...prev];
      
      const draggedIndex = objects.findIndex(o => o.id === draggedId);
      if (draggedIndex === -1) {
        console.log('ERROR: draggedIndex not found');
        return prev;
      }
      
      const draggedObj = { ...objects[draggedIndex] };
      console.log('draggedObj:', { id: draggedObj.id, name: draggedObj.name, parentId: draggedObj.parentId });
      
      const getAllDescendantIds = (parentId) => {
        const descendants = new Set([parentId]);
        objects.filter(o => o.parentId === parentId).forEach(child => {
          const childDescendants = getAllDescendantIds(child.id);
          childDescendants.forEach(id => descendants.add(id));
        });
        return descendants;
      };
      
      const draggedDescendants = getAllDescendantIds(draggedId);
      console.log('draggedDescendants:', Array.from(draggedDescendants));
      
      if (targetId === null) {
        console.log('targetId is null, moving to end');
        draggedObj.parentId = null;
        objects.splice(draggedIndex, 1);
        objects.push(draggedObj);
        console.log('result objects:', objects.map(o => ({ id: o.id, name: o.name, parentId: o.parentId })));
        return objects;
      }
      
      if (draggedDescendants.has(targetId)) {
        console.log('ERROR: targetId is descendant of draggedId');
        return prev;
      }
      
      const targetIndex = objects.findIndex(o => o.id === targetId);
      if (targetIndex === -1) {
        console.log('ERROR: targetIndex not found');
        return prev;
      }
      
      const targetObj = objects[targetIndex];
      console.log('targetObj:', { id: targetObj.id, name: targetObj.name, parentId: targetObj.parentId });
      
      if (position === 'inside') {
        draggedObj.parentId = targetId;
        console.log('Setting parentId to targetId:', targetId);
      } else {
        draggedObj.parentId = targetObj.parentId || null;
        console.log('Setting parentId to targetObj.parentId:', targetObj.parentId);
      }
      
      objects.splice(draggedIndex, 1);
      console.log('After splice, objects length:', objects.length);
      
      const newTargetIndex = objects.findIndex(o => o.id === targetId);
      if (newTargetIndex === -1) {
        console.log('ERROR: newTargetIndex not found after splice, pushing to end');
        objects.push(draggedObj);
        console.log('result objects:', objects.map(o => ({ id: o.id, name: o.name, parentId: o.parentId })));
        return objects;
      }
      
      console.log('newTargetIndex:', newTargetIndex);
      
      let insertIndex;
      if (position === 'inside') {
        insertIndex = newTargetIndex + 1;
        for (let i = newTargetIndex + 1; i < objects.length; i++) {
          if (objects[i].parentId === targetId) {
            insertIndex = i + 1;
          } else {
            break;
          }
        }
        console.log('inside: insertIndex:', insertIndex);
      } else if (position === 'before') {
        insertIndex = newTargetIndex;
        console.log('before: insertIndex:', insertIndex);
      } else {
        insertIndex = newTargetIndex + 1;
        
        const targetParentId = targetObj.parentId;
        if (targetParentId) {
          for (let i = newTargetIndex + 1; i < objects.length; i++) {
            if (objects[i].parentId === targetParentId) {
              insertIndex = i + 1;
            } else {
              break;
            }
          }
        }
        console.log('after: insertIndex:', insertIndex);
      }
      
      objects.splice(insertIndex, 0, draggedObj);
      
      console.log('result objects:', objects.map(o => ({ id: o.id, name: o.name, parentId: o.parentId })));
      
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

  const handleSaveAsProject = useCallback(async () => {
    const projectData = getProjectData();

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
  }, [getProjectData, hasFileSystemAccess, projectFileName, toast]);

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
  }, [getProjectData, hasFileSystemAccess, projectFileName, dialog, handleSaveAsProject, toast]);

  const handleLoadProject = useCallback(async () => {
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
  }, [hasFileSystemAccess, resetHistory, clearAutoSave, addRecentProject]);

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
  }, [resetHistory, clearAutoSave, addRecentProject, dialog]);

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

      <div className="main-content-wrapper">
        <div className="main-content">
          <div className={`left-sidebar ${leftSidebarAllCollapsed ? 'all-collapsed' : ''}`}>
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
          </div>

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
            />
          </div>

          <div className={`right-sidebar ${inspectorCollapsed ? 'all-collapsed' : ''}`}>
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
          </div>
        </div>

        <div className="bottom-area">
          <AssetsPanel
            assets={assets}
            onImport={handleImportAsset}
            onSelectAsset={handleSelectAsset}
            selectedAsset={selectedAsset}
            onDeleteAsset={handleDeleteAsset}
            onRenameAsset={handleRenameAsset}
          />
        </div>
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