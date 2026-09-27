/**
 * @file components/dock/BottomPanel.jsx
 * @description 底部面板（VSCode 式，状态由 useBottomPanelStore 管理）：
 * - 顶部握条上下拖动调整高度，向下拖到底则收起（完全隐藏，不占空间）。
 * - 隐藏后不显示任何按钮；展开通过拖动底部状态栏的上端手柄完成。
 * @module components/dock/BottomPanel
 */

import React, { useRef, useCallback, useEffect } from 'react';
import { useBottomPanelStore } from '../../stores/useBottomPanelStore.js';

export default function BottomPanel({ children }) {
  const collapsed = useBottomPanelStore((s) => s.collapsed);
  const height = useBottomPanelStore((s) => s.height);
  const setHeight = useBottomPanelStore((s) => s.setHeight);
  const dragRef = useRef(null);

  const handleMove = useCallback(
    (e) => {
      const drag = dragRef.current;
      if (!drag) return;
      const delta = drag.startY - e.clientY; // 向上为正
      setHeight(drag.startHeight + delta);
    },
    [setHeight]
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('mouseup', endDrag);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleMove]);

  const startDrag = useCallback(
    (e) => {
      e.preventDefault();
      dragRef.current = { startY: e.clientY, startHeight: height };
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', endDrag);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    },
    [height, handleMove, endDrag]
  );

  useEffect(() => () => endDrag(), [endDrag]);

  if (collapsed) return null;

  return (
    <div className="bottom-panel" style={{ height: `${height}px` }}>
      <div className="dock-top-grip" onMouseDown={startDrag} />
      {children}
    </div>
  );
}
