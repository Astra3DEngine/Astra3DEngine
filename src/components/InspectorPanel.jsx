import React from 'react';

function InspectorPanel({ selectedObject, onUpdateObject, onDeleteObject }) {
  if (!selectedObject) {
    return (
      <div className="panel inspector-panel">
        <div className="panel-header">
          <span>Inspector</span>
        </div>
        <div className="inspector-empty">
          <div className="inspector-empty-icon">⊘</div>
          <div>No object selected</div>
          <div style={{ fontSize: '12px', marginTop: '8px' }}>
            Select an object in the scene<br />or Hierarchy panel
          </div>
        </div>
      </div>
    );
  }

  const handleTransformChange = (property, index, value) => {
    const newValue = parseFloat(value) || 0;
    const newTransform = [...selectedObject[property]];
    newTransform[index] = newValue;
    onUpdateObject(selectedObject.id, { [property]: newTransform });
  };

  const handleColorChange = (color) => {
    onUpdateObject(selectedObject.id, { color });
  };

  const handleNameChange = (name) => {
    onUpdateObject(selectedObject.id, { name });
  };

  return (
    <div className="panel inspector-panel">
      <div className="panel-header">
        <span>Inspector</span>
      </div>
      <div className="panel-content">
        <div className="inspector-section">
          <div className="inspector-section-title">Object</div>
          <div className="inspector-row">
            <label className="inspector-label">Name</label>
            <input
              type="text"
              className="inspector-input"
              value={selectedObject.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>
          <div className="inspector-row">
            <label className="inspector-label">Type</label>
            <input
              type="text"
              className="inspector-input"
              value={selectedObject.type}
              disabled
              style={{ opacity: 0.6 }}
            />
          </div>
          <div className="inspector-row">
            <label className="inspector-label">Color</label>
            <input
              type="color"
              className="inspector-input inspector-color"
              value={selectedObject.color}
              onChange={(e) => handleColorChange(e.target.value)}
            />
          </div>
        </div>

        <div className="inspector-section">
          <div className="inspector-section-title">Transform</div>

          <div className="inspector-row">
            <label className="inspector-label">Position</label>
            <div className="inspector-vector3">
              {['X', 'Y', 'Z'].map((axis, i) => (
                <div key={axis} className="vector-input">
                  <input
                    type="number"
                    className="inspector-input"
                    value={selectedObject.position[i]}
                    onChange={(e) => handleTransformChange('position', i, e.target.value)}
                  />
                  <div className="vector-label">{axis}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="inspector-row">
            <label className="inspector-label">Rotation</label>
            <div className="inspector-vector3">
              {['X', 'Y', 'Z'].map((axis, i) => (
                <div key={axis} className="vector-input">
                  <input
                    type="number"
                    className="inspector-input"
                    value={selectedObject.rotation[i]}
                    onChange={(e) => handleTransformChange('rotation', i, e.target.value)}
                  />
                  <div className="vector-label">{axis}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="inspector-row">
            <label className="inspector-label">Scale</label>
            <div className="inspector-vector3">
              {['X', 'Y', 'Z'].map((axis, i) => (
                <div key={axis} className="vector-input">
                  <input
                    type="number"
                    className="inspector-input"
                    value={selectedObject.scale[i]}
                    onChange={(e) => handleTransformChange('scale', i, e.target.value)}
                    min="0.01"
                    step="0.1"
                  />
                  <div className="vector-label">{axis}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="inspector-section">
          <button
            className="btn btn-danger"
            style={{ width: '100%' }}
            onClick={() => onDeleteObject(selectedObject.id)}
          >
            Delete Object
          </button>
        </div>
      </div>
    </div>
  );
}

export default InspectorPanel;