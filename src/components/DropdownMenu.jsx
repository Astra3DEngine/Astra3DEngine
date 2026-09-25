/**
 * @file components/DropdownMenu.jsx
 * @description 统一下拉/右键菜单组件（基于 @szhsin/react-menu）。
 *
 * 支持两种模式（与旧实现 API 一致）：
 * 1. Trigger 模式：label + items，点击按钮自动开关（Toolbar 菜单）
 * 2. 受控模式：isOpen + onClose + position({x,y}) + menuRef（右键/Add/Logo 菜单）
 *
 * @module components/DropdownMenu
 */

import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { Menu, MenuItem, MenuDivider, SubMenu, ControlledMenu } from '@szhsin/react-menu';
import '@szhsin/react-menu/dist/index.css';

/**
 * 渲染统一的菜单项内容（图标 + 标签 + 快捷键 + 复选）。
 * @param {Object} item
 * @param {Function} onClick
 * @param {boolean} includeCheck
 */
function renderItemContent(item, includeCheck = false) {
  return (
    <>
      {item.icon && <span className="dropdown-icon">{item.icon}</span>}
      <span className="dropdown-label">{item.label}</span>
      {item.shortcut && <span className="dropdown-shortcut">{item.shortcut}</span>}
      {includeCheck && item.active && <span className="dropdown-check">✓</span>}
    </>
  );
}

const DropdownMenu = forwardRef(function DropdownMenu(
  {
    label,
    items,
    children,
    className = '',
    roundedCorners = 'all',
    position = 'bottom',
    isOpen: isOpenProp,
    onClose,
  },
  ref
) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = isOpenProp !== undefined;
  const isOpen = isControlled ? isOpenProp : internalIsOpen;

  useImperativeHandle(ref, () => ({
    open: () => setInternalIsOpen(true),
    close: () => setInternalIsOpen(false),
    toggle: () => setInternalIsOpen((prev) => !prev),
  }));

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

  const menuClassName = `${getRoundedClass()} ${className}`.trim();

  const renderItems = () =>
    (items || []).map((item, index) => {
      if (item.divider) {
        return <MenuDivider key={index} />;
      }
      if (item.submenu) {
        return (
          <SubMenu
            key={index}
            label={renderItemContent(item)}
            className={item.danger ? 'danger' : ''}
          >
            {item.submenu.map((subItem, subIndex) => (
              <MenuItem
                key={subIndex}
                className={subItem.danger ? 'danger' : ''}
                disabled={subItem.disabled}
                onClick={() => !subItem.disabled && subItem.onClick?.()}
              >
                {renderItemContent(subItem, true)}
              </MenuItem>
            ))}
          </SubMenu>
        );
      }
      return (
        <MenuItem
          key={index}
          className={`${item.danger ? 'danger' : ''} ${item.active ? 'active' : ''}`.trim()}
          disabled={item.disabled}
          onClick={() => !item.disabled && item.onClick?.()}
        >
          {renderItemContent(item, true)}
        </MenuItem>
      );
    });

  const closeMenu = () => {
    if (isControlled) onClose?.();
    else setInternalIsOpen(false);
  };

  // 受控模式（无 label）：定位到屏幕坐标，portal 到 body 避免被容器/视口遮挡
  if (!label) {
    if (!isOpen) return null;
    return (
      <ControlledMenu
        state="open"
        onClose={closeMenu}
        onItemClick={closeMenu}
        anchorPoint={typeof position === 'object' && position !== null ? position : undefined}
        menuClassName={menuClassName}
        portal={{ target: document.body }}
      >
        {items ? renderItems() : children}
      </ControlledMenu>
    );
  }

  // Trigger 模式
  return (
    <Menu
      open={isOpen}
      onMenuChange={(open) => {
        if (!isControlled) setInternalIsOpen(open);
        else if (!open) onClose?.();
      }}
      onItemClick={closeMenu}
      menuButton={
        <button type="button" className="menu-btn dropdown-trigger">
          {label}
        </button>
      }
      menuClassName={menuClassName}
      position={typeof position === 'object' ? 'anchor' : 'auto'}
      direction={position === 'top' ? 'top' : 'bottom'}
      portal={{ target: document.body }}
    >
      {items ? renderItems() : children}
    </Menu>
  );
});

export default DropdownMenu;
