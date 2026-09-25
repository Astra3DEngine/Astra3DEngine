/**
 * @file components/sidebar/Sidebar.jsx
 * @description VSCode 式侧栏：活动栏（图标列）+ 单面板内容。
 * - 左侧显示所有停靠 zone=left 的面板（层级/场景/预制件/资源/终端）
 * - CreateObjectMenu 宿主常驻（Alt+Q 可用）
 * - 任意面板标题栏可拖回底部 Dock
 * @module components/sidebar/Sidebar
 */

import React, { useCallback, useEffect } from 'react';
import { useUIStore } from '../../stores/useUIStore.js';
import { useDockStore } from '../../stores/useDockStore.js';
import { useScenesStore } from '../../stores/useScenesStore.js';
import { PANEL_META } from '../panels/panelMeta.js';
import { msg } from '../../i18n/index.js';
import { tip } from '../../lib/tooltip.js';
import ActivityBar from './ActivityBar.jsx';
import CreateObjectMenu, { openCreateObjectMenu } from './CreateObjectMenu.jsx';
import IconPlus from '../../assets/icons/editor/plus.svg?react';
import IconChevronDown from '../../assets/icons/nav/chevron-down.svg?react';

const DRAG_MIME = 'application/astra-dock-tab';

export default function Sidebar() {
  const activeSidebarView = useUIStore((s) => s.activeSidebarView);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const movePanel = useDockStore((s) => s.movePanel);
  const dockPanels = useDockStore((s) => s.panels);

  // 当当前面板被移出左侧时，自动切到左侧剩余的首个面板
  useEffect(() => {
    const unsub = useDockStore.subscribe((state) => {
      const p = state.panels[activeSidebarView];
      if (p && p.zone !== 'left') {
        const firstLeft = Object.keys(state.panels).find(
          (id) => state.panels[id].zone === 'left' && PANEL_META[id]
        );
        useUIStore.getState().setActiveSidebarView(firstLeft || 'hierarchy');
      }
    });
    return unsub;
  }, [activeSidebarView]);

  const def =
    PANEL_META[activeSidebarView]?.Component && dockPanels[activeSidebarView]?.zone === 'left'
      ? {
          titleKey: PANEL_META[activeSidebarView].titleKey,
          Component: PANEL_META[activeSidebarView].Component,
        }
      : null;
  const Content = def?.Component;

  // 标题栏右侧操作按钮（按面板分发）
  const renderTitleActions = () => {
    if (activeSidebarView === 'assets' || activeSidebarView === 'terminal') {
      // 底部面板：可靠地移回底部（且标题栏可拖回）
      return (
        <button
          className="sidebar-action-btn"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            movePanel(activeSidebarView, 'bottom');
          }}
          {...tip(msg('dock.moveBottom'))}
        >
          <IconChevronDown className="sidebar-action-icon" />
        </button>
      );
    }
    if (activeSidebarView === 'hierarchy') {
      return (
        <button
          className="sidebar-action-btn"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            openCreateObjectMenu(rect.left, rect.bottom);
          }}
          {...tip(msg('hierarchy.addObject'))}
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
          {...tip(msg('scene.createNew'))}
        >
          <IconPlus className="sidebar-action-icon" />
        </button>
      );
    }
    return null;
  };

  // 标题栏可拖回底部（任意当前面板）
  const handleTitleDragStart = useCallback(
    (e) => {
      if (!PANEL_META[activeSidebarView]) return;
      e.dataTransfer.setData(DRAG_MIME, activeSidebarView);
      e.dataTransfer.effectAllowed = 'move';
    },
    [activeSidebarView]
  );

  const handleTitleDrop = useCallback(
    (e) => {
      const id = e.dataTransfer.getData(DRAG_MIME);
      if (!id || !PANEL_META[id]) return;
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
            draggable={!!def}
            onDragStart={handleTitleDragStart}
            onDragOver={(e) => e.dataTransfer.types.includes(DRAG_MIME) && e.preventDefault()}
            onDrop={handleTitleDrop}
            {...tip(def ? '拖拽此标题栏可将面板移回底部' : undefined)}
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