/**
 * @file components/InspectorPanel.jsx
 * @description 属性面板组件，显示和编辑选中对象的属性或场景设置
 * @module components/InspectorPanel
 */

import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { msg } from '../i18n/index.js';
import IconPrefabInstance from '../icons/prefab-instance.svg?react';
import IconDelete from '../icons/delete.svg?react';
import SceneSettingsPanel from './SceneSettingsPanel.jsx';
import IconClose from '../icons/close.svg?react';
import IconScene from '../icons/scene.svg?react';
import IconCube from '../icons/cube.svg?react';

/**
 * 面板类型定义
 * 预留 API，方便以后添加更多面板喵！
 */
const PANEL_TYPES = {
  SCENE: 'scene',
  OBJECT: 'object'
};

/**
 * 属性面板组件
 * VSCode 风格的侧栏，右侧有图标按钮栏，点击按钮展开面板喵！
 * 
 * @param {Object} props - 组件属性
 * @param {Object} props.selectedObject - 当前选中的对象
 * @param {Function} props.onUpdateObject - 更新对象属性回调
 * @param {Function} props.onDeleteObject - 删除对象回调
 * @param {Array} props.prefabs - 预制件列表
 * @param {Function} props.onDisconnectPrefab - 断开预制件连接回调
 * @param {Function} props.onApplyToPrefab - 应用到预制件回调
 * @param {Array} props.assets - 资源列表
 * @param {Array} props.objects - 场景对象列表
 * @param {Object} props.sceneSettings - 当前场景的设置对象
 * @param {Function} props.onUpdateSettings - 更新场景设置回调
 * @param {Function} props.onClearSelection - 取消选中回调
 * @param {string} props.defaultPanel - 默认显示的面板类型，默认为 'scene'
 * @returns {JSX.Element} 属性面板组件
 */
