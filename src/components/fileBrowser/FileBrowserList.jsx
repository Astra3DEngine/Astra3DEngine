/**
 * @file components/fileBrowser/FileBrowserList.jsx
 * @description 文件浏览器文件列表：加载/空态/错误状态与文件项。
 * @module components/fileBrowser/FileBrowserList
 */

import { msg } from '../../i18n/index.js';
import { Icon, getFileIcon, FolderIcon } from './FileIcons.jsx';
import { formatSize, formatDate } from '../../utils/pathUtils.js';

/**
 * @param {Object} props
 * @param {boolean} props.isLoading
 * @param {Array<Object>} props.items - 过滤后的可见文件项
 * @param {Array<Object>} props.selectedItems
 * @param {string|null} props.error
 * @param {Function} props.onItemClick
 * @param {Function} props.onItemDoubleClick
 */
function FileBrowserList({
  isLoading,
  items,
  selectedItems,
  error,
  onItemClick,
  onItemDoubleClick,
}) {
  return (
    <div className="file-browser-content">
      {error && <div className="file-browser-error">{error}</div>}

      {isLoading && <div className="file-browser-loading">{msg('fileBrowser.loading')}</div>}

      {!error && !isLoading && items.length === 0 && (
        <div className="file-browser-empty">{msg('fileBrowser.empty')}</div>
      )}

      {!error && !isLoading && items.length > 0 && (
        <div className="file-browser-list">
          {items.map((item) => (
            <div
              key={item.path}
              className={`file-browser-item ${selectedItems.some((i) => i.path === item.path) ? 'selected' : ''}`}
              onClick={(e) => onItemClick(item, e)}
              onDoubleClick={() => onItemDoubleClick(item)}
            >
              <span className="file-browser-item-icon">
                <Icon src={item.isDirectory ? FolderIcon : getFileIcon(item.name)} size={16} />
              </span>
              <span className="file-browser-item-name">{item.name}</span>
              <span className="file-browser-item-size">
                {item.isDirectory ? '' : formatSize(item.size)}
              </span>
              <span className="file-browser-item-date">{formatDate(item.modifiedTime)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FileBrowserList;
