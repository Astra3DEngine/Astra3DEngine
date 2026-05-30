/**
 * @file components/CollapsiblePanel.jsx
 * @description 可折叠面板组件，用于创建可展开/折叠的面板容器
 * @module components/CollapsiblePanel
 * 
 * 你不觉得折叠的面板很几把酷炫吗？
 * 反正扣式咯这辈子都学不会这个面板设计😋
 */

import React, { useState, useCallback } from 'react';
import IconChevronDown from '../icons/chevron-down.svg?react';
import IconChevronRight from '../icons/chevron-right.svg?react';

/**
 * 可折叠面板组件
 * @param {Object} props - 组件属性
 * @param {string} props.title - 面板标题
 * @param {React.ReactNode} props.children - 面板内容
 * @param {string} props.className - 自定义类名
 * @param {boolean} props.defaultCollapsed - 默认折叠状态
 * @param {React.ReactNode} props.headerRight - 标题栏右侧内容
 * @param {string} props.storageKey - localStorage 键名（用于持久化折叠状态）
 * @param {boolean} props.vertical - 是否垂直折叠
 * @param {Function} props.onCollapseChange - 折叠状态变化回调
 * @returns {JSX.Element} 可折叠面板组件
 */
function CollapsiblePanel({ 
  title, 
  children, 
  className = '', 
  defaultCollapsed = false,
  headerRight,
  storageKey,
  vertical = false,
  onCollapseChange
}) {
  const getInitialState = () => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        return saved === 'true';
      }
    }
    return defaultCollapsed;
  };

  const [collapsed, setCollapsed] = useState(getInitialState);

  const handleToggle = useCallback(() => {
    const newState = !collapsed;
    setCollapsed(newState);
    if (storageKey) {
      localStorage.setItem(storageKey, String(newState));
    }
    if (onCollapseChange) {
      onCollapseChange(newState);
    }
  }, [storageKey, onCollapseChange, collapsed]);

  if (vertical && collapsed) {
    return (
      <div 
        className={`panel collapsible-panel vertical-collapsed ${className}`}
        onClick={handleToggle}
        title={title}
      >
        <div className="panel-vertical-title">
          {title.split('').map((char, i) => (
            <span key={i}>{char}</span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`panel collapsible-panel ${className} ${collapsed ? 'collapsed' : ''}`}>
      <div className="panel-header" onClick={handleToggle}>
        <span className="panel-header-left">
          <span className="panel-collapse-icon">
            {collapsed ? <IconChevronRight className="collapse-icon" /> : <IconChevronDown className="collapse-icon" />}
          </span>
          <span className="panel-title">{title}</span>
        </span>
        {headerRight && (
          <span className="panel-header-right" onClick={(e) => e.stopPropagation()}>
            {headerRight}
          </span>
        )}
      </div>
      {!collapsed && children}
    </div>
  );
}

export default CollapsiblePanel;
