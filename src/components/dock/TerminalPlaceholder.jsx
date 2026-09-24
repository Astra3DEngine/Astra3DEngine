/**
 * @file components/dock/TerminalPlaceholder.jsx
 * @description 调试终端占位面板：真实终端实现待接入（TODO）。
 * @module components/dock/TerminalPlaceholder
 */

import React from 'react';
import { msg } from '../../i18n/index.js';

export default function TerminalPlaceholder() {
  return (
    <div className="dock-terminal-placeholder">
      <div className="dock-terminal-title">{msg('dock.terminal')}</div>
      <div className="dock-terminal-hint">
        {/* TODO: 接入真实调试终端（xterm.js 等），支持输出/命令/日志 */}
        调试终端待实现。
      </div>
    </div>
  );
}
