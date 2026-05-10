import React from 'react';
import { msg } from '../i18n/index.js';

function InspectorPanel({ selectedObject, onUpdateObject, onDeleteObject }) {
  if (!selectedObject) {
    return (
      <div className="panel inspector-panel">
        <div className="panel-header">
          <span>{msg('inspector.title')}</span>
        </div>
        <div className="inspector-empty">
          <div className="inspector-empty-icon">⊘</div>
          <div>{msg('inspector.empty')}</div>
          <div style={{ fontSize: '11px', marginTop: '6px' }}>
            {msg('inspector.emptyHint')}
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
        <span>{msg('inspector.title')}</span>
      </div>
      <div className="panel-content">
        <div className="inspector-section">
          <div className="inspector-section-title">{msg('inspector.object')}</div>
          <div className="inspector-row">
            <label className="inspector-label">{msg('inspector.name')}</label>
            <input
              type="text"
              className="inspector-input"
              value={selectedObject.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>
          <div className="inspector-row">
            <label className="inspector-label">{msg('inspector.type')}</label>
            <input
              type="text"
              className="inspector-input"
              value={selectedObject.type}
              disabled
              style={{ opacity: 0.6 }}
            />
          </div>
          <div className="inspector-row">
            <label className="inspector-label">{msg('inspector.color')}</label>
            <input
              type="color"
              className="inspector-input inspector-color"
              value={selectedObject.color}
              onChange={(e) => handleColorChange(e.target.value)}
            />
          </div>
        </div>

        <div className="inspector-section">
          <div className="inspector-section-title">{msg('inspector.transform')}</div>

          <div className="inspector-row">
            <label className="inspector-label">{msg('inspector.position')}</label>
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
            <label className="inspector-label">{msg('inspector.rotation')}</label>
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
            <label className="inspector-label">{msg('inspector.scale')}</label>
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
            {msg('inspector.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InspectorPanel;