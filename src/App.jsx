import React, { useState, useCallback, useEffect } from 'react';
import Viewport from './components/Viewport.jsx';
import HierarchyPanel from './components/HierarchyPanel.jsx';
import InspectorPanel from './components/InspectorPanel.jsx';
import Toolbar from './components/Toolbar.jsx';
import { msg, toggleLocale, getLocale } from './i18n/index.js';

function App() {
  const [selectedObject, setSelectedObject] = useState(null);
  const [sceneObjects, setSceneObjects] = useState([]);
  const [currentTool, setCurrentTool] = useState('select');
  const [isPlaying, setIsPlaying] = useState(false);
  const [locale, setLocaleState] = useState(getLocale());

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

  const handleAddObject = useCallback((type) => {
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
  }, [sceneObjects.length]);

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