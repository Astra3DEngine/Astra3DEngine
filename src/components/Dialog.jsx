/**
 * @file components/Dialog.jsx
 * @description 对话框组件（警告/确认/输入），统一复用 Modal 外壳。
 * @module components/Dialog
 */

import React, { useState } from 'react';
import { msg } from '../i18n/index.js';
import Modal from './Modal.jsx';

/**
 * 警告对话框
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {string} props.title
 * @param {string} props.message
 * @param {Function} props.onClose
 */
export function AlertDialog({ isOpen, title, message, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} width={400}>
      <p className="dialog-message">{message}</p>
      <div className="modal-footer">
        <button className="btn btn-primary" onClick={onClose}>
          {msg('dialog.ok')}
        </button>
      </div>
    </Modal>
  );
}

/**
 * 确认对话框
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {string} props.title
 * @param {string} props.message
 * @param {string} props.confirmText
 * @param {string} props.cancelText
 * @param {Function} props.onConfirm
 * @param {Function} props.onCancel
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} width={400}>
      <p className="dialog-message">{message}</p>
      <div className="modal-footer">
        <button className="btn" onClick={onCancel}>
          {cancelText || msg('dialog.cancel')}
        </button>
        <button className="btn btn-primary" onClick={onConfirm}>
          {confirmText || msg('dialog.confirm')}
        </button>
      </div>
    </Modal>
  );
}

/**
 * 输入对话框
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {string} props.title
 * @param {string} props.message
 * @param {string} props.defaultValue
 * @param {string} props.placeholder
 * @param {Function} props.onConfirm
 * @param {Function} props.onCancel
 */
export function PromptDialog({
  isOpen,
  title,
  message,
  defaultValue,
  placeholder,
  onConfirm,
  onCancel,
}) {
  const [value, setValue] = useState(defaultValue || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(value);
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} width={400} closeOnOverlayClick={false}>
      <form onSubmit={handleSubmit}>
        <p className="dialog-message">{message}</p>
        <input
          type="text"
          className="dialog-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoFocus
        />
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onCancel}>
            {msg('dialog.cancel')}
          </button>
          <button type="submit" className="btn btn-primary">
            {msg('dialog.ok')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
