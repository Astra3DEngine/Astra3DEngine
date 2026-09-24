/**
 * @file components/sidebar/Sidebar.jsx
 * @description VSCode 式侧栏：活动栏（图标列）+ 单面板内容。
 * 面板来源：固定视图（层级/场景/预制件）或停靠在侧栏的 dock 面板（资源/终端）。
 * 面板标题栏可拖回底部 Dock（拖入）。
 * @module components/sidebar/Sidebar
 */

import React, { useCallback } from 'react';
import { useUIStore } from '../../stores/useUIStore.js';
import { useDockStore } from '../../stores/useDockStore.js';
import { SIDEBAR_VIEWS } from './sidebarViews.js';
import { DOCK_PANELS } from '../dock/dockPanels.js';
import { msg } from '../../i18n/index.js';
import ActivityBar from './ActivityBar.jsx';

const DRAG_MIME = 'application/astra-dock-tab';

export default function Sidebar() {
  const activeSidebarView = useUIStore((s) => s.activeSidebarView);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
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
      {!sidebarCollapsed && (
        <div className="sidebar-main">
          <div
            className="sidebar-title"
            draggable={!!DOCK_PANELS[activeSidebarView]}
            onDragStart={handleTitleDragStart}
            onDragOver={(e) => e.dataTransfer.types.includes(DRAG_MIME) && e.preventDefault()}
            onDrop={handleTitleDrop}
            title={DOCK_PANELS[activeSidebarView] ? '拖拽此标题栏可将面板移回底部' : undefined}
          >
            <span>{def ? msg(def.titleKey) : ''}</span>
            <button
              className="sidebar-collapse-btn"
              onClick={() => setSidebarCollapsed(true)}
              title="收起侧栏"
            >
              ×
            </button>
          </div>
          <div className="sidebar-content">{Content ? <Content /> : null}</div>
        </div>
      )}
    </div>
  );
}
