/**
 * @file components/ResizablePanel.jsx
 * @description 可拖拽调整宽度/高度的面板包装组件
 * @module components/ResizablePanel
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

/**
 * 可拖拽调整宽度/高度的面板组件
 * 
 * 这个组件包装一个面板，在面板边缘添加一个可拖拽的调整条。
 * 用户可以通过拖拽调整条来改变面板的宽度或高度。
 * 
 * 使用方法：
 * 水平调整宽度：
 * <ResizablePanel 
 *   direction="horizontal"
 *   side="left" 
 *   minWidth={200} 
 *   maxWidth={500} 
 *   defaultWidth={280}
 * >
 *   <HierarchyPanel ... />
 * </ResizablePanel>
 * 
 * 垂直调整高度：
 * <ResizablePanel 
 *   direction="vertical"
 *   minHeight={100} 
 *   maxHeight={400} 
 *   defaultHeight={150}
 * >
 *   <AssetsPanel ... />
 * </ResizablePanel>
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.direction - 调整方向：'horizontal' 或 'vertical'
 * @param {string} props.side - 调整条位置：'left' 或 'right'（水平方向）
 * @param {number} props.minWidth - 最小宽度（水平方向）
 * @param {number} props.maxWidth - 最大宽度（水平方向）
 * @param {number} props.defaultWidth - 默认宽度（水平方向）
 * @param {number} props.minHeight - 最小高度（垂直方向）
 * @param {number} props.maxHeight - 最大高度（垂直方向）
 * @param {number} props.defaultHeight - 默认高度（垂直方向）
 * @param {string} props.className - 颮外的CSS类名
 * @param {Function} props.onWidthChange - 宽度变化回调
 * @param {Function} props.onHeightChange - 高度变化回调
 * @param {React.ReactNode} props.children - 子组件
 * @returns {JSX.Element} 可调整尺寸的面板组件
 */
function ResizablePanel({
  direction = 'horizontal',
  side = 'right',
  minWidth = 200,
  maxWidth = 600,
  defaultWidth = 280,
  minHeight = 100,
  maxHeight = 400,
  defaultHeight = 150,
  className = '',
  collapsed = false,
  onWidthChange,
  onHeightChange,
  children
}) {
  const [width, setWidth] = useState(defaultWidth);
  const [height, setHeight] = useState(defaultHeight);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startWidthRef = useRef(0);
  const startHeightRef = useRef(0);

  /**
   * 开始拖拽
   */
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    startWidthRef.current = width;
    startHeightRef.current = height;
  }, [width, height]);

  /**
   * 拖拽过程中更新尺寸
   */
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    if (direction === 'horizontal') {
      const delta = e.clientX - startXRef.current;
      let newWidth;
      
      if (side === 'left') {
        newWidth = startWidthRef.current + delta;
      } else {
        newWidth = startWidthRef.current - delta;
      }
      
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(newWidth);
      
      if (onWidthChange) {
        onWidthChange(newWidth);
      }
    } else {
      const delta = e.clientY - startYRef.current;
      let newHeight = startHeightRef.current - delta;
      
      newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
      setHeight(newHeight);
      
      if (onHeightChange) {
        onHeightChange(newHeight);
      }
    }
  }, [isDragging, direction, side, minWidth, maxWidth, minHeight, maxHeight, onWidthChange, onHeightChange]);

  /**
   * 结束拖拽
   */
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  /**
   * 全局鼠标事件监听
   */
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = direction === 'horizontal' ? 'ew-resize' : 'ns-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp, direction]);

  const isCollapsed = className.includes('all-collapsed') || collapsed;

  const style = direction === 'horizontal' 
    ? { width: `${width}px` }
    : { height: `${height}px` };

  const resizeHandleClass = direction === 'horizontal'
    ? (side === 'left' ? 'resize-handle resize-handle-right' : 'resize-handle resize-handle-left')
    : 'resize-handle resize-handle-top';

  return (
    <div 
      ref={panelRef}
      className={`resizable-panel ${className}`}
      style={isCollapsed ? {} : style}
    >
      {children}
      {!isCollapsed && (
        <div 
          className={resizeHandleClass}
          onMouseDown={handleMouseDown}
        />
      )}
    </div>
  );
}

export default ResizablePanel;