/**
 * @file components/toolbar/WindowControls.jsx
 * @description Electron 标题栏窗口控制按钮（最小化/最大化/关闭）。
 * @module components/toolbar/WindowControls
 */

import { msg } from '../../i18n/index.js';
import { tip } from '../../lib/tooltip.js';
import IconWindowMinimize from '../../assets/icons/window/window-minimize.svg?react';
import IconWindowMaximize from '../../assets/icons/window/window-maximize.svg?react';
import IconWindowRestore from '../../assets/icons/window/window-restore.svg?react';
import IconWindowClose from '../../assets/icons/window/window-close.svg?react';

/**
 * @param {Object} props
 * @param {boolean} props.isMaximized
 * @param {Function} props.onMinimize
 * @param {Function} props.onMaximize
 * @param {Function} props.onClose
 */
function WindowControls({ isMaximized, onMinimize, onMaximize, onClose }) {
  return (
    <div className="toolbar-window-controls">
      <button
        className="window-control-btn minimize"
        onClick={onMinimize}
        {...tip(msg('window.minimize'))}
      >
        <IconWindowMinimize />
      </button>
      <button
        className="window-control-btn maximize"
        onClick={onMaximize}
        {...tip(msg(isMaximized ? 'window.restore' : 'window.maximize'))}
      >
        {isMaximized ? <IconWindowRestore /> : <IconWindowMaximize />}
      </button>
      <button className="window-control-btn close" onClick={onClose} {...tip(msg('window.close'))}>
        <IconWindowClose />
      </button>
    </div>
  );
}

export default WindowControls;
