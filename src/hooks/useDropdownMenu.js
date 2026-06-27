/**
 * @file hooks/useDropdownMenu.js
 * @description 统一的下拉菜单/右键菜单状态管理 Hook
 * @module hooks/useDropdownMenu
 *
 * 纯状态管理，不做点击外部/Escape 监听——这些交互由 DropdownMenu 组件统一处理。
 * 解决项目中每个组件都重复写 useState + useRef + useEffect 的史山问题。
 */

import { useState, useRef, useCallback } from 'react';

/**
 * 统一菜单状态管理 Hook
 * @param {Object} options - 配置选项
 * @param {Function} options.onOpen - 菜单打开时的回调
 * @param {Function} options.onClose - 菜单关闭时的回调
 * @returns {Object} 菜单状态和控制方法
 */
export function useDropdownMenu(options = {}) {
  const { onOpen, onClose } = options;
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const menuRef = useRef(null);

  const open = useCallback(() => {
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    setPosition(null);
    onClose?.();
  }, [onClose]);

  const toggle = useCallback(() => {
    setIsOpen(prev => {
      const next = !prev;
      if (next) onOpen?.();
      else onClose?.();
      return next;
    });
  }, [onOpen, onClose]);

  /**
   * 在指定坐标打开菜单（用于右键菜单或手动定位）
   * @param {number} x - 屏幕 X 坐标
   * @param {number} y - 屏幕 Y 坐标
   */
  const openAt = useCallback((x, y) => {
    setPosition({ x, y });
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);

  return {
    isOpen,
    position,
    menuRef,
    open,
    close,
    toggle,
    openAt
  };
}

export default useDropdownMenu;
