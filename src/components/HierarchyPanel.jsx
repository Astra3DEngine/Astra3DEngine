import React from 'react';
import { msg } from '../i18n/index.js';

function HierarchyPanel({ objects, selectedObject, onSelectObject, onAddObject, onDeleteObject }) {
  return (
    <div className="panel hierarchy-panel">
      <div className="panel-header">
        <span>{msg('hierarchy.title')}</span>
      </div>
      <div className="panel-content">
        {objects.length === 0 ? (
          <div style={{
            color: 'var(--text-secondary)',
            textAlign: 'center',
            padding: '20px',
            fontSize: '12px'
          }}>
            {msg('hierarchy.empty')}<br />
            <span style={{ opacity: 0.7 }}>{msg('hierarchy.emptyHint')}</span>
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
                title={msg('hierarchy.delete')}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
      <div className="hierarchy-actions">
        <button className="btn btn-small" onClick={() => onAddObject('cube')}>
          {msg('hierarchy.addCube')}
        </button>
        <button className="btn btn-small" onClick={() => onAddObject('sphere')}>
          {msg('hierarchy.addSphere')}
        </button>
        <button className="btn btn-small" onClick={() => onAddObject('plane')}>
          {msg('hierarchy.addPlane')}
        </button>
      </div>
    </div>
  );
}

export default HierarchyPanel;