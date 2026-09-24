/**
 * @file hooks/useRatioDrag.js
 * @description 面板高度占比拖拽 hook：统一场景面板 / 预制件面板的拖拽调整逻辑。
 * @module hooks/useRatioDrag
 */

import { useCallback, useEffect, useRef } from 'react';

/**
 * @param {number} ratio - 当前占比（0-1）
 * @param {Function} onRatioChange - 占比变化回调（需自行持久化）
 * @param {Object} [opts]
 * @param {number} [opts.min=0.1]
 * @param {number} [opts.max=0.4]
 * @param {boolean} [opts.inverted=false] - 反向拖拽（prefabs 面板向上拖增大）
 * @returns {{ onDragStart: (e: MouseEvent) => void }}
 */
export function useRatioDrag(
  ratio,
  onRatioChange,
  { min = 0.1, max = 0.4, inverted = false } = {}
) {
  const ratioRef = useRef(ratio);
  const dragRef = useRef(null);

  useEffect(() => {
    ratioRef.current = ratio;
  }, [ratio]);

  const handleDrag = useCallback(
    (e) => {
      const drag = dragRef.current;
      if (!drag) return;
      const delta = inverted ? drag.startY - e.clientY : e.clientY - drag.startY;
      if (drag.sidebarHeight > 0) {
        const newRatio = Math.min(Math.max(drag.startRatio + delta / drag.sidebarHeight, min), max);
        onRatioChange(newRatio);
      }
    },
    [min, max, inverted, onRatioChange]
  );

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', handleDragEnd);
  }, [handleDrag]);

  const handleDragStart = useCallback(
    (e) => {
      e.preventDefault();
      const sidebar = e.target.closest('.left-sidebar');
      dragRef.current = {
        startY: e.clientY,
        startRatio: ratioRef.current,
        sidebarHeight: sidebar?.offsetHeight || 0,
      };
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
    },
    [handleDrag, handleDragEnd]
  );

  return { onDragStart: handleDragStart };
}
