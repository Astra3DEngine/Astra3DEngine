/**
 * @file components/Dialog.jsx
 * @description 对话框组件，提供警告、确认和输入对话框
 * @module components/Dialog
 */

import React, { useState, useCallback } from 'react';
import { msg } from '../i18n/index.js';
import IconClose from '../icons/close.svg?react';

/**
 * 警告对话框组件
 * @param {Object} props - 组件属性
 * @param {boolean} props.isOpen - 是否打开
 * @param {string} props.title - 标题
 * @param {string} props.message - 消息内容
 * @param {Function} props.onClose - 关闭回调
 * @returns {JSX.Element|null} 警告对话框组件
 */
export function AlertDialog({ isOpen, title, message, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content dialog-alert" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          {title && <h3 className="dialog-title">{title}</h3>}
          <button className="dialog-close-btn" onClick={onClose}>
            <IconClose className="dialog-close-icon" />
          </button>
        </div>
        <div className="dialog-body">
          <p className="dialog-message">{message}</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-primary" onClick={onClose}>
            {msg('dialog.ok')}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 确认对话框组件
 * @param {Object} props - 组件属性
 * @param {boolean} props.isOpen - 是否打开
 * @param {string} props.title - 标题
 * @param {string} props.message - 消息内容
 * @param {string} props.confirmText - 确认按钮文本
 * @param {string} props.cancelText - 取消按钮文本
 * @param {Function} props.onConfirm - 确认回调
 * @param {Function} props.onCancel - 取消回调
 * @returns {JSX.Element|null} 确认对话框组件
 */
export function ConfirmDialog({ isOpen, title, message, confirmText, cancelText, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-content dialog-confirm" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          {title && <h3 className="dialog-title">{title}</h3>}
          <button className="dialog-close-btn" onClick={onCancel}>
            <IconClose className="dialog-close-icon" />
          </button>
        </div>
        <div className="dialog-body">
          <p className="dialog-message">{message}</p>
        </div>
        <div className="dialog-footer">
          <button className="btn" onClick={onCancel}>
            {cancelText || msg('dialog.cancel')}
          </button>
          <button className="btn btn-primary" onClick={onConfirm}>
            {confirmText || msg('dialog.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 输入对话框组件
 * @param {Object} props - 组件属性
 * @param {boolean} props.isOpen - 是否打开
 * @param {string} props.title - 标题
 * @param {string} props.message - 消息内容
 * @param {string} props.defaultValue - 默认值
 * @param {string} props.placeholder - 占位符
 * @param {Function} props.onConfirm - 确认回调（传入输入值）
 * @param {Function} props.onCancel - 取消回调
 * @returns {JSX.Element|null} 输入对话框组件
 */
export function PromptDialog({ isOpen, title, message, defaultValue, placeholder, onConfirm, onCancel }) {
  const [value, setValue] = useState(defaultValue || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(value);
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-content dialog-prompt" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="dialog-header">
            {title && <h3 className="dialog-title">{title}</h3>}
            <button type="button" className="dialog-close-btn" onClick={onCancel}>
              <IconClose className="dialog-close-icon" />
            </button>
          </div>
          <div className="dialog-body">
            {message && <p className="dialog-message">{message}</p>}
            <input
              type="text"
              className="dialog-input"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={placeholder}
              autoFocus
            />
          </div>
          <div className="dialog-footer">
            <button type="button" className="btn" onClick={onCancel}>
              {msg('dialog.cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {msg('dialog.ok')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
