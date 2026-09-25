/**
 * @file components/sidebar/Sidebar.jsx
 * @description VSCode 式侧栏：活动栏（图标列）+ 单面板内容。
 * - CreateObjectMenu 宿主常驻挂载（折叠/切面板不影响 Alt+Q 新建菜单）
 * - 标题栏右侧按当前面板渲染操作按钮（层级新建 / 场景新建）
 * - dock 面板标题可拖回底部
 * @module components/sidebar/Sidebar
 */

import React, { useCallback } from 'react';
import { useUIStore } from '../../stores/useUIStore.js';
import { useDockStore } from '../../stores/useDockStore.js';
import { useScenesStore } from '../../stores/useScenesStore.js';
import { SIDEBAR_VIEWS } from './sidebarViews.js';
import { DOCK_PANELS } from '../dock/dockPanels.js';
import { msg } from '../../i18n/index.js';
import ActivityBar from './ActivityBar.jsx';
import CreateObjectMenu, { openCreateObjectMenu } from './CreateObjectMenu.jsx';
import IconPlus from '../../assets/icons/editor/plus.svg?react';

const DRAG_MIME = 'application/astra-dock-tab';

export default function Sidebar() {
  const activeSidebarView = useUIStore((s) => s.activeSidebarView);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const movePanel = useDockStore((s) => s.movePanel);

  const def = SIDEBAR_VIEWS[activeSidebarView]?.Component
    ? {
        titleKey: SIDEBAR_VIEWS[activeSidebarView].titleKey,
        Component: SIDEBAR_VIEWS[activeSidebarView].Component,
      }
    : DOCK_PANELS[activeSidebarView]?.Component
      ? {
          titleKey: DOCK_PANELS[activeSidebarView].titleKey,
          Component: DOCK_PANELS[activeSidebarView].Component,
        }
      : null;
  const Content = def?.Component;

  // 标题栏右侧操作按钮（按面板分发）
  const renderTitleActions = () => {
    if (activeSidebarView === 'hierarchy') {
      return (
        <button
          className="sidebar-action-btn"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            openCreateObjectMenu(rect.left, rect.bottom);
          }}
          title={msg('hierarchy.addObject')}
        >
          <IconPlus className="sidebar-action-icon" />
        </button>
      );
    }
    if (activeSidebarView === 'scene') {
      return (
        <button
          className="sidebar-action-btn"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            useScenesStore.getState().createScene();
          }}
          title={msg('scene.createNew')}
        >
          <IconPlus className="sidebar-action-icon" />
        </button>
      );
    }
    return null;
  };

  // 若当前视图是 dock 面板，标题栏可拖回底部
  const handleTitleDragStart = useCallback(
    (e) => {
      if (!DOCK_PANELS[activeSidebarView]) return;
      e.dataTransfer.setData(DRAG_MIME, activeSidebarView);
      e.dataTransfer.effectAllowed = 'move';
    },
    [activeSidebarView]
  );

  const handleTitleDrop = useCallback(
    (e) => {
      const id = e.dataTransfer.getData(DRAG_MIME);
      if (!id || !DOCK_PANELS[id]) return;
      e.preventDefault();
      movePanel(id, 'bottom');
    },
    [movePanel]
  );

  return (
    <div className="sidebar">
      <ActivityBar />
      <CreateObjectMenu />
      {!sidebarCollapsed && (
        <div className="sidebar-main">
          <div
            className="sidebar-title"
            draggable={!!DOCK_PANELS[activeSidebarView]}
            onDragStart={handleTitleDragStart}
            onDragOver={(e) => e.dataTransfer.types.includes(DRAG_MIME) && e.preventDefault()}
            onDrop={handleTitleDrop}
            title={
              DOCK_PANELS[activeSidebarView] ? '拖拽此标题栏可将面板移回底部' : undefined
            }
          >
            <span className="sidebar-title-label">{def ? msg(def.titleKey) : ''}</span>
            <div className="sidebar-title-actions">{renderTitleActions()}</div>
          </div>
          <div className="sidebar-content">{Content ? <Content /> : null}</div>
        </div>
      )}
    </div>
  );
}