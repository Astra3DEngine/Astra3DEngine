/**
 * @file hooks/useModalManager.jsx
 * @description 全局模态框调度 API（管理器层）。支持以 Promise 方式打开任意 React 组件作为模态框。
 * 与 useModal.js + Modal.jsx 组成完整的 Modal 系统：
 * - useModal.js：单个模态框状态管理（类似 useDropdownMenu）
 * - Modal.jsx：统一渲染外壳（类似 DropdownMenu）
 * - useModalManager：全局调度层，支持跨组件以 Promise 方式打开模态框
 * @module hooks/useModalManager
 *
 * 用法示例：
 *   const modalManager = useModalManager();
 *   const result = await modalManager.open(FileBrowserDialog, { mode: 'save' });
 *   if (result) { ... }
 */

import React, { useState, useCallback, createContext, useContext, useRef } from 'react';

const ModalManagerContext = createContext(null);

/**
 * 模态框管理器 Provider 组件
 * @param {Object} props - 组件属性
 * @param {React.ReactNode} props.children - 子组件
 * @returns {JSX.Element} Provider 组件
 */
export function ModalManagerProvider({ children }) {
  const [modalStack, setModalStack] = useState([]);
  const pendingRef = useRef(new Map());

  /**
   * 打开一个模态框组件
   * @param {React.ComponentType} Component - 模态框组件
   * @param {Object} props - 传递给模态框的 props（不包含 isOpen / onClose）
   * @returns {Promise<any>} 模态框关闭时 resolve 的结果
   */
  const open = useCallback((Component, props = {}) => {
    const id = Date.now() + Math.random();
    return new Promise((resolve) => {
      const close = (result) => {
        if (!pendingRef.current.has(id)) return;
        pendingRef.current.delete(id);
        setModalStack(prev => prev.filter(m => m.id !== id));
        resolve(result);
      };
      pendingRef.current.set(id, { close });
      setModalStack(prev => [...prev, { id, Component, props, close }]);
    });
  }, []);

  /**
   * 关闭所有模态框，所有 pending 的 Promise resolve 为 null
   */
  const closeAll = useCallback(() => {
    const pending = Array.from(pendingRef.current.values());
    pendingRef.current.clear();
    setModalStack([]);
    pending.forEach(({ close }) => close(null));
  }, []);

  return (
    <ModalManagerContext.Provider value={{ open, closeAll }}>
      {children}
      {modalStack.map(({ id, Component, props, close }) => (
        <Component key={id} {...props} isOpen={true} onClose={close} />
      ))}
    </ModalManagerContext.Provider>
  );
}

/**
 * 使用模态框管理器 Hook
 * @returns {Object} 模态框调度方法
 * @property {Function} open - 打开一个模态框组件
 * @property {Function} closeAll - 关闭所有模态框
 */
export function useModalManager() {
  const context = useContext(ModalManagerContext);
  if (!context) {
    throw new Error('useModalManager must be used within a ModalManagerProvider');
  }
  return context;
}
