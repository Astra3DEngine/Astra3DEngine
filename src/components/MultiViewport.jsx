/**
 * @file components/MultiViewport.jsx
 * @description 多视口布局组件，支持单视图和四视图切换
 * @module components/MultiViewport
 * 
 * 复杂，复杂就是爽。
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Viewport from './Viewport.jsx';
import { msg } from '../i18n/index.js';
import IconLayoutSingle from '../icons/layout-single.svg?react';
import IconLayoutQuad from '../icons/layout-quad.svg?react';

const VIEW_CONFIGS = {
  perspective: {
    label: 'viewport.perspective',
    cameraType: 'perspective',
    cameraPosition: [5, 5, 5],
    cameraLookAt: [0, 0, 0]
  },
  top: {
    label: 'viewport.top',
    cameraType: 'orthographic',
    cameraPosition: [0, 10, 0],
    cameraLookAt: [0, 0, 0]
  },
  front: {
    label: 'viewport.front',
    cameraType: 'orthographic',
    cameraPosition: [0, 0, 10],
    cameraLookAt: [0, 0, 0]
  },
  side: {
    label: 'viewport.side',
    cameraType: 'orthographic',
    cameraPosition: [10, 0, 0],
    cameraLookAt: [0, 0, 0]
  }
};

/**
 * 多视口布局组件
 * @param {Object} props - 组件属性
 * @param {Array} props.objects - 场景对象列表
 * @param {Array} props.assets - 资源列表
 * @param {Object} props.selectedObject - 当前选中的对象
 * @param {Array} props.selectedObjects - 多选对象列表
 * @param {Function} props.onSelectObject - 选择对象回调
 * @param {string} props.currentTool - 当前工具
 * @param {Function} props.onToolChange - 工具切换回调
 * @param {boolean} props.isPlaying - 是否处于播放模式
 * @param {Function} props.onUpdateObject - 更新对象回调
 * @param {Function} props.onRecordHistory - 记录历史回调
 * @param {string} props.theme - 主题
 * @param {boolean} props.lightRenderingEnabled - 是否启用光渲染
 * @param {Function} props.onLightRenderingChange - 光渲染开关变化回调
 * @returns {JSX.Element} 多视口组件
 */
function MultiViewport({
  objects,
  assets,
  selectedObject,
  selectedObjects,
  onSelectObject,
  currentTool,
  onToolChange,
  isPlaying,
  onUpdateObject,
  onRecordHistory,
  theme,
  lightRenderingEnabled,
  onLightRenderingChange
}) {
  const [layoutMode, setLayoutMode] = useState('single');
  const [activeView, setActiveView] = useState('perspective');
  const [viewStates, setViewStates] = useState({
    perspective: { cameraType: 'perspective' },
    top: { cameraType: 'orthographic' },
    front: { cameraType: 'orthographic' },
    side: { cameraType: 'orthographic' }
  });

  const handleLayoutToggle = useCallback(() => {
    setLayoutMode(prev => prev === 'single' ? 'quad' : 'single');
  }, []);

  const handleViewClick = useCallback((e, viewName) => {
    if (layoutMode === 'quad') {
      setActiveView(viewName);
    }
  }, [layoutMode]);

  const handleViewportCameraChange = useCallback((viewName, cameraType) => {
    setViewStates(prev => ({
      ...prev,
      [viewName]: { ...prev[viewName], cameraType }
    }));
  }, []);

  const renderViewport = (viewName, style = {}) => {
    const config = VIEW_CONFIGS[viewName];
    const isActive = activeView === viewName;
    const viewState = viewStates[viewName];

    return (
      <div 
        key={viewName}
        className={`multi-viewport-item ${isActive ? 'active' : ''}`}
        style={style}
        onClick={(e) => handleViewClick(e, viewName)}
      >
        <Viewport
          objects={objects}
          assets={assets}
          selectedObject={selectedObject}
          selectedObjects={selectedObjects}
          onSelectObject={onSelectObject}
          currentTool={currentTool}
          onToolChange={onToolChange}
          isPlaying={isPlaying}
          onUpdateObject={onUpdateObject}
          onRecordHistory={onRecordHistory}
          theme={theme}
          initialCameraType={viewState?.cameraType || config.cameraType}
          initialCameraPosition={config.cameraPosition}
          initialCameraLookAt={config.cameraLookAt}
          showToolbar={layoutMode === 'single' || isActive}
          showDock={layoutMode === 'single' || isActive}
          showViewCube={layoutMode === 'single' ? true : isActive}
          viewLabel={msg(config.label)}
          onCameraTypeChange={(type) => handleViewportCameraChange(viewName, type)}
          lightRenderingEnabled={lightRenderingEnabled}
          onLightRenderingChange={onLightRenderingChange}
        />
      </div>
    );
  };

  return (
    <div className="multi-viewport-container">
      <div className="multi-viewport-layout-toggle">
        <button 
          className={`layout-toggle-btn ${layoutMode === 'single' ? 'active' : ''}`}
          onClick={() => setLayoutMode('single')}
          title={msg('viewport.singleView')}
        >
          <IconLayoutSingle className="layout-icon" />
        </button>
        <button 
          className={`layout-toggle-btn ${layoutMode === 'quad' ? 'active' : ''}`}
          onClick={() => setLayoutMode('quad')}
          title={msg('viewport.quadView')}
        >
          <IconLayoutQuad className="layout-icon" />
        </button>
      </div>
      
      {layoutMode === 'single' ? (
        renderViewport(activeView, { top: 0, left: 0, right: 0, bottom: 0 })
      ) : (
        <>
          {renderViewport('top', { top: 0, left: 0, width: '50%', height: '50%' })}
          {renderViewport('front', { top: 0, right: 0, width: '50%', height: '50%' })}
          {renderViewport('side', { bottom: 0, left: 0, width: '50%', height: '50%' })}
          {renderViewport('perspective', { bottom: 0, right: 0, width: '50%', height: '50%' })}
        </>
      )}
    </div>
  );
}

export default MultiViewport;
