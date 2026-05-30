/**
 * @file hooks/useDialog.jsx
 * @description 对话框管理 Hook，提供 alert/confirm/prompt 的 Promise 版本
 * @module hooks/useDialog
 */

import React, { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { AlertDialog, ConfirmDialog, PromptDialog } from '../components/Dialog.jsx';
import { msg } from '../i18n/index.js';

const DialogContext = createContext(null);

/**
 * 对话框 Provider 组件
 * @param {Object} props - 组件属性
 * @param {React.ReactNode} props.children - 子组件
 * @returns {JSX.Element} Provider 组件
 */
export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  /**
   * 显示警告对话框
   * @param {string} message - 消息内容
   * @param {string} title - 对话框标题
   * @returns {Promise<void>} 用户关闭对话框后 resolve
   */
  const alert = useCallback((message, title) => {
    return new Promise(resolve => {
      setDialog({
        type: 'alert',
        message,
        title,
        onClose: () => {
          setDialog(null);
          resolve();
        }
      });
    });
  }, []);

  /**
   * 显示确认对话框
   * @param {string} message - 消息内容
   * @param {string} title - 对话框标题
   * @param {Object} options - 选项
   * @param {string} options.confirmText - 确认按钮文本
   * @param {string} options.cancelText - 取消按钮文本
   * @returns {Promise<boolean>} 用户确认返回 true，取消返回 false
   */
  const confirm = useCallback((message, title, options = {}) => {
    return new Promise(resolve => {
      setDialog({
        type: 'confirm',
        message,
        title,
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        onConfirm: () => {
          setDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setDialog(null);
          resolve(false);
        }
      });
    });
  }, []);

  /**
   * 显示输入对话框
   * @param {string} message - 消息内容
   * @param {string} defaultValue - 默认输入值
   * @param {string} title - 对话框标题
   * @param {string} placeholder - 输入框占位符
   * @returns {Promise<string|null>} 用户确认返回输入值，取消返回 null
   */
  const prompt = useCallback((message, defaultValue = '', title, placeholder = '') => {
    return new Promise(resolve => {
      setDialog({
        type: 'prompt',
        message,
        title,
        defaultValue,
        placeholder,
        onConfirm: (value) => {
          setDialog(null);
          resolve(value);
        },
        onCancel: () => {
          setDialog(null);
          resolve(null);
        }
      });
    });
  }, []);

  useEffect(() => {
    const originalAlert = window.alert;
    const originalConfirm = window.confirm;
    const originalPrompt = window.prompt;

    window.alert = (message) => alert(message);
    window.confirm = (message) => confirm(message);
    window.prompt = (message, defaultValue) => prompt(message, defaultValue);

    return () => {
      window.alert = originalAlert;
      window.confirm = originalConfirm;
      window.prompt = originalPrompt;
    };
  }, [alert, confirm, prompt]);

  const renderDialog = () => {
    if (!dialog) return null;

    switch (dialog.type) {
      case 'alert':
        return (
          <AlertDialog
            isOpen={true}
            title={dialog.title}
            message={dialog.message}
            onClose={dialog.onClose}
          />
        );
      case 'confirm':
        return (
          <ConfirmDialog
            isOpen={true}
            title={dialog.title}
            message={dialog.message}
            confirmText={dialog.confirmText}
            cancelText={dialog.cancelText}
            onConfirm={dialog.onConfirm}
            onCancel={dialog.onCancel}
          />
        );
      case 'prompt':
        return (
          <PromptDialog
            isOpen={true}
            title={dialog.title}
            message={dialog.message}
            defaultValue={dialog.defaultValue}
            placeholder={dialog.placeholder}
            onConfirm={dialog.onConfirm}
            onCancel={dialog.onCancel}
          />
        );
      default:
        return null;
    }
  };

  return (
    <DialogContext.Provider value={{ alert, confirm, prompt }}>
      {children}
      {renderDialog()}
    </DialogContext.Provider>
  );
}

/**
 * 使用对话框 Hook
 * @returns {Object} 对话框方法
 * @property {Function} alert - 显示警告对话框
 * @property {Function} confirm - 显示确认对话框
 * @property {Function} prompt - 显示输入对话框
 */
export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}