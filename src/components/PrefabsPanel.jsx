import React from 'react';
import { msg } from '../i18n/index.js';
import IconCube from '../icons/cube.svg?react';
import IconSphere from '../icons/sphere.svg?react';
import IconPlane from '../icons/plane.svg?react';
import IconModel from '../icons/model.svg?react';
import IconPrefab from '../icons/prefab.svg?react';
import IconPlus from '../icons/plus.svg?react';
import IconDelete from '../icons/delete.svg?react';

function PrefabsPanel({ 
  prefabs, 
  sceneObjects,
  selectedPrefab, 
  onSelectPrefab, 
  onInstantiatePrefab, 
  onDeletePrefab 
}) {
  const getInstanceCount = (prefabId) => {
    return sceneObjects.filter(obj => obj.prefabId === prefabId).length;
  };

  const getPrefabIcon = (prefab) => {
    const type = prefab.template.type;
    if (type === 'cube') return <IconCube className="prefab-icon" />;
    if (type === 'sphere') return <IconSphere className="prefab-icon" />;
    if (type === 'plane') return <IconPlane className="prefab-icon" />;
    if (type === 'model') return <IconModel className="prefab-icon" />;
    return <IconPrefab className="prefab-icon" />;
  };

  return (
    <div className="panel prefabs-panel">
      <div className="panel-header">
        <span>{msg('prefabs.title')}</span>
      </div>
      <div className="panel-content">
        {prefabs.length === 0 ? (
          <div className="prefabs-empty">
            <div>{msg('prefabs.empty')}</div>
            <div className="prefabs-empty-hint">
              {msg('prefabs.emptyHint')}
            </div>
          </div>
        ) : (
          prefabs.map(prefab => (
            <div
              key={prefab.id}
              className={`prefab-item ${selectedPrefab && selectedPrefab.id === prefab.id ? 'selected' : ''}`}
              onClick={() => onSelectPrefab(prefab)}
              onDoubleClick={() => onInstantiatePrefab(prefab.id)}
            >
              <span className="prefab-item-icon">
                {getPrefabIcon(prefab)}
              </span>
              <span className="prefab-item-name">{prefab.name}</span>
              <span className="prefab-instance-count">
                {msg('prefabs.instances', { count: getInstanceCount(prefab.id) })}
              </span>
              <button
                className="icon-btn icon-btn-accent"
                onClick={(e) => {
                  e.stopPropagation();
                  onInstantiatePrefab(prefab.id);
                }}
                title={msg('prefabs.instantiate')}
              >
                <IconPlus className="btn-icon" />
              </button>
              <button
                className="icon-btn icon-btn-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePrefab(prefab.id);
                }}
                title={msg('prefabs.delete')}
              >
                <IconDelete className="btn-icon" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default PrefabsPanel;
