import React from 'react';
import { msg } from '../i18n/index.js';
import CollapsiblePanel from './CollapsiblePanel.jsx';
import IconCube from '../icons/cube.svg?react';
import IconSphere from '../icons/sphere.svg?react';
import IconPlane from '../icons/plane.svg?react';
import IconModel from '../icons/model.svg?react';
import IconPrefab from '../icons/prefab.svg?react';
import IconPlus from '../icons/plus.svg?react';
import IconDelete from '../icons/delete.svg?react';

/**
 * 预制件面板组件
 * 很多东西直接抄层级面板就可以了。
 * 
 * @param {Object} props - 组件属性
 * @param {Array} props.prefabs - 预制件列表
 * @param {Array} props.sceneObjects - 场景对象列表
 * @param {Object} props.selectedPrefab - 当前选中的预制件
 * @param {Function} props.onSelectPrefab - 选择预制件回调
 * @param {Function} props.onInstantiatePrefab - 实例化预制件回调
 * @param {Function} props.onDeletePrefab - 删除预制件回调
 * @param {boolean} props.vertical - 是否垂直布局
 * @param {Function} props.onCollapseChange - 折叠状态变化回调
 * @returns {JSX.Element} 预制件面板组件
 */
function PrefabsPanel({ 
  prefabs, 
  sceneObjects,
  selectedPrefab, 
  onSelectPrefab, 
  onInstantiatePrefab, 
  onDeletePrefab,
  vertical,
  onCollapseChange
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
    <CollapsiblePanel 
      title={msg('prefabs.title')} 
      className="prefabs-panel"
      storageKey="astra-panel-prefabs-collapsed"
      vertical={vertical}
      onCollapseChange={onCollapseChange}
    >
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
    </CollapsiblePanel>
  );
}

export default PrefabsPanel;
