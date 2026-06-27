/**
 * @file components/DropdownMenu.jsx
 * @description 统一的下拉菜单/右键菜单渲染组件
 * @module components/DropdownMenu
 *
 * 支持两种模式：
 * 1. Trigger 模式：传入 label + items，点击按钮自动管理开关（Toolbar 菜单）
 * 2. 受控模式：传入 isOpen + onClose + position（对象）+ menuRef + children，
 *    由外部 useDropdownMenu 控制开关和位置（右键菜单、Add 菜单、Logo 菜单）
 *
 * 统一的紧凑样式，保留 roundedCorners 角设置 API。
 * 
 * 现在我更喜欢这个了！
 */

import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

/**
 * 下拉菜单组件
 * @param {Object} props
 * @param {string} [props.label] - 菜单按钮标签（Trigger 模式）
 * @param {Array} [props.items] - 菜单项列表（Trigger 模式）
 * @param {React.ReactNode} [props.children] - 自定义菜单内容（受控模式）
 * @param {string} [props.className] - 自定义类名
 * @param {string|Object} [props.roundedCorners='all'] - 圆角配置
 * @param {string|Object} [props.position='bottom'] - 菜单位置（字符串：top/bottom 等；对象：{x,y} 像素坐标）
 * @param {boolean} [props.isOpen] - 受控模式：是否打开
 * @param {Function} [props.onClose] - 受控模式：关闭回调
 * @param {React.RefObject} [props.menuRef] - 受控模式：外部 ref
 * @param {Object} ref - 组件引用（Trigger 模式提供 open/close/toggle 方法）
 */
const DropdownMenu = forwardRef(function DropdownMenu({
  label,
  items,
  children,
  className = '',
  roundedCorners = 'all',
  position = 'bottom',
  isOpen: isOpenProp,
  onClose,
  menuRef: externalMenuRef
}, ref) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const isControlled = isOpenProp !== undefined;
  const isOpen = isControlled ? isOpenProp : internalIsOpen;

  const menuRef = useRef(null);
  const resolvedMenuRef = externalMenuRef || menuRef;
  const triggerRef = useRef(null);
  const submenuTimeoutRef = useRef(null);

  useImperativeHandle(ref, () => ({
    open: () => setInternalIsOpen(true),
    close: () => setInternalIsOpen(false),
    toggle: () => setInternalIsOpen(prev => !prev)
  }));

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (resolvedMenuRef.current?.contains(event.target)) return;
      if (triggerRef.current?.contains(event.target)) return;

      if (isControlled) {
        onClose?.();
      } else {
        setInternalIsOpen(false);
        setActiveSubmenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isControlled, onClose, resolvedMenuRef]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (isControlled) {
          onClose?.();
        } else {
          setInternalIsOpen(false);
          setActiveSubmenu(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isControlled, onClose]);

  const handleItemClick = (item) => {
    if (item.submenu) return;
    if (item.onClick) item.onClick();

    if (!isControlled) {
      setInternalIsOpen(false);
      setActiveSubmenu(null);
    } else {
      onClose?.();
    }
  };

  const handleSubmenuEnter = (index) => {
    if (submenuTimeoutRef.current) clearTimeout(submenuTimeoutRef.current);
    setActiveSubmenu(index);
  };

  const handleSubmenuLeave = () => {
    submenuTimeoutRef.current = setTimeout(() => setActiveSubmenu(null), 100);
  };

  const getRoundedClass = () => {
    if (typeof roundedCorners === 'string') {
      return `dropdown-rounded-${roundedCorners}`;
    }
    const classes = [];
    if (roundedCorners.topLeft) classes.push('dropdown-rounded-tl');
    if (roundedCorners.topRight) classes.push('dropdown-rounded-tr');
    if (roundedCorners.bottomLeft) classes.push('dropdown-rounded-bl');
    if (roundedCorners.bottomRight) classes.push('dropdown-rounded-br');
    return classes.join(' ');
  };

  const positionClass = (typeof position === 'string' && position === 'top') ? 'dropdown-position-top' : '';

  let positionStyle;
  if (typeof position === 'object' && position !== null && 'x' in position) {
    positionStyle = {
      position: 'fixed',
      left: position.x,
      top: position.y,
      zIndex: 1000
    };
  }

  const handleTriggerClick = () => {
    if (!isControlled) setInternalIsOpen(prev => !prev);
  };

  const renderContent = () => {
    if (items) {
      return items.map((item, index) => (
        <React.Fragment key={index}>
          {item.divider ? (
            <div className="dropdown-divider" />
          ) : (
            <div
              className="dropdown-item-wrapper"
              onMouseEnter={() => item.submenu && handleSubmenuEnter(index)}
              onMouseLeave={() => item.submenu && handleSubmenuLeave()}
            >
              <button
                className={`dropdown-item ${item.disabled ? 'disabled' : ''} ${item.danger ? 'danger' : ''} ${item.submenu ? 'has-submenu' : ''}`}
                onClick={() => !item.disabled && handleItemClick(item)}
                disabled={item.disabled}
              >
                {item.icon && <span className="dropdown-icon">{item.icon}</span>}
                <span className="dropdown-label">{item.label}</span>
                {item.shortcut && <span className="dropdown-shortcut">{item.shortcut}</span>}
                {item.submenu && <span className="dropdown-submenu-arrow">▶</span>}
              </button>
              {item.submenu && activeSubmenu === index && (
                <div className="dropdown-submenu">
                  {item.submenu.map((subItem, subIndex) => (
                    <button
                      key={subIndex}
                      className={`dropdown-item ${subItem.disabled ? 'disabled' : ''} ${subItem.danger ? 'danger' : ''} ${subItem.active ? 'active' : ''}`}
                      onClick={() => {
                        if (!subItem.disabled && subItem.onClick) {
                          subItem.onClick();
                          if (!isControlled) {
                            setInternalIsOpen(false);
                            setActiveSubmenu(null);
                          } else {
                            onClose?.();
                          }
                        }
                      }}
                      disabled={subItem.disabled}
                    >
                      {subItem.icon && <span className="dropdown-icon">{subItem.icon}</span>}
                      <span className="dropdown-label">{subItem.label}</span>
                      {subItem.active && <span className="dropdown-check">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </React.Fragment>
      ));
    }
    return children;
  };

  // 受控模式且无 label：不渲染 dropdown-menu 容器，只渲染内容（position: fixed）
  if (!label && !isOpen) return null;

  if (!label) {
    return (
      <div
        ref={resolvedMenuRef}
        className={`dropdown-content ${getRoundedClass()} ${className}`}
        style={positionStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {renderContent()}
      </div>
    );
  }

  return (
    <div className={`dropdown-menu ${className}`} ref={resolvedMenuRef}>
      <button
        className="menu-btn dropdown-trigger"
        ref={triggerRef}
        onClick={handleTriggerClick}
      >
        {label}
      </button>
      {isOpen && (
        <div className={`dropdown-content ${getRoundedClass()} ${positionClass}`} onClick={(e) => e.stopPropagation()}>
          {renderContent()}
        </div>
      )}
    </div>
  );
});

export default DropdownMenu;
