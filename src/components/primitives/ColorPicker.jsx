/**
 * @file components/primitives/ColorPicker.jsx
 * @description 轻量取色器：react-colorful 弹层 + 色板按钮。
 * 弹层通过 portal 渲染到 document.body，用视口坐标定位，
 * 避免被父容器 overflow/layout 裁剪或参与布局。
 * @module components/primitives/ColorPicker
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HexColorPicker } from 'react-colorful';

const normalizeHex = (value) => {
  if (!value) return '#ffffff';
  return value.startsWith('#') ? value : `#${value}`;
};

/**
 * @param {Object} props
 * @param {string} props.value - 当前颜色（hex）
 * @param {(color: string) => void} props.onChange - 颜色变化回调（hex）
 * @param {string} [props.className] - 附加类名
 * @param {string} [props.title] - 悬停提示
 */
function ColorPicker({ value = '#ffffff', onChange, className = '', title }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const swatchRef = useRef(null);
  const popoverRef = useRef(null);

  const color = normalizeHex(value);

  const openPopover = useCallback(() => {
    const rect = swatchRef.current?.getBoundingClientRect();
    if (!rect) return;
    const PAD = 6;
    const popW = 196; // 180 + padding
    const left = Math.min(Math.max(0, rect.left), window.innerWidth - popW);
    const top = rect.bottom + PAD;
    setPos({ left, top });
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleDocMouseDown = (e) => {
      if (swatchRef.current?.contains(e.target)) return;
      if (popoverRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleDocMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleDocMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <div className={`color-picker ${className}`}>
        <button
          ref={swatchRef}
          type="button"
          className="color-picker-swatch"
          style={{ background: color }}
          onClick={openPopover}
          title={title}
          aria-label="打开取色器"
        />
      </div>
      {open &&
        createPortal(
          <div ref={popoverRef} className="color-picker-popover" style={pos}>
            <HexColorPicker color={color} onChange={(c) => onChange?.(c)} />
          </div>,
          document.body
        )}
    </>
  );
}

export default ColorPicker;