/**
 * 和提示窗口差不多。
 * @file hooks/useToast.jsx
 * @description Toast 弹窗管理 Hook，提供 success/error/warning/info 四种类型
 * @module hooks/useToast
 */

import React, { useState, useCallback, createContext, useContext } from 'react';
import { ToastContainer } from '../components/Toast.jsx';

const ToastContext = createContext(null);

/**
 * Toast Provider 组件
 * @param {Object} props - 组件属性
 * @param {React.ReactNode} props.children - 子组件
 * @returns {JSX.Element} Provider 组件
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  /**
   * 显示 Toast 弹窗
   * @param {string} message - 消息内容
   * @param {string} type - 类型：'success' | 'error' | 'warning' | 'info'
   * @param {number} duration - 显示时长（毫秒）
   * @returns {number} Toast ID
   */
  const show = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  /**
   * 显示成功 Toast
   * @param {string} message - 消息内容
   * @param {number} duration - 显示时长（毫秒），默认 3000
   * @returns {number} Toast ID
   */
  const success = useCallback((message, duration = 3000) => {
    return show(message, 'success', duration);
  }, [show]);

  /**
   * 显示错误 Toast
   * @param {string} message - 消息内容
   * @param {number} duration - 显示时长（毫秒），默认 4000
   * @returns {number} Toast ID
   */
  const error = useCallback((message, duration = 4000) => {
    return show(message, 'error', duration);
  }, [show]);

  /**
   * 显示警告 Toast
   * @param {string} message - 消息内容
   * @param {number} duration - 显示时长（毫秒），默认 3500
   * @returns {number} Toast ID
   */
  const warning = useCallback((message, duration = 3500) => {
    return show(message, 'warning', duration);
  }, [show]);

  /**
   * 显示信息 Toast
   * @param {string} message - 消息内容
   * @param {number} duration - 显示时长（毫秒），默认 3000
   * @returns {number} Toast ID
   */
  const info = useCallback((message, duration = 3000) => {
    return show(message, 'info', duration);
  }, [show]);

  /**
   * 关闭指定 Toast
   * @param {number} id - Toast ID
   */
  const close = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  /**
   * 关闭所有 Toast
   */
  const closeAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ show, success, error, warning, info, close, closeAll }}>
      {children}
      <ToastContainer toasts={toasts} onClose={close} />
    </ToastContext.Provider>
  );
}

/**
 * 使用 Toast Hook
 * @returns {Object} Toast 方法
 * @property {Function} show - 显示自定义类型 Toast
 * @property {Function} success - 显示成功 Toast
 * @property {Function} error - 显示错误 Toast
 * @property {Function} warning - 显示警告 Toast
 * @property {Function} info - 显示信息 Toast
 * @property {Function} close - 关闭指定 Toast
 * @property {Function} closeAll - 关闭所有 Toast
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}