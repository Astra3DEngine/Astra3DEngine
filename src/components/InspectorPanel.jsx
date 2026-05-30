/**
 * @file components/InspectorPanel.jsx
 * @description 属性面板组件，显示和编辑选中对象的属性
 * @module components/InspectorPanel
 */

import React from 'react';
import { msg } from '../i18n/index.js';
import CollapsiblePanel from './CollapsiblePanel.jsx';
import IconPrefabInstance from '../icons/prefab-instance.svg?react';
import IconDelete from '../icons/delete.svg?react';

/**
 * 属性面板组件
 * @param {Object} props - 组件属性
 * @param {Object} props.selectedObject - 当前选中的对象
 * @param {Function} props.onUpdateObject - 更新对象属性回调
 * @param {Function} props.onDeleteObject - 删除对象回调
 * @param {Array} props.prefabs - 预制件列表
 * @param {Function} props.onDisconnectPrefab - 断开预制件连接回调
 * @param {Function} props.onApplyToPrefab - 应用到预制件回调
 * @param {boolean} props.vertical - 是否垂直布局
 * @param {Function} props.onCollapseChange - 折叠状态变化回调
 * @param {Array} props.assets - 资源列表
 * @param {Array} props.objects - 场景对象列表
 * @returns {JSX.Element} 属性面板组件
 */
