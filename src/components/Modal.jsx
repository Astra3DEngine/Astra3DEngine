/**
 * @file components/Modal.jsx
 * @description 统一模态框渲染组件，提供一致的 overlay、header、body、footer 外壳。
 * 所有模态框内容组件都应使用此组件包裹，以确保样式一致。
 * @module components/Modal
 *
 * 提供 API：
 * - isOpen / onClose：开关控制
 * - title：标题（可选，不传则不渲染 header）
 * - children：body 内容
 * - footer：footer 内容（可选）
 * - width / height / maxWidth / maxHeight：尺寸控制
 * - className / bodyClassName / overlayClassName：额外类名
 * - closeButton：是否显示关闭按钮（默认 true）
 * - closeOnOverlayClick：点击 overlay 是否关闭（默认 true）
 * - closeOnEscape：按 Escape 是否关闭（默认 true）
 * - modalRef：ref 绑定
 */

import React, { useEffect } from 'react';
import IconClose from '../icons/close.svg?react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width,
  height,
  maxWidth = '90vw',
  maxHeight = '85vh',
  className = '',
  bodyClassName = '',
  overlayClassName = '',
  closeButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  modalRef,
  ...props
}) {
  if (!isOpen) return null;

  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  const contentStyle = {};
  if (width !== undefined) contentStyle.width = typeof width === 'number' ? `${width}px` : width;
  if (height !== undefined) contentStyle.height = typeof height === 'number' ? `${height}px` : height;
  if (maxWidth !== undefined) contentStyle.maxWidth = typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;
  if (maxHeight !== undefined) contentStyle.maxHeight = typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight;

  return (
    <div
      className={`modal-overlay ${overlayClassName}`}
      onClick={closeOnOverlayClick ? onClose : undefined}
      ref={modalRef}
    >
      <div
        className={`modal-content ${className}`}
        style={contentStyle}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {title && (
          <div className="modal-header">
            <h2>{title}</h2>
            {closeButton && (
              <button className="modal-close-btn" onClick={onClose}>
                <IconClose className="modal-close-icon" />
              </button>
            )}
          </div>
        )}
        <div className={`modal-body ${bodyClassName}`}>
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
