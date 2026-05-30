/**
 * @file components/Toast.jsx
 * @description Toast 通知组件，显示临时提示消息
 * @module components/Toast
 * 
 * - 显示成功、错误、警告、信息类型的通知
 * - 自动倒计时进度条
 * - 支持手动关闭
 * - 以及多个 Toast
 */

import React, { useState, useEffect } from 'react';
import IconClose from '../icons/close.svg?react';

/**
 * Toast 通知组件
 * @param {Object} props - 组件属性
 * @param {number} props.id - Toast ID
 * @param {string} props.message - 消息内容
 * @param {string} props.type - 类型（success/error/warning/info）
 * @param {number} props.duration - 显示时长（毫秒）
 * @param {Function} props.onClose - 关闭回调
 * @returns {JSX.Element} Toast 组件
 */
function Toast({ id, message, type = 'info', duration = 3000, onClose }) {
  const [progress, setProgress] = useState(100);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
        handleClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, id]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onClose(id), 200);
  };

  const typeClass = {
    success: 'toast-success',
    error: 'toast-error',
    warning: 'toast-warning',
    info: 'toast-info'
  }[type];

  return (
    <div className={`toast ${typeClass} ${isLeaving ? 'toast-leaving' : ''}`}>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={handleClose}>
        <IconClose className="toast-close-icon" />
      </button>
      <div className="toast-progress" style={{ width: `${progress}%` }} />
    </div>
  );
}

/**
 * Toast 容器组件
 * @param {Object} props - 组件属性
 * @param {Array} props.toasts - Toast 列表
 * @param {Function} props.onClose - 关闭回调
 * @returns {JSX.Element} Toast 容器组件
 */
export function ToastContainer({ toasts, onClose }) {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={onClose}
        />
      ))}
    </div>
  );
}

export default Toast;