function InspectorPanel({ 
  selectedObject, 
  onUpdateObject, 
  onDeleteObject,
  prefabs,
  onDisconnectPrefab,
  onApplyToPrefab,
  assets,
  objects,
  sceneSettings,
  onUpdateSettings,
  onClearSelection,
  defaultPanel = PANEL_TYPES.SCENE
}) {
  // 面板状态喵！
  const [isExpanded, setIsExpanded] = useState(false);
  const [activePanel, setActivePanel] = useState(defaultPanel);
  const [width, setWidth] = useState(280); // 默认宽度 280px
  
  // 拖拽拉伸相关喵！
  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);

  // 当选中对象时，自动展开面板并切换到对象面板喵！
  useEffect(() => {
    if (selectedObject) {
      setIsExpanded(true);
      setActivePanel(PANEL_TYPES.OBJECT);
    }
  }, [selectedObject]);

  // 处理拉伸拖拽喵！
  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      
      // 计算新宽度：容器右侧到鼠标位置的距离，减去按钮栏宽度喵！
      // 因为面板内容在左侧，拉伸把手在面板内容的左侧喵！
      const containerRect = containerRef.current.getBoundingClientRect();
      const sidebarWidth = 36; // 按钮栏宽度 36px 喵！
      const newWidth = containerRect.right - e.clientX - sidebarWidth;
      
      // 限制最小和最大宽度喵！
      const minWidth = 200;
      const maxWidth = 400;
      setWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // 点击图标按钮的处理喵！
  const handlePanelClick = (panelType) => {
    if (!isExpanded) {
      // 面板收起时，展开面板并切换到对应类型喵！
      setIsExpanded(true);
      setActivePanel(panelType);
    } else if (activePanel === panelType) {
      // 面板展开且点击的是当前激活的类型，收起面板喵！
      setIsExpanded(false);
    } else {
      // 面板展开但点击的是其他类型，切换面板类型喵！
      setActivePanel(panelType);
    }
  };
  /**
   * 计算子对象相对于父对象的变换（使用四元数）
   * 
   * 正确的相对变换计算需要考虑父对象的旋转对位置的影响。
   * 使用四元数来计算相对旋转，避免欧拉角的万向节锁问题。
   * 
   * 相对位置计算：
   * 1. 先计算子对象相对于父对象位置的偏移
   * 2. 将偏移反向应用父对象的旋转（得到在父对象局部坐标系中的位置）
   * 3. 除以父对象的缩放（得到相对位置）
   * 
   * 相对旋转计算：
   * 使用四元数：相对旋转 = 父对象旋转的逆 × 子对象旋转
   * 
   * 相对缩放计算：
   * 子对象缩放 / 父对象缩放
   * 
   * @param {Object} child - 子对象数据
   * @param {Object} parent - 父对象数据
   * @returns {Object} 相对变换 { position, rotation, scale }
   */
  const computeRelativeTransform = (child, parent) => {
    const childPos = new THREE.Vector3(child.position[0], child.position[1], child.position[2]);
    const childRot = new THREE.Euler(
      THREE.MathUtils.degToRad(child.rotation[0]),
      THREE.MathUtils.degToRad(child.rotation[1]),
      THREE.MathUtils.degToRad(child.rotation[2])
    );
    const childQuat = new THREE.Quaternion().setFromEuler(childRot);
    const childScale = new THREE.Vector3(child.scale[0], child.scale[1], child.scale[2]);
    
    const parentPos = new THREE.Vector3(parent.position[0], parent.position[1], parent.position[2]);
    const parentRot = new THREE.Euler(
      THREE.MathUtils.degToRad(parent.rotation[0]),
      THREE.MathUtils.degToRad(parent.rotation[1]),
      THREE.MathUtils.degToRad(parent.rotation[2])
    );
    const parentQuat = new THREE.Quaternion().setFromEuler(parentRot);
    const parentScale = new THREE.Vector3(parent.scale[0], parent.scale[1], parent.scale[2]);
    
    const relativePos = childPos.clone().sub(parentPos);
    relativePos.applyQuaternion(parentQuat.clone().invert());
    relativePos.divide(parentScale);
    
    const relativeQuat = parentQuat.clone().invert().multiply(childQuat);
    const relativeEuler = new THREE.Euler().setFromQuaternion(relativeQuat);
    
    const relativeScale = new THREE.Vector3(
      childScale.x / parentScale.x,
      childScale.y / parentScale.y,
      childScale.z / parentScale.z
    );
    
    return {
      position: [relativePos.x, relativePos.y, relativePos.z],
      rotation: [
        THREE.MathUtils.radToDeg(relativeEuler.x),
        THREE.MathUtils.radToDeg(relativeEuler.y),
        THREE.MathUtils.radToDeg(relativeEuler.z)
      ],
      scale: [relativeScale.x, relativeScale.y, relativeScale.z]
    };
  };

  /**
   * 根据父对象的世界变换计算子对象的世界变换（使用四元数）
   * 
   * 这是computeRelativeTransform的逆运算：
   * 子对象世界变换 = 父对象世界变换 × 子对象相对变换
   * 
   * 世界位置计算：
   * 1. 相对位置 × 父对象缩放
   * 2. 应用父对象旋转
   * 3. 加上父对象位置
   * 
   * 世界旋转计算：
   * 使用四元数：世界旋转 = 父对象旋转 × 相对旋转
   * 
   * 世界缩放计算：
   * 相对缩放 × 父对象缩放
   * 
   * @param {Object} relativeTransform - 子对象的相对变换
   * @param {Object} parent - 父对象数据
   * @returns {Object} 世界变换 { position, rotation, scale }
   */
  const computeWorldTransformFromRelative = (relativeTransform, parent) => {
    const relativePos = new THREE.Vector3(
      relativeTransform.position[0],
      relativeTransform.position[1],
      relativeTransform.position[2]
    );
    const relativeRot = new THREE.Euler(
      THREE.MathUtils.degToRad(relativeTransform.rotation[0]),
      THREE.MathUtils.degToRad(relativeTransform.rotation[1]),
      THREE.MathUtils.degToRad(relativeTransform.rotation[2])
    );
    const relativeQuat = new THREE.Quaternion().setFromEuler(relativeRot);
    const relativeScale = new THREE.Vector3(
      relativeTransform.scale[0],
      relativeTransform.scale[1],
      relativeTransform.scale[2]
    );
    
    const parentPos = new THREE.Vector3(parent.position[0], parent.position[1], parent.position[2]);
    const parentRot = new THREE.Euler(
      THREE.MathUtils.degToRad(parent.rotation[0]),
      THREE.MathUtils.degToRad(parent.rotation[1]),
      THREE.MathUtils.degToRad(parent.rotation[2])
    );
    const parentQuat = new THREE.Quaternion().setFromEuler(parentRot);
    const parentScale = new THREE.Vector3(parent.scale[0], parent.scale[1], parent.scale[2]);
    
    const worldPos = relativePos.clone();
    worldPos.multiply(parentScale);
    worldPos.applyQuaternion(parentQuat);
    worldPos.add(parentPos);
    
    const worldQuat = parentQuat.clone().multiply(relativeQuat);
    const worldEuler = new THREE.Euler().setFromQuaternion(worldQuat);
    
    const worldScale = new THREE.Vector3(
      relativeScale.x * parentScale.x,
      relativeScale.y * parentScale.y,
      relativeScale.z * parentScale.z
    );
    
    return {
      position: [worldPos.x, worldPos.y, worldPos.z],
      rotation: [
        THREE.MathUtils.radToDeg(worldEuler.x),
        THREE.MathUtils.radToDeg(worldEuler.y),
        THREE.MathUtils.radToDeg(worldEuler.z)
      ],
      scale: [worldScale.x, worldScale.y, worldScale.z]
    };
  };

  /**
   * 获取父对象数据
   * 
   * @returns {Object|null} 父对象数据，如果没有父对象则返回null
   */
  const getParentObject = () => {
    if (!selectedObject || !selectedObject.parentId || !objects) return null;
    return objects.find(obj => obj.id === selectedObject.parentId);
  };

  const parentObject = getParentObject();

  /**
   * 获取显示的变换值
   * 
   * 如果对象有父对象，显示相对于父对象的变换；
   * 否则显示世界变换。
   * 
   * @returns {Object} 显示的变换 { position, rotation, scale }
   */
  const getDisplayTransform = () => {
    if (!selectedObject) return { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
    
    if (parentObject) {
      return computeRelativeTransform(selectedObject, parentObject);
    }
    
    return {
      position: selectedObject.position,
      rotation: selectedObject.rotation,
      scale: selectedObject.scale
    };
  };

  const displayTransform = getDisplayTransform();

  const handleTransformChange = (property, index, value) => {
    if (!selectedObject) return;
    const newValue = parseFloat(value) || 0;
    
    if (parentObject) {
      const newRelativeTransform = { ...displayTransform };
      newRelativeTransform[property] = [...displayTransform[property]];
      newRelativeTransform[property][index] = newValue;
      
      const worldTransform = computeWorldTransformFromRelative(newRelativeTransform, parentObject);
      onUpdateObject(selectedObject.id, { [property]: worldTransform[property] });
    } else {
      const newTransform = [...selectedObject[property]];
      newTransform[index] = newValue;
      onUpdateObject(selectedObject.id, { [property]: newTransform });
    }
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

  /**
   * UV变换处理函数
   * 
   * UV缩放控制纹理在物体上的重复次数，值越大纹理越小（重复更多）。
   * UV偏移控制纹理在物体上的位置，用于调整纹理的起始位置。
   * 
   * @param {string} property - 'uvScale' 或 'uvOffset'
   * @param {number} index - 0(U) 或 1(V)
   * @param {string} value - 输入值
   */
  const handleUVChange = (property, index, value) => {
    if (!selectedObject) return;
    const newValue = parseFloat(value) || 0;
    const currentUV = selectedObject[property] || [1, 1];
    const newUV = [...currentUV];
    newUV[index] = newValue;
    onUpdateObject(selectedObject.id, { [property]: newUV });
  };

  const handleParentChange = (parentId) => {
    if (!selectedObject) return;

    const newParentId = parentId === '' ? null : parentId;
    if (newParentId === selectedObject.id) return;

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
    if (newParentId && descendants.has(newParentId)) return;

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
    // 根据当前激活的面板类型来渲染内容喵！
    if (activePanel === PANEL_TYPES.SCENE) {
      return (
        <div className="panel-content">
          <SceneSettingsPanel 
            sceneSettings={sceneSettings}
            onUpdateSettings={onUpdateSettings}
          />
        </div>
      );
    }

    // 对象面板：如果没有选中对象，显示提示喵！
    if (!selectedObject) {
      return (
        <div className="panel-content">
          <div className="inspector-section">
            <div className="inspector-section-title">{msg('inspector.object')}</div>
            <div className="inspector-empty-hint">
              {msg('inspector.emptyHint')}
            </div>
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
              value={selectedObject.name || ''}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>
          <div className="inspector-row">
            <label className="inspector-label">{msg('inspector.type')}</label>
            <input
              type="text"
              className="inspector-input"
              value={isPrefabInstance ? `${prefab.template.type} (Prefab)` : 
                (selectedObject.isLight ? msg(`hierarchy.${selectedObject.type || 'light'}`) : selectedObject.type || 'unknown')}
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
                value={selectedObject.color || '#ffffff'}
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
          
          {/* 光源属性 */}
          {selectedObject.isLight && (
            <div className="inspector-section">
              <div className="inspector-section-title">{msg('inspector.light')}</div>
              <div className="inspector-row">
                <label className="inspector-label">{msg('inspector.intensity')}</label>
                <input
                  type="number"
                  className="inspector-input inspector-number"
                  value={selectedObject.intensity || 2}
                  min={0}
                  step={0.1}
                  onChange={(e) => onUpdateObject(selectedObject.id, { intensity: parseFloat(e.target.value) || 2 })}
                />
              </div>
              {(selectedObject.lightType === 'point' || selectedObject.lightType === 'spot') && (
                <>
                  <div className="inspector-row">
                    <label className="inspector-label">{msg('inspector.distance')}</label>
                    <input
                      type="number"
                      className="inspector-input inspector-number"
                      value={selectedObject.distance || 10}
                      min={0}
                      step={1}
                      onChange={(e) => onUpdateObject(selectedObject.id, { distance: parseFloat(e.target.value) || 10 })}
                    />
                  </div>
                  <div className="inspector-row">
                    <label className="inspector-label">{msg('inspector.decay')}</label>
                    <input
                      type="number"
                      className="inspector-input inspector-number"
                      value={selectedObject.decay || 1}
                      min={0}
                      step={0.1}
                      onChange={(e) => onUpdateObject(selectedObject.id, { decay: parseFloat(e.target.value) || 1 })}
                    />
                  </div>
                </>
              )}
              {selectedObject.lightType === 'spot' && (
                <>
                  <div className="inspector-row">
                    <label className="inspector-label">{msg('inspector.angle')}</label>
                    <input
                      type="number"
                      className="inspector-input inspector-number"
                      value={selectedObject.angle ? (selectedObject.angle * 180 / Math.PI).toFixed(1) : 45}
                      min={0}
                      max={90}
                      step={1}
                      onChange={(e) => onUpdateObject(selectedObject.id, { angle: parseFloat(e.target.value) * Math.PI / 180 || Math.PI / 4 })}
                    />
                  </div>
                  <div className="inspector-row">
                    <label className="inspector-label">{msg('inspector.penumbra')}</label>
                    <input
                      type="number"
                      className="inspector-input inspector-number"
                      value={selectedObject.penumbra || 0.3}
                      min={0}
                      max={1}
                      step={0.1}
                      onChange={(e) => onUpdateObject(selectedObject.id, { penumbra: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </>
              )}
            </div>
          )}
          
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
          
          {selectedObject.isModel && (
            <div className="inspector-section">
              <div className="inspector-section-title">{msg('inspector.modelTexture')}</div>
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
              {selectedObject.textureId != null && (
                <>
                  <div className="inspector-row">
                    <label className="inspector-label">{msg('inspector.uvScale')}</label>
                    <div className="inspector-vector2">
                      {['U', 'V'].map((axis, i) => (
                        <div key={axis} className="vector-input">
                          <span className="vector-label">{axis}</span>
                          <input
                            type="number"
                            className="inspector-input"
                            value={(selectedObject.uvScale || [1, 1])[i]}
                            onChange={(e) => handleUVChange('uvScale', i, e.target.value)}
                            step="0.1"
                            min="0.01"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="inspector-row">
                    <label className="inspector-label">{msg('inspector.uvOffset')}</label>
                    <div className="inspector-vector2">
                      {['U', 'V'].map((axis, i) => (
                        <div key={axis} className="vector-input">
                          <span className="vector-label">{axis}</span>
                          <input
                            type="number"
                            className="inspector-input"
                            value={(selectedObject.uvOffset || [0, 0])[i]}
                            onChange={(e) => handleUVChange('uvOffset', i, e.target.value)}
                            step="0.1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* mesh 类型贴图支持，可以给模型内部的单个 mesh 换贴图喵 */}
          {selectedObject.type === 'mesh' && (
            <div className="inspector-section">
              <div className="inspector-section-title">{msg('inspector.meshTexture')}</div>
              <div className="inspector-row">
                <label className="inspector-label">{msg('inspector.texture')}</label>
                <select
                  className="inspector-input inspector-select"
                  value={selectedObject.textureId || ''}
                  onChange={(e) => handleTextureChange(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">{msg('inspector.originalTexture')}</option>
                  {textureAssets.map(asset => (
                    <option key={asset.id} value={asset.id}>{asset.name}</option>
                  ))}
                </select>
              </div>
              {selectedObject.textureId != null && (
                <>
                  <div className="inspector-row">
                    <label className="inspector-label">{msg('inspector.uvScale')}</label>
                    <div className="inspector-vector2">
                      {['U', 'V'].map((axis, i) => (
                        <div key={axis} className="vector-input">
                          <span className="vector-label">{axis}</span>
                          <input
                            type="number"
                            className="inspector-input"
                            value={(selectedObject.uvScale || [1, 1])[i]}
                            onChange={(e) => handleUVChange('uvScale', i, e.target.value)}
                            step="0.1"
                            min="0.01"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="inspector-row">
                    <label className="inspector-label">{msg('inspector.uvOffset')}</label>
                    <div className="inspector-vector2">
                      {['U', 'V'].map((axis, i) => (
                        <div key={axis} className="vector-input">
                          <span className="vector-label">{axis}</span>
                          <input
                            type="number"
                            className="inspector-input"
                            value={(selectedObject.uvOffset || [0, 0])[i]}
                            onChange={(e) => handleUVChange('uvOffset', i, e.target.value)}
                            step="0.1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          
          {(selectedObject.type === 'sphere' || selectedObject.type === 'plane') && selectedObject.textureId != null && (
            <div className="inspector-section">
              <div className="inspector-section-title">{msg('inspector.uvTransform')}</div>
              <div className="inspector-row">
                <label className="inspector-label">{msg('inspector.uvScale')}</label>
                <div className="inspector-vector2">
                  {['U', 'V'].map((axis, i) => (
                    <div key={axis} className="vector-input">
                      <span className="vector-label">{axis}</span>
                      <input
                        type="number"
                        className="inspector-input"
                        value={(selectedObject.uvScale || [1, 1])[i]}
                        onChange={(e) => handleUVChange('uvScale', i, e.target.value)}
                        step="0.1"
                        min="0.01"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="inspector-row">
                <label className="inspector-label">{msg('inspector.uvOffset')}</label>
                <div className="inspector-vector2">
                  {['U', 'V'].map((axis, i) => (
                    <div key={axis} className="vector-input">
                      <span className="vector-label">{axis}</span>
                      <input
                        type="number"
                        className="inspector-input"
                        value={(selectedObject.uvOffset || [0, 0])[i]}
                        onChange={(e) => handleUVChange('uvOffset', i, e.target.value)}
                        step="0.1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="inspector-section">
          <div className="inspector-section-title">
            {msg('inspector.transform')}
            {parentObject && <span className="inspector-relative-hint"> (相对)</span>}
          </div>

          <div className="inspector-row">
            <label className="inspector-label">{msg('inspector.position')}</label>
            <div className="inspector-vector3">
              {['X', 'Y', 'Z'].map((axis, i) => (
                <div key={axis} className="vector-input">
                  <span className="vector-label">{axis}</span>
                  <input
                    type="number"
                    className="inspector-input"
                    value={displayTransform.position[i]}
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
                    value={displayTransform.rotation[i]}
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
                      value={displayTransform.scale[i]}
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

  /**
   * 渲染图标按钮栏
   * VSCode 风格的侧栏，右侧垂直排列的图标按钮喵！
   */
  const renderSidebar = () => {
    const panels = [
      { key: PANEL_TYPES.SCENE, icon: IconScene, title: msg('inspector.sceneTab') },
      { key: PANEL_TYPES.OBJECT, icon: IconCube, title: msg('inspector.objectTab') }
    ];

    return (
      <div className="inspector-sidebar">
        {panels.map(panel => (
          <button
            key={panel.key}
            className={`inspector-sidebar-btn ${isExpanded && activePanel === panel.key ? 'active' : ''}`}
            onClick={() => handlePanelClick(panel.key)}
            title={panel.title}
          >
            <panel.icon className="inspector-sidebar-icon" />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className={`inspector-container ${isExpanded ? 'panel-expanded' : ''}`} ref={containerRef}>
      {/* 面板内容区域喵！ */}
      {isExpanded && (
        <div className="inspector-content" style={{ width: `${width}px` }}>
          {/* 拉伸把手喵！ */}
          <div 
            className="inspector-resize-handle"
            onMouseDown={handleMouseDown}
          />
          
          {/* 面板标题栏喵！ */}
          <div className="inspector-header">
            <span className="inspector-header-title">
              {activePanel === PANEL_TYPES.SCENE 
                ? msg('inspector.sceneTab') 
                : msg('inspector.objectTab')}
            </span>
            {selectedObject && onClearSelection && activePanel === PANEL_TYPES.OBJECT && (
              <button 
                className="inspector-clear-btn"
                onClick={onClearSelection}
                title={msg('inspector.clearSelection')}
              >
                <IconClose className="inspector-clear-icon" />
              </button>
            )}
          </div>
          
          {/* 面板内容喵！ */}
          <div className="inspector-body">
            {renderContent()}
          </div>
        </div>
      )}
      
      {/* 图标按钮栏喵！ */}
      {renderSidebar()}
    </div>
  );
}

export default InspectorPanel;
