/**
 * @file components/ScenePanel.jsx
 * @description 场景面板组件，专门管理所有场景喵！
 * @module components/ScenePanel
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { msg } from '../i18n/index.js';
import CollapsiblePanel from './CollapsiblePanel.jsx';
import IconScene from '../icons/scene.svg?react';
import IconStar from '../icons/star.svg?react';
import IconPlus from '../icons/plus.svg?react';
import IconDelete from '../icons/delete.svg?react';
import IconRename from '../icons/rename.svg?react';

/**
 * 场景面板组件
 * 
 * 专门用于管理所有场景的面板喵！
 * 支持场景切换、新建、删除、重命名、设置主场景等功能。
 * 
 * @param {Object} props - 组件属性
 * @param {Array} props.scenes - 所有场景列表
 * @param {string} props.currentSceneId - 当前激活场景ID
 * @param {Function} props.onSwitchScene - 切换场景回调
 * @param {Function} props.onCreateScene - 创建新场景回调
 * @param {Function} props.onDeleteScene - 删除场景回调
 * @param {Function} props.onRenameScene - 重命名场景回调
 * @param {Function} props.onSetMainScene - 设置主场景回调
 * @param {boolean} props.vertical - 是否垂直布局
 * @param {Function} props.onCollapseChange - 折叠状态变化回调
 * @param {Object} props.style - 自定义样式（用于动态高度喵！）
 * @returns {JSX.Element} 场景面板组件
 */
function ScenePanel({
  scenes = [],
  currentSceneId,
  onSwitchScene,
  onCreateScene,
  onDeleteScene,
  onRenameScene,
  onSetMainScene,
  vertical,
  onCollapseChange,
  style
}) {
  // 场景重命名状态喵！
  const [isRenaming, setIsRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef(null);

  /**
   * 获取当前场景对象
   */
  const currentScene = useMemo(() => {
    return scenes.find(s => s.id === currentSceneId) || scenes[0];
  }, [scenes, currentSceneId]);

  /**
   * 重命名输入框聚焦喵！
   */
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  /**
   * 切换场景
   */
  const handleSwitchScene = (sceneId) => {
    if (sceneId !== currentSceneId && onSwitchScene) {
      onSwitchScene(sceneId);
    }
  };

  /**
   * 开始场景重命名
   */
  const handleStartRename = (sceneId, currentName) => {
    setIsRenaming(sceneId);
    setRenameValue(currentName);
  };

  /**
   * 场景重命名提交
   */
  const handleRenameSubmit = () => {
    if (isRenaming && renameValue.trim() && onRenameScene) {
      onRenameScene(isRenaming, renameValue.trim());
    }
    setIsRenaming(null);
    setRenameValue('');
  };

  /**
   * 场景重命名键盘事件
   */
  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsRenaming(null);
      setRenameValue('');
    }
  };

  /**
   * 删除场景
   * 不能删除最后一个场景喵！
   */
  const handleDeleteScene = (sceneId) => {
    if (scenes.length <= 1) {
      alert(msg('scene.cannotDeleteLast'));
      return;
    }
    
    const sceneToDelete = scenes.find(s => s.id === sceneId);
    if (sceneToDelete?.isMain) {
      alert(msg('scene.cannotDeleteMain'));
      return;
    }
    
    if (onDeleteScene) {
      onDeleteScene(sceneId);
    }
  };

  /**
   * 设置为主场景
   */
  const handleSetMainScene = (sceneId) => {
    if (onSetMainScene) {
      onSetMainScene(sceneId);
    }
  };

  /**
   * 创建新场景
   */
  const handleCreateScene = () => {
    if (onCreateScene) {
      onCreateScene();
    }
  };

  /**
   * 渲染单个场景项
   */
  const renderSceneItem = (scene) => {
    const isActive = scene.id === currentSceneId;
    const isMain = scene.isMain;
    
    return (
      <div 
        key={scene.id}
        className={`scene-item ${isActive ? 'active' : ''} ${isMain ? 'is-main' : ''}`}
        onClick={() => handleSwitchScene(scene.id)}
      >
        <div className="scene-item-icon-wrapper">
          <IconScene className="scene-item-icon" />
        </div>
        
        {isRenaming === scene.id ? (
          <input
            ref={renameInputRef}
            type="text"
            className="scene-rename-input"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleRenameKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <span className="scene-item-name">{scene.name}</span>
            {isMain && (
              <IconStar className="scene-main-star" title={msg('scene.isMain')} />
            )}
          </>
        )}
        
        <span className="scene-object-count">
          {scene.objects?.length || 0}
        </span>
        
        {/* 场景操作按钮喵！ */}
        <div className="scene-item-actions">
          {!isMain && (
            <button
              className="scene-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleSetMainScene(scene.id);
              }}
              title={msg('scene.setMain')}
            >
              <IconStar className="scene-action-icon" />
            </button>
          )}
          
          <button
            className="scene-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleStartRename(scene.id, scene.name);
            }}
            title={msg('scene.rename')}
          >
            <IconRename className="scene-action-icon" />
          </button>
          
          {!isMain && scenes.length > 1 && (
            <button
              className="scene-action-btn scene-action-danger"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteScene(scene.id);
              }}
              title={msg('scene.delete')}
            >
              <IconDelete className="scene-action-icon" />
            </button>
          )}
        </div>
      </div>
    );
  };

  /**
   * 头部右侧按钮：新建场景（与层级面板样式一致喵！）
   */
  const headerRight = (
    <button 
      className="add-menu-trigger"
      onClick={handleCreateScene}
      title={msg('scene.createNew')}
    >
      <IconPlus className="add-menu-icon" />
    </button>
  );

  return (
    <CollapsiblePanel 
      title={msg('scene.panelTitle')} 
      className="scene-panel"
      storageKey="astra-panel-scene-collapsed"
      vertical={vertical}
      onCollapseChange={onCollapseChange}
      headerRight={headerRight}
      style={style}
    >
      <div className="scene-list">
        {scenes.length === 0 ? (
          <div className="scene-empty">
            {msg('scene.empty')}
            <button 
              className="scene-empty-create-btn"
              onClick={handleCreateScene}
            >
              <IconPlus className="scene-empty-create-icon" />
              {msg('scene.createNew')}
            </button>
          </div>
        ) : (
          scenes.map(scene => renderSceneItem(scene))
        )}
      </div>
      
      {/* 当前场景信息喵！ */}
      {currentScene && (
        <div className="scene-current-info">
          <div className="scene-info-label">{msg('scene.currentScene')}</div>
          <div className="scene-info-value">
            <IconScene className="scene-info-icon" />
            <span>{currentScene.name}</span>
            {currentScene.isMain && (
              <IconStar className="scene-info-main-star" />
            )}
          </div>
        </div>
      )}
    </CollapsiblePanel>
  );
}

export default ScenePanel;