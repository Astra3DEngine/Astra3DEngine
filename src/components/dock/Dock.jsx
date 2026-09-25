/**
 * @file components/dock/Dock.jsx
 * @description 底部可停靠面板：横向 Tab 条 + 当前面板内容。
 * - Tab 可拖拽到侧栏（ActivityBar 接收）实现「拖出」
 * - 侧栏面板标题也可拖回 Dock（拖入）
 * @module components/dock/Dock
 */

import React, { useCallback } from 'react';
import { useDockStore } from '../../stores/useDockStore.js';
import { PANEL_META } from '../panels/panelMeta.js';
import { msg } from '../../i18n/index.js';
import { tip } from '../../lib/tooltip.js';
import { useBottomPanelStore } from '../../stores/useBottomPanelStore.js';

const DRAG_MIME = 'application/astra-dock-tab';

export default function Dock() {
  const panels = useDockStore((s) => s.panels);
  const activeBottomTab = useDockStore((s) => s.activeBottomTab);
  const setActiveBottomTab = useDockStore((s) => s.setActiveBottomTab);
  const movePanel = useDockStore((s) => s.movePanel);
  const collapseBottom = useBottomPanelStore((s) => s.collapse);

  const handleCollapseClick = useCallback(() => collapseBottom(), [collapseBottom]);

  const bottomPanels = Object.entries(panels)
    .filter(([, p]) => p.zone === 'bottom')
    .map(([id]) => id);

  const activeId = bottomPanels.includes(activeBottomTab) ? activeBottomTab : bottomPanels[0];
  const Active = activeId ? PANEL_META[activeId]?.Component : null;

  // 接收从侧栏拖回的 tab
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
      movePanel(id, 'bottom');
      setActiveBottomTab(id);
    },
    [movePanel, setActiveBottomTab]
  );

  const handleTabDragStart = useCallback((e, id) => {
    e.dataTransfer.setData(DRAG_MIME, id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  return (
    <div className="dock" onDragOver={handleDragOver} onDrop={handleDrop}>
      <div className="dock-tabs">
        {bottomPanels.map((id) => {
          const def = PANEL_META[id];
          if (!def) return null;
          const Icon = def.icon;
          return (
            <button
              key={id}
              draggable
              className={`dock-tab ${activeId === id ? 'active' : ''}`}
              onClick={() => setActiveBottomTab(id)}
              onDragStart={(e) => handleTabDragStart(e, id)}
              {...tip(msg(def.titleKey))}
            >
              <Icon className="dock-tab-icon" />
              <span>{msg(def.titleKey)}</span>
            </button>
          );
        })}
        {collapseBottom && (
          <button className="dock-collapse-btn" onClick={handleCollapseClick} {...tip('收起底栏')}>
            ×
          </button>
        )}
      </div>
      <div className="dock-content">{Active ? <Active /> : null}</div>
    </div>
  );
}