function InspectorPanel({ 
  selectedObject, 
  onUpdateObject, 
  onDeleteObject,
  prefabs,
  onDisconnectPrefab,
  onApplyToPrefab,
  vertical,
  onCollapseChange,
  assets,
  objects
}) {
  const handleTransformChange = (property, index, value) => {
    if (!selectedObject) return;
    const newValue = parseFloat(value) || 0;
    const newTransform = [...selectedObject[property]];
    newTransform[index] = newValue;
    onUpdateObject(selectedObject.id, { [property]: newTransform });
  };

  const handleColorChange = (color) => {
    if (!selectedObject) return;
    onUpdateObject(selectedObject.id, { color });
  };

  const handleNameChange = (name) => {
    if (!selectedObject) return;
    onUpdateObject(selectedObject.id, { name });
  };

  const handleFaceTextureChange = (faceName, textureId) => {
    if (!selectedObject || !selectedObject.faceTextures) return;
    const newFaceTextures = { ...selectedObject.faceTextures, [faceName]: textureId };
    onUpdateObject(selectedObject.id, { faceTextures: newFaceTextures });
  };

  const handleTextureChange = (textureId) => {
    if (!selectedObject) return;
    onUpdateObject(selectedObject.id, { textureId: textureId || null });
  };

  const handleParentChange = (parentId) => {
    console.log('=== handleParentChange ===');
    console.log('parentId:', parentId, 'selectedObject:', selectedObject?.id);
    
    if (!selectedObject) {
      console.log('SKIP: no selectedObject');
      return;
    }
    
    const newParentId = parentId === '' ? null : parentId;
    console.log('newParentId:', newParentId);
    
    if (newParentId === selectedObject.id) {
      console.log('SKIP: same id');
      return;
    }
    
    const getAllDescendantIds = (objId) => {
      const descendants = new Set([objId]);
      const children = (objects || []).filter(o => o.parentId === objId);
      children.forEach(child => {
        const childDescendants = getAllDescendantIds(child.id);
        childDescendants.forEach(id => descendants.add(id));
      });
      return descendants;
    };
    
    const descendants = getAllDescendantIds(selectedObject.id);
    console.log('descendants:', Array.from(descendants));
    
    if (newParentId && descendants.has(newParentId)) {
      console.log('SKIP: newParentId is descendant');
      return;
    }
    
    console.log('Calling onUpdateObject with parentId:', newParentId);
    onUpdateObject(selectedObject.id, { parentId: newParentId });
  };

  const textureAssets = (assets || []).filter(a => a.assetType === 'texture' && a.texture);

  const getPrefab = () => {
    if (!selectedObject || !selectedObject.prefabId || !prefabs) return null;
    return prefabs.find(p => p.id === selectedObject.prefabId);
  };

  const prefab = getPrefab();
  const isPrefabInstance = !!prefab;

  const handleOverrideToggle = (property) => {
    if (!selectedObject) return;
    const currentOverrides = selectedObject.overrides || { scale: false, color: false };
    const newOverrides = { ...currentOverrides, [property]: !currentOverrides[property] };
    onUpdateObject(selectedObject.id, { overrides: newOverrides });
  };

  const getParentOptions = () => {
    if (!objects || !selectedObject) return [];
    
    const getAllDescendantIds = (objId) => {
      const descendants = new Set([objId]);
      const children = objects.filter(o => o.parentId === objId);
      children.forEach(child => {
        const childDescendants = getAllDescendantIds(child.id);
        childDescendants.forEach(id => descendants.add(id));
      });
      return descendants;
    };
    
    const descendants = getAllDescendantIds(selectedObject.id);
    
    return objects.filter(obj => 
      obj.id !== selectedObject.id && 
      !descendants.has(obj.id)
    );
  };

  const parentOptions = getParentOptions();

  const renderContent = () => {
    if (!selectedObject) {
      return (
        <div className="inspector-empty">
          <div className="inspector-empty-icon">⊘</div>
          <div>{msg('inspector.empty')}</div>
          <div style={{ fontSize: '11px', marginTop: '6px' }}>
            {msg('inspector.emptyHint')}
          </div>
        </div>
      );
    }

    return (
      <div className="panel-content">
        {isPrefabInstance && (
          <div className="inspector-section inspector-prefab-section">
            <div className="inspector-section-title">{msg('inspector.prefab')}</div>
            <div className="inspector-prefab-info">
              <IconPrefabInstance className="inspector-prefab-icon" />
              <span className="inspector-prefab-name">{prefab.name}</span>
            </div>
            <div className="inspector-prefab-actions">
              <button 
                className="btn btn-small"
                onClick={() => onApplyToPrefab(selectedObject.id)}
                title={msg('inspector.applyToPrefab')}
              >
                {msg('inspector.applyToPrefab')}
              </button>
              <button 
                className="btn btn-small btn-secondary"
                onClick={() => onDisconnectPrefab(selectedObject.id)}
                title={msg('inspector.disconnectPrefab')}
              >
                {msg('inspector.disconnectPrefab')}
              </button>
            </div>
          </div>
        )}

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
              value={isPrefabInstance ? `${prefab.template.type} (Prefab)` : selectedObject.type}
              disabled
              style={{ opacity: 0.6 }}
            />
          </div>
          <div className="inspector-row">
            <label className="inspector-label">{msg('inspector.parent')}</label>
            <select
              className="inspector-input inspector-select"
              value={selectedObject.parentId || ''}
              onChange={(e) => handleParentChange(e.target.value)}
            >
              <option value="">{msg('inspector.none')}</option>
              {parentOptions.map(obj => (
                <option key={obj.id} value={obj.id}>{obj.name}</option>
              ))}
            </select>
          </div>
          <div className="inspector-row">
            <label className="inspector-label">{msg('inspector.color')}</label>
            <div className="inspector-color-row">
              <input
                type="color"
                className="inspector-input inspector-color"
                value={selectedObject.color}
                onChange={(e) => handleColorChange(e.target.value)}
              />
              {isPrefabInstance && (
                <label className="inspector-override-label">
                  <input
                    type="checkbox"
                    checked={selectedObject.overrides?.color || false}
                    onChange={() => handleOverrideToggle('color')}
                  />
                  <span>{msg('inspector.override')}</span>
                </label>
              )}
            </div>
          </div>
          {selectedObject.type === 'cube' && selectedObject.faceTextures && (
            <div className="inspector-section">
              <div className="inspector-section-title">{msg('inspector.faceTextures')}</div>
              {['right', 'left', 'top', 'bottom', 'front', 'back'].map(faceName => (
                <div key={faceName} className="inspector-row">
                  <label className="inspector-label">{msg(`inspector.face.${faceName}`)}</label>
                  <select
                    className="inspector-input inspector-select"
                    value={selectedObject.faceTextures[faceName] || ''}
                    onChange={(e) => handleFaceTextureChange(faceName, e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">{msg('inspector.noTexture')}</option>
                    {textureAssets.map(asset => (
                      <option key={asset.id} value={asset.id}>{asset.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
          {(selectedObject.type === 'sphere' || selectedObject.type === 'plane') && (
            <div className="inspector-row">
              <label className="inspector-label">{msg('inspector.texture')}</label>
              <select
                className="inspector-input inspector-select"
                value={selectedObject.textureId || ''}
                onChange={(e) => handleTextureChange(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">{msg('inspector.noTexture')}</option>
                {textureAssets.map(asset => (
                  <option key={asset.id} value={asset.id}>{asset.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="inspector-section">
          <div className="inspector-section-title">{msg('inspector.transform')}</div>

          <div className="inspector-row">
            <label className="inspector-label">{msg('inspector.position')}</label>
            <div className="inspector-vector3">
              {['X', 'Y', 'Z'].map((axis, i) => (
                <div key={axis} className="vector-input">
                  <span className="vector-label">{axis}</span>
                  <input
                    type="number"
                    className="inspector-input"
                    value={selectedObject.position[i]}
                    onChange={(e) => handleTransformChange('position', i, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="inspector-row">
            <label className="inspector-label">{msg('inspector.rotation')}</label>
            <div className="inspector-vector3">
              {['X', 'Y', 'Z'].map((axis, i) => (
                <div key={axis} className="vector-input">
                  <span className="vector-label">{axis}</span>
                  <input
                    type="number"
                    className="inspector-input"
                    value={selectedObject.rotation[i]}
                    onChange={(e) => handleTransformChange('rotation', i, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="inspector-row">
            <label className="inspector-label">{msg('inspector.scale')}</label>
            <div className="inspector-vector3-with-override">
              <div className="inspector-vector3">
                {['X', 'Y', 'Z'].map((axis, i) => (
                  <div key={axis} className="vector-input">
                    <span className="vector-label">{axis}</span>
                    <input
                      type="number"
                      className="inspector-input"
                      value={selectedObject.scale[i]}
                      onChange={(e) => handleTransformChange('scale', i, e.target.value)}
                      min="0.01"
                      step="0.1"
                    />
                  </div>
                ))}
              </div>
              {isPrefabInstance && (
                <label className="inspector-override-label">
                  <input
                    type="checkbox"
                    checked={selectedObject.overrides?.scale || false}
                    onChange={() => handleOverrideToggle('scale')}
                  />
                  <span>{msg('inspector.override')}</span>
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="inspector-section">
          <button
            className="btn btn-danger"
            style={{ width: '100%' }}
            onClick={() => onDeleteObject(selectedObject.id)}
          >
            <IconDelete className="btn-icon" /> {msg('inspector.delete')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <CollapsiblePanel 
      title={msg('inspector.title')} 
      className="inspector-panel"
      storageKey="astra-panel-inspector-collapsed"
      vertical={vertical}
      onCollapseChange={onCollapseChange}
    >
      {renderContent()}
    </CollapsiblePanel>
  );
}

export default InspectorPanel;
