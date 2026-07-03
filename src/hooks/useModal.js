/**
 * @file hooks/useModal.js
 * @description 单个模态框状态管理 Hook，类似于 useDropdownMenu。
 * 提供 open / close / toggle 和 ref 管理，不与全局调度层耦合。
 * @module hooks/useModal
 */

import { useState, useRef, useCallback } from 'react';

/**
 * 单个模态框状态管理 Hook
 * @param {Object} options - 配置选项
 * @param {Function} options.onOpen - 打开时的回调
 * @param {Function} options.onClose - 关闭时的回调
 * @returns {Object} 模态框状态和控制方法
 * @property {boolean} isOpen - 当前开关状态
 * @property {Function} open - 打开模态框
 * @property {Function} close - 关闭模态框
 * @property {Function} toggle - 切换模态框开关
 * @property {React.RefObject} modalRef - 模态框 DOM 引用
 */
export function useModal(options = {}) {
  const { onOpen, onClose } = options;
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef(null);

  const open = useCallback(() => {
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
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

  return {
    isOpen,
    open,
    close,
    toggle,
    modalRef
  };
}

export default useModal;
