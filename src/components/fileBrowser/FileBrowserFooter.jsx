/**
 * @file components/fileBrowser/FileBrowserFooter.jsx
 * @description 文件浏览器底部：文件名输入、过滤器、取消/确认按钮。
 * @module components/fileBrowser/FileBrowserFooter
 */

import { msg } from '../../i18n/index.js';

/**
 * @param {Object} props
 * @param {string} props.mode - 'open' | 'save'
 * @param {string} props.filename
 * @param {Function} props.onFilenameChange
 * @param {Array<Object>} props.filters
 * @param {number} props.activeFilterIndex
 * @param {Function} props.onFilterChange
 * @param {boolean} props.canConfirm - 确认按钮是否可用
 * @param {Function} props.onCancel
 * @param {Function} props.onConfirm
 */
function FileBrowserFooter({
  mode,
  filename,
  onFilenameChange,
  filters,
  activeFilterIndex,
  onFilterChange,
  canConfirm,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="file-browser-footer">
      {mode === 'save' && (
        <div className="file-browser-filename-input">
          <label>{msg('fileBrowser.filename')}:</label>
          <input
            type="text"
            value={filename}
            onChange={(e) => onFilenameChange(e.target.value)}
            placeholder={msg('fileBrowser.filenamePlaceholder')}
          />
        </div>
      )}

      {filters.length > 0 && (
        <div className="file-browser-filter">
          <label>{msg('fileBrowser.filter')}:</label>
          <select value={activeFilterIndex} onChange={(e) => onFilterChange(e.target.value)}>
            {filters.map((filter, index) => (
              <option key={index} value={index}>
                {filter.name} ({filter.extensions?.join(', ') || '*'})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="file-browser-actions">
        <button className="file-browser-btn-cancel" onClick={onCancel}>
          {msg('fileBrowser.cancel')}
        </button>
        <button className="file-browser-btn-confirm" onClick={onConfirm} disabled={!canConfirm}>
          {mode === 'save' ? msg('fileBrowser.save') : msg('fileBrowser.open')}
        </button>
      </div>
    </div>
  );
}

export default FileBrowserFooter;