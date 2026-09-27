/**
 * @file components/sidebar/ActivityBar.jsx
 * @description VSCode 式活动栏：显示所有停靠在左侧(zone=left)的面板，点击切换、再点折叠。
 * - 图标可拖拽到底部 Dock（左→底）
 * - 同时作为任意 dock 面板「拖到左侧」的 drop 目标（底→左）
 * @module components/sidebar/ActivityBar
 */

import React, { useCallback } from 'react';
import { useUIStore } from '../../stores/useUIStore.js';
import { useDockStore } from '../../stores/useDockStore.js';
import { PANEL_META } from '../panels/panelMeta.js';
import { msg } from '../../i18n/index.js';
import { tip } from '../../lib/tooltip.js';

const DRAG_MIME = 'application/astra-dock-tab';

export default function ActivityBar() {
  const activeSidebarView = useUIStore((s) => s.activeSidebarView);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const setActiveSidebarView = useUIStore((s) => s.setActiveSidebarView);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const dockPanels = useDockStore((s) => s.panels);
  const movePanel = useDockStore((s) => s.movePanel);

  // 左侧当前停靠的面板
  const entries = Object.keys(dockPanels)
    .filter((id) => dockPanels[id].zone === 'left' && PANEL_META[id]?.icon)
    .map((id) => ({ id, ...PANEL_META[id] }));

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

  // 图标可拖到底部（左→底）
  const handleDragStart = useCallback((e, id) => {
    e.dataTransfer.setData(DRAG_MIME, id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  // 接收从底部拖来的 tab（底→左）
  const handleDragOver = useCallback((e) => {
    if (e.dataTransfer.types.includes(DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  }, []);

  const handleDrop = useCallback(
    (e) => {
      const id = e.dataTransfer.getData(DRAG_MIME);
      if (!id || !PANEL_META[id]) return;
      e.preventDefault();
      movePanel(id, 'left');
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
            draggable
            className={`activity-bar-item ${active ? 'active' : ''}`}
            onClick={() => handleClick(view.id)}
            onDragStart={(e) => handleDragStart(e, view.id)}
            {...tip(view.titleKey ? msg(view.titleKey) : view.id)}
          >
            <Icon className="activity-bar-icon" />
          </button>
        );
      })}
    </div>
  );
}