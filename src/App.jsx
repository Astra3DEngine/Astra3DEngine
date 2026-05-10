import React, { useEffect, useRef, useState } from 'react';
import Viewport from './components/Viewport.jsx';
import HierarchyPanel from './components/HierarchyPanel.jsx';
import InspectorPanel from './components/InspectorPanel.jsx';
import Toolbar from './components/Toolbar.jsx';
import AssetPanel from './components/AssetPanel.jsx';

function App() {
  const [selectedObject, setSelectedObject] = useState(null);
  const [sceneObjects, setSceneObjects] = useState([]);
  const [currentTool, setCurrentTool] = useState('select');
  const [isPlaying, setIsPlaying] = useState(false);

  const handleObjectSelect = (object) => {
    setSelectedObject(object);
  };

  const handleAddObject = (type) => {
    const newObject = {
      id: Date.now(),
      name: `${type}_${sceneObjects.length + 1}`,
      type: type,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
    };
    setSceneObjects([...sceneObjects, newObject]);
  };

  const handleDeleteObject = (id) => {
    setSceneObjects(sceneObjects.filter(obj => obj.id !== id));
    if (selectedObject && selectedObject.id === id) {
      setSelectedObject(null);
    }
  };

  const handleUpdateObject = (id, updates) => {
    setSceneObjects(sceneObjects.map(obj =>
      obj.id === id ? { ...obj, ...updates } : obj
    ));
    if (selectedObject && selectedObject.id === id) {
      setSelectedObject({ ...selectedObject, ...updates });
    }
  };

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
          <AssetPanel />
        </div>

        <div className="center-area">
          <Viewport
            objects={sceneObjects}
            selectedObject={selectedObject}
            onSelectObject={handleObjectSelect}
            currentTool={currentTool}
            isPlaying={isPlaying}
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
