/**
 * @file components/Modal.jsx
 * @description 统一模态框外壳（基于 react-rnd）：支持拖拽移动与缩放。
 * 所有模态框/对话框通过 lib/ModalManager.open() 统一调度，可复用一个外壳。
 * @module components/Modal
 */

import React, { useEffect } from 'react';
import { Rnd } from 'react-rnd';
import IconClose from '../icons/close.svg?react';

/** 尺寸字符串（px/vw/vh）转像素数 */
function toPx(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return value;
  const n = parseFloat(value);
  if (/vh$/.test(value)) return Math.round((window.innerHeight * n) / 100);
  if (/vw$/.test(value)) return Math.round((window.innerWidth * n) / 100);
  return Number.isNaN(n) ? null : n;
}

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
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const contentWidth = toPx(width) ?? 480;
  const contentHeight = toPx(height) ?? 360;
  const minWidth = 260;
  const minHeight = 140;
  const maxWidthPx = toPx(maxWidth) ?? window.innerWidth;
  const maxHeightPx = toPx(maxHeight) ?? window.innerHeight;

  const w = Math.min(contentWidth, maxWidthPx);
  const h = Math.min(contentHeight, maxHeightPx);
  const x = Math.max(0, Math.round((window.innerWidth - w) / 2));
  const y = Math.max(0, Math.round((window.innerHeight - h) / 3));

  return (
    <div
      className={`modal-overlay ${overlayClassName}`}
      onClick={closeOnOverlayClick ? onClose : undefined}
      ref={modalRef}
    >
      <Rnd
        className={`modal-content ${className}`}
        default={{ x, y, width: w, height: h }}
        minWidth={minWidth}
        minHeight={minHeight}
        maxWidth={maxWidthPx}
        maxHeight={maxHeightPx}
        bounds="parent"
        dragHandleClassName="modal-header"
        cancel=".modal-close-btn"
        enableResizing
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
        <div className={`modal-body ${bodyClassName}`}>{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </Rnd>
    </div>
  );
}
