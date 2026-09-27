/**
 * @file components/primitives/RenameInput.jsx
 * @description 统一的内联重命名输入框：聚焦/全选、Enter 提交、Escape/失焦取消。
 * 此前在 HierarchyPanel / ScenePanel / AssetsPanel 中存在三份近似实现。
 * @module components/primitives/RenameInput
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * @param {Object} props
 * @param {string} props.value - 初始值
 * @param {string} props.className - 输入框类名
 * @param {(value: string) => void} props.onSubmit - 提交（非空时）
 * @param {() => void} props.onCancel - 取消
 */
function RenameInput({ value, className = '', onSubmit, onCancel }) {
  const [text, setText] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed && onSubmit) {
      onSubmit(trimmed);
    } else if (onCancel) {
      onCancel();
    }
  }, [text, onSubmit, onCancel]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        handleSubmit();
      } else if (e.key === 'Escape') {
        onCancel?.();
      }
    },
    [handleSubmit, onCancel]
  );

  return (
    <input
      ref={inputRef}
      type="text"
      className={className}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={handleSubmit}
      onKeyDown={handleKeyDown}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export default RenameInput;
