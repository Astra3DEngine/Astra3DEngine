import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Viewport from './components/Viewport.jsx';
import HierarchyPanel from './components/HierarchyPanel.jsx';
import InspectorPanel from './components/InspectorPanel.jsx';
import AssetsPanel from './components/AssetsPanel.jsx';
import Toolbar from './components/Toolbar.jsx';
import { msg, toggleLocale, getLocale } from './i18n/index.js';

function App() {
  const [selectedObject, setSelectedObject] = useState(null);
  const [sceneObjects, setSceneObjects] = useState([]);
  const [currentTool, setCurrentTool] = useState('select');
  const [isPlaying, setIsPlaying] = useState(false);
  const [locale, setLocaleState] = useState(getLocale());
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const gltfLoaderRef = useRef(new GLTFLoader());

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

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
      setSceneObjects(prev => [...prev, newObject]);
    } else {
      const newObject = {
        id: Date.now(),
        name: `${type}_${sceneObjects.length + 1}`,
        type: type,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
      };
      setSceneObjects(prev => [...prev, newObject]);
    }
  }, [sceneObjects.length]);

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
    setSceneObjects(prev => prev.filter(obj => obj.id !== id));
    setSelectedObject(prev => prev && prev.id === id ? null : prev);
  }, []);

  const handleUpdateObject = useCallback((id, updates) => {
    setSceneObjects(prev => prev.map(obj =>
      obj.id === id ? { ...obj, ...updates } : obj
    ));
    setSelectedObject(prev => prev && prev.id === id ? { ...prev, ...updates } : prev);
  }, []);

  return (
    <div className="app-container">
      <Toolbar
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        onToggleLocale={handleToggleLocale}
        currentLocale={locale}
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
            />
          </div>

          <div className="right-sidebar">
            <InspectorPanel
              selectedObject={selectedObject}
              onUpdateObject={handleUpdateObject}
              onDeleteObject={handleDeleteObject}
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