import React, { useState, useCallback } from 'react';
import IconChevronDown from '../icons/chevron-down.svg?react';
import IconChevronRight from '../icons/chevron-right.svg?react';

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
    setCollapsed(prev => {
      const newState = !prev;
      if (storageKey) {
        localStorage.setItem(storageKey, String(newState));
      }
      if (onCollapseChange) {
        onCollapseChange(newState);
      }
      return newState;
    });
  }, [storageKey, onCollapseChange]);

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
