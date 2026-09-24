import React from 'react';
import { msg } from '../i18n/index.js';
import IconCube from '../assets/icons/tools/cube.svg?react';
import IconSphere from '../assets/icons/tools/sphere.svg?react';
import IconPlane from '../assets/icons/tools/plane.svg?react';
import IconModel from '../assets/icons/tools/model.svg?react';
import IconPrefab from '../assets/icons/tools/prefab.svg?react';
import IconPlus from '../assets/icons/editor/plus.svg?react';
import IconDelete from '../assets/icons/editor/delete.svg?react';
import { usePrefabsStore } from '../stores/usePrefabsStore.js';
import { useScenesStore } from '../stores/useScenesStore.js';

/**
 * 预制件面板组件：直接读取 store。
 * @returns {JSX.Element} 预制件面板组件
 */
function PrefabsPanel() {
  const prefabs = usePrefabsStore((s) => s.prefabs);
  const selectedPrefab = usePrefabsStore((s) => s.selectedPrefab);
  const sceneObjects = useScenesStore(
    (s) => s.scenes.find((sc) => sc.id === s.currentSceneId)?.objects || []
  );
  const onSelectPrefab = usePrefabsStore.getState().setSelectedPrefab;
  const onInstantiatePrefab = usePrefabsStore.getState().instantiatePrefab;
  const onDeletePrefab = usePrefabsStore.getState().deletePrefab;
  const getInstanceCount = (prefabId) => {
    return sceneObjects.filter((obj) => obj.prefabId === prefabId).length;
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
    <div className="prefabs-panel">
      <div className="panel-content">
        {prefabs.length === 0 ? (
          <div className="prefabs-empty">
            <div>{msg('prefabs.empty')}</div>
            <div className="prefabs-empty-hint">{msg('prefabs.emptyHint')}</div>
          </div>
        ) : (
          prefabs.map((prefab) => (
            <div
              key={prefab.id}
              className={`prefab-item ${selectedPrefab && selectedPrefab.id === prefab.id ? 'selected' : ''}`}
              onClick={() => onSelectPrefab(prefab)}
              onDoubleClick={() => onInstantiatePrefab(prefab.id)}
            >
              <span className="prefab-item-icon">{getPrefabIcon(prefab)}</span>
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
