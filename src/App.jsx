import React, { useState, useCallback } from 'react';
import Viewport from './components/Viewport.jsx';
import HierarchyPanel from './components/HierarchyPanel.jsx';
import InspectorPanel from './components/InspectorPanel.jsx';
import Toolbar from './components/Toolbar.jsx';

function App() {
  const [selectedObject, setSelectedObject] = useState(null);
  const [sceneObjects, setSceneObjects] = useState([]);
  const [currentTool, setCurrentTool] = useState('select');
  const [isPlaying, setIsPlaying] = useState(false);

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
        currentTool={currentTool}
        setCurrentTool={setCurrentTool}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
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
        <span>Astra 3D Engine v0.1.0</span>
        <span>Objects: {sceneObjects.length}</span>
        <span>{selectedObject ? `Selected: ${selectedObject.name}` : 'No selection'}</span>
      </div>
    </div>
  );
}

export default App;