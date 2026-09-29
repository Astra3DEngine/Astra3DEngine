/**
 * @file components/InspectorPanel.jsx
 * @description 属性面板组件，显示和编辑选中对象的属性或场景设置
 * @module components/InspectorPanel
 */

import React, { useState, useEffect, useRef } from 'react';
import { msg } from '../i18n/index.js';
import SceneSettingsPanel from './SceneSettingsPanel.jsx';
import ObjectSection from './inspector/ObjectSection.jsx';
import LightSection from './inspector/LightSection.jsx';
import TextureSection from './inspector/TextureSection.jsx';
import TransformSection from './inspector/TransformSection.jsx';
import IconDelete from '../assets/icons/editor/delete.svg?react';
import IconClose from '../assets/icons/editor/close.svg?react';
import IconScene from '../assets/icons/tools/scene.svg?react';
import IconCube from '../assets/icons/tools/cube.svg?react';
import { getAllDescendantIds } from '../engine/TreeMath.js';
import { tip } from '../lib/tooltip.js';

/**
 * 面板类型定义
 * 预留 API，方便以后添加更多面板喵！
 */
const PANEL_TYPES = {
  SCENE: 'scene',
  OBJECT: 'object',
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
  defaultPanel = PANEL_TYPES.SCENE,
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

  const textureAssets = (assets || []).filter((a) => a.assetType === 'texture' && a.texture);

  const getPrefab = () => {
    if (!selectedObject || !selectedObject.prefabId || !prefabs) return null;
    return prefabs.find((p) => p.id === selectedObject.prefabId);
  };

  const prefab = getPrefab();
  const isPrefabInstance = !!prefab;

  const getParentOptions = () => {
    if (!objects || !selectedObject) return [];

    const descendants = getAllDescendantIds(selectedObject.id, objects);

    return objects.filter((obj) => obj.id !== selectedObject.id && !descendants.has(obj.id));
  };

  const parentOptions = getParentOptions();

  const renderContent = () => {
    // 根据当前激活的面板类型来渲染内容喵！
    if (activePanel === PANEL_TYPES.SCENE) {
      return (
        <div className="panel-content">
          <SceneSettingsPanel sceneSettings={sceneSettings} onUpdateSettings={onUpdateSettings} />
        </div>
      );
    }

    // 对象面板：如果没有选中对象，显示提示喵！
    if (!selectedObject) {
      return (
        <div className="panel-content">
          <div className="inspector-section">
            <div className="inspector-section-title">{msg('inspector.object')}</div>
            <div className="inspector-empty-hint">{msg('inspector.emptyHint')}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="panel-content">
        <ObjectSection
          selectedObject={selectedObject}
          prefab={prefab}
          isPrefabInstance={isPrefabInstance}
          parentOptions={parentOptions}
          objects={objects}
          onUpdateObject={onUpdateObject}
          onApplyToPrefab={onApplyToPrefab}
          onDisconnectPrefab={onDisconnectPrefab}
        />

        <LightSection selectedObject={selectedObject} onUpdateObject={onUpdateObject} />

        <TextureSection
          selectedObject={selectedObject}
          textureAssets={textureAssets}
          onUpdateObject={onUpdateObject}
        />

        <TransformSection
          selectedObject={selectedObject}
          objects={objects}
          isPrefabInstance={isPrefabInstance}
          onUpdateObject={onUpdateObject}
        />

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
      { key: PANEL_TYPES.OBJECT, icon: IconCube, title: msg('inspector.objectTab') },
    ];

    return (
      <div className="inspector-sidebar">
        {panels.map((panel) => (
          <button
            key={panel.key}
            className={`inspector-sidebar-btn ${isExpanded && activePanel === panel.key ? 'active' : ''}`}
            onClick={() => handlePanelClick(panel.key)}
            {...tip(panel.title)}
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
          <div className="inspector-resize-handle" onMouseDown={handleMouseDown} />

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
                {...tip(msg('inspector.clearSelection'))}
              >
                <IconClose className="inspector-clear-icon" />
              </button>
            )}
          </div>

          {/* 面板内容喵！ */}
          <div className="inspector-body">{renderContent()}</div>
        </div>
      )}

      {/* 图标按钮栏喵！ */}
      {renderSidebar()}
    </div>
  );
}

export default InspectorPanel;
