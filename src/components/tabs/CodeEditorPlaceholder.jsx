/**
 * @file components/tabs/CodeEditorPlaceholder.jsx
 * @description 代码编辑页面占位（未来接入 Blockly/代码编辑器，参照 AstraEditor-Next）。
 * @module components/tabs/CodeEditorPlaceholder
 */

import React from 'react';
import { msg } from '../../i18n/index.js';

export default function CodeEditorPlaceholder() {
  return (
    <div className="code-editor-placeholder">
      <div className="code-editor-title">{msg('tabs.code')}</div>
      <div className="code-editor-hint">{msg('tabs.codePlaceholder')}</div>
      {/* eslint-disable-next-line no-warning-comments -- 代码编辑器待接入 */}
      {/* TODO: 接入代码/积木编辑器（Blockly 等），作为中心编辑区的第二个编辑器 */}
    </div>
  );
}
