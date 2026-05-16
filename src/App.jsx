import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Viewport from './components/Viewport.jsx';
import HierarchyPanel from './components/HierarchyPanel.jsx';
import InspectorPanel from './components/InspectorPanel.jsx';
import AssetsPanel from './components/AssetsPanel.jsx';
import PrefabsPanel from './components/PrefabsPanel.jsx';
import Toolbar from './components/Toolbar.jsx';
import PreferencesModal from './components/PreferencesModal.jsx';
import { msg, toggleLocale, getLocale, setLocale } from './i18n/index.js';
import { useHistory } from './hooks/useHistory.js';

function App() {
  const [selectedObject, setSelectedObject] = useState(null);
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

  const hasFileSystemAccess = 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;

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
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleLocale = useCallback(() => {
    toggleLocale();
    setLocaleState(getLocale());
  }, []);

  const handleSetLocale = useCallback((locale) => {
    setLocale(locale);
    setLocaleState(locale);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme(prev => {
      const newTheme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('astra-theme', newTheme);
      return newTheme;
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleObjectSelect = useCallback((object) => {
    setSelectedObject(object);
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
        color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
      };
      setSceneObjectsWithHistory(prev => [...prev, newObject]);
    }
  }, [setSceneObjectsWithHistory]);

  const handleImportAsset = useCallback((file) => {
    const fileExt = file.name.split('.').pop().toLowerCase();
    const assetType = ['gltf', 'glb'].includes(fileExt) ? 'model' : 'texture';

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

  const handleDeleteObject = useCallback((id) => {
    setSceneObjectsWithHistory(prev => prev.filter(obj => obj.id !== id));
    setSelectedObject(prev => prev && prev.id === id ? null : prev);
  }, [setSceneObjectsWithHistory]);

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
      position: instancePosition,
      rotation: [...prefab.template.defaultRotation],
      scale: [...prefab.template.scale],
      color: prefab.template.color,
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

  const writeToFile = async (handle, data) => {
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  };

  const handleSaveProject = useCallback(async () => {
    const projectData = getProjectData();

    if (hasFileSystemAccess && fileHandleRef.current) {
      try {
        await writeToFile(fileHandleRef.current, projectData);
        setHasUnsavedChanges(false);
        console.log('Project saved:', projectFileName);
        return;
      } catch (error) {
        console.error('Error saving file:', error);
      }
    }

    handleSaveAsProject();
  }, [getProjectData, hasFileSystemAccess, projectFileName]);

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
    }
  }, [getProjectData, hasFileSystemAccess, projectFileName]);

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
          setProjectFileName(handle.name);
          resetHistory(projectData.scene.objects || []);
          setPrefabs(projectData.prefabs || []);
          setSelectedObject(null);
          setSelectedPrefab(null);
          setHasUnsavedChanges(false);
          console.log('Project loaded:', handle.name);
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
            setProjectFileName(file.name);
            resetHistory(projectData.scene.objects || []);
            setPrefabs(projectData.prefabs || []);
            setSelectedObject(null);
            setSelectedPrefab(null);
            setHasUnsavedChanges(false);
            console.log('Project loaded:', file.name);
          } else {
            console.error('Invalid project file format');
          }
        } catch (error) {
          console.error('Error parsing project file:', error);
        }
      };
      
      input.click();
    }
  }, [hasFileSystemAccess, resetHistory]);

  const handleNewProject = useCallback(async () => {
    if (hasUnsavedChanges || sceneObjects.length > 0) {
      const confirmNew = window.confirm(msg('menu.confirmNew'));
      if (!confirmNew) return;
    }
    
    fileHandleRef.current = null;
    setProjectFileName(null);
    resetHistory([]);
    setPrefabs([]);
    setSelectedObject(null);
    setSelectedPrefab(null);
    setAssets([]);
    setSelectedAsset(null);
    setHasUnsavedChanges(false);
  }, [sceneObjects.length, hasUnsavedChanges, resetHistory]);

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
      />

      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onToggleLocale={handleToggleLocale}
        onSetLocale={handleSetLocale}
      />

      <div className="main-content-wrapper">
        <div className="main-content">
          <div className="left-sidebar">
            <HierarchyPanel
              objects={sceneObjects}
              selectedObject={selectedObject}
              onSelectObject={handleObjectSelect}
              onAddObject={handleAddObject}
              onDeleteObject={handleDeleteObject}
              onCreatePrefab={handleCreatePrefab}
              prefabs={prefabs}
              onCopyObject={handleCopyObject}
              onPasteObject={handlePasteObject}
              onDuplicateObject={handleDuplicateObject}
              onRenameObject={handleRenameObject}
              clipboard={clipboard}
            />
            <PrefabsPanel
              prefabs={prefabs}
              sceneObjects={sceneObjects}
              selectedPrefab={selectedPrefab}
              onSelectPrefab={setSelectedPrefab}
              onInstantiatePrefab={handleInstantiatePrefab}
              onDeletePrefab={handleDeletePrefab}
            />
          </div>

          <div className="center-area">
            <Viewport
              objects={sceneObjects}
              assets={assets}
              selectedObject={selectedObject}
              onSelectObject={handleObjectSelect}
              currentTool={currentTool}
              onToolChange={setCurrentTool}
              isPlaying={isPlaying}
              onUpdateObject={handleUpdateObject}
              onRecordHistory={recordCurrentState}
              theme={theme}
            />
          </div>

          <div className="right-sidebar">
            <InspectorPanel
              selectedObject={selectedObject}
              onUpdateObject={handleUpdateObject}
              onDeleteObject={handleDeleteObject}
              prefabs={prefabs}
              onDisconnectPrefab={handleDisconnectPrefab}
              onApplyToPrefab={handleApplyToPrefab}
            />
          </div>
        </div>

        <div className="bottom-area">
          <AssetsPanel
            assets={assets}
            onImport={handleImportAsset}
            onSelectAsset={handleSelectAsset}
            selectedAsset={selectedAsset}
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

export default App;