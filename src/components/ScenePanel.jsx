/**
 * @file components/ScenePanel.jsx
 * @description 场景面板组件，专门管理所有场景喵！
 * @module components/ScenePanel
 */

import React, { useState, useMemo } from 'react';
import { msg } from '../i18n/index.js';
import RenameInput from './primitives/RenameInput.jsx';
import IconScene from '../assets/icons/tools/scene.svg?react';
import IconStar from '../assets/icons/tools/star.svg?react';
import IconPlus from '../assets/icons/editor/plus.svg?react';
import IconDelete from '../assets/icons/editor/delete.svg?react';
import IconRename from '../assets/icons/editor/rename.svg?react';
import { useScenesStore } from '../stores/useScenesStore.js';

/**
 * 场景面板组件：直接读取 store 管理所有场景（切换/新建/删除/重命名/设主场景）。
 * @returns {JSX.Element} 场景面板组件
 */
function ScenePanel() {
  // ===== store 驱动 =====
  const scenes = useScenesStore((s) => s.scenes);
  const currentSceneId = useScenesStore((s) => s.currentSceneId);
  const onSwitchScene = useScenesStore.getState().switchScene;
  const onCreateScene = useScenesStore.getState().createScene;
  const onDeleteScene = useScenesStore.getState().deleteScene;
  const onRenameScene = useScenesStore.getState().renameScene;
  const onSetMainScene = useScenesStore.getState().setMainScene;
  // 场景重命名状态喵！
  const [isRenaming, setIsRenaming] = useState(null);

  /**
   * 获取当前场景对象
   */
  const currentScene = useMemo(() => {
    return scenes.find((s) => s.id === currentSceneId) || scenes[0];
  }, [scenes, currentSceneId]);

  /**
   * 开始场景重命名
   */
  const handleStartRename = (sceneId) => {
    setIsRenaming(sceneId);
  };

  /**
   * 切换场景
   */
  const handleSwitchScene = (sceneId) => {
    if (sceneId !== currentSceneId && onSwitchScene) {
      onSwitchScene(sceneId);
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

    const sceneToDelete = scenes.find((s) => s.id === sceneId);
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
          <RenameInput
            value={scene.name}
            className="scene-rename-input"
            onSubmit={(value) => {
              if (onRenameScene) onRenameScene(scene.id, value);
              setIsRenaming(null);
            }}
            onCancel={() => setIsRenaming(null)}
          />
        ) : (
          <>
            <span className="scene-item-name">{scene.name}</span>
            {isMain && <IconStar className="scene-main-star" title={msg('scene.isMain')} />}
          </>
        )}

        <span className="scene-object-count">{scene.objects?.length || 0}</span>

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
              handleStartRename(scene.id);
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
   * 渲染场景列表（新建场景入口在侧栏标题栏）
   */
  return (
    <div className="scene-panel">
      <div className="scene-list">
        {scenes.length === 0 ? (
          <div className="scene-empty">
            {msg('scene.empty')}
            <button className="scene-empty-create-btn" onClick={handleCreateScene}>
              <IconPlus className="scene-empty-create-icon" />
              {msg('scene.createNew')}
            </button>
          </div>
        ) : (
          scenes.map((scene) => renderSceneItem(scene))
        )}
      </div>

      {/* 当前场景信息喵！ */}
      {currentScene && (
        <div className="scene-current-info">
          <div className="scene-info-label">{msg('scene.currentScene')}</div>
          <div className="scene-info-value">
            <IconScene className="scene-info-icon" />
            <span>{currentScene.name}</span>
            {currentScene.isMain && <IconStar className="scene-info-main-star" />}
          </div>
        </div>
      )}
    </div>
  );
}

export default ScenePanel;
