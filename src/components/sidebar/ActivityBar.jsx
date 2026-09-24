/**
 * @file components/sidebar/ActivityBar.jsx
 * @description VSCode 式活动栏：垂直图标列，点击切换侧栏面板，再点当前项折叠侧栏。
 * 图标来源：固定视图（层级/场景/预制件）+ 停靠在侧栏的 dock 面板（资源/终端）。
 * 同时作为 dock 面板「拖出」到侧栏的 drop 目标。
 * @module components/sidebar/ActivityBar
 */

import React, { useCallback } from 'react';
import { useUIStore } from '../../stores/useUIStore.js';
import { useDockStore } from '../../stores/useDockStore.js';
import { SIDEBAR_VIEWS } from './sidebarViews.js';
import { DOCK_PANELS } from '../dock/dockPanels.js';
import { msg } from '../../i18n/index.js';

const DRAG_MIME = 'application/astra-dock-tab';

export default function ActivityBar() {
  const activeSidebarView = useUIStore((s) => s.activeSidebarView);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const setActiveSidebarView = useUIStore((s) => s.setActiveSidebarView);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const dockPanels = useDockStore((s) => s.panels);
  const movePanel = useDockStore((s) => s.movePanel);

  // 固定视图 + 侧栏区 dock 面板
  const entries = [
    ...Object.values(SIDEBAR_VIEWS),
    ...Object.entries(dockPanels)
      .filter(([, p]) => p.zone === 'sidebar')
      .map(([id]) => ({ id, icon: DOCK_PANELS[id]?.icon, titleKey: DOCK_PANELS[id]?.titleKey })),
  ].filter((v) => v.icon);

  const handleClick = useCallback(
    (id) => {
      if (!sidebarCollapsed && activeSidebarView === id) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
        setActiveSidebarView(id);
      }
    },
    [activeSidebarView, sidebarCollapsed, setActiveSidebarView, setSidebarCollapsed]
  );

  const handleDragOver = useCallback((e) => {
    if (e.dataTransfer.types.includes(DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  }, []);

  const handleDrop = useCallback(
    (e) => {
      const id = e.dataTransfer.getData(DRAG_MIME);
      if (!id || !DOCK_PANELS[id]) return;
      e.preventDefault();
      movePanel(id, 'sidebar');
      setSidebarCollapsed(false);
      setActiveSidebarView(id);
    },
    [movePanel, setSidebarCollapsed, setActiveSidebarView]
  );

  return (
    <div className="activity-bar" onDragOver={handleDragOver} onDrop={handleDrop}>
      {entries.map((view) => {
        const Icon = view.icon;
        const active = !sidebarCollapsed && activeSidebarView === view.id;
        return (
          <button
            key={view.id}
            className={`activity-bar-item ${active ? 'active' : ''}`}
            onClick={() => handleClick(view.id)}
            title={view.titleKey ? msg(view.titleKey) : view.id}
          >
            <Icon className="activity-bar-icon" />
          </button>
        );
      })}
    </div>
  );
}
