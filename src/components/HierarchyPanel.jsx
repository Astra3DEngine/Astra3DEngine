import React from 'react';

function HierarchyPanel({ objects, selectedObject, onSelectObject, onAddObject, onDeleteObject }) {
  return (
    <div className="panel hierarchy-panel">
      <div className="panel-header">
        <span>Hierarchy</span>
      </div>
      <div className="panel-content">
        {objects.length === 0 ? (
          <div style={{
            color: 'var(--text-secondary)',
            textAlign: 'center',
            padding: '20px',
            fontSize: '13px'
          }}>
            No objects in scene.<br />
            Click buttons below to create one.
          </div>
        ) : (
          objects.map(obj => (
            <div
              key={obj.id}
              className={`hierarchy-item ${selectedObject && selectedObject.id === obj.id ? 'selected' : ''}`}
              onClick={() => onSelectObject(obj)}
            >
              <span className="hierarchy-item-icon">
                {obj.type === 'cube' ? '◼' : obj.type === 'sphere' ? '●' : '▲'}
              </span>
              <span className="hierarchy-item-name">{obj.name}</span>
              <button
                className="icon-btn delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteObject(obj.id);
                }}
                title="Delete"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
      <div className="hierarchy-actions">
        <button className="btn btn-small" onClick={() => onAddObject('cube')}>
          + Cube
        </button>
        <button className="btn btn-small" onClick={() => onAddObject('sphere')}>
          + Sphere
        </button>
        <button className="btn btn-small" onClick={() => onAddObject('plane')}>
          + Plane
        </button>
      </div>
    </div>
  );
}

export default HierarchyPanel;