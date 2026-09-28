/**
 * @file components/fileBrowser/FileBrowserToolbar.jsx
 * @description 文件浏览器工具栏：后退/前进/向上、路径条、新建文件夹。
 * @module components/fileBrowser/FileBrowserToolbar
 */

import { msg } from '../../i18n/index.js';
import { Icon, FolderIcon } from './FileIcons.jsx';
import ArrowLeftIcon from '../../assets/icons/nav/arrow-left.svg?react';
import ArrowRightIcon from '../../assets/icons/nav/arrow-right.svg?react';
import ArrowUpIcon from '../../assets/icons/nav/arrow-up.svg?react';
import PlusIcon from '../../assets/icons/editor/plus.svg?react';

/**
 * @param {Object} props
 * @param {Function} props.goBack
 * @param {Function} props.goForward
 * @param {Function} props.goUp
 * @param {number} props.historyIndex
 * @param {number} props.historyLength
 * @param {boolean} props.isEditingPath
 * @param {string} props.editedPath
 * @param {string[]} props.pathParts
 * @param {Function} props.buildSubPath
 * @param {Function} props.navigateTo
 * @param {Function} props.handlePathClick
 * @param {Function} props.handlePathInputChange
 * @param {Function} props.handlePathInputKeyDown
 * @param {Function} props.handlePathInputBlur
 * @param {Function} props.handleCreateFolder
 */
function FileBrowserToolbar({
  goBack,
  goForward,
  goUp,
  historyIndex,
  historyLength,
  isEditingPath,
  editedPath,
  pathParts,
  buildSubPath,
  navigateTo,
  handlePathClick,
  handlePathInputChange,
  handlePathInputKeyDown,
  handlePathInputBlur,
  handleCreateFolder,
}) {
  return (
    <div className="file-browser-toolbar">
      <button
        className="file-browser-nav-btn"
        onClick={goBack}
        disabled={historyIndex <= 0}
        title={msg('fileBrowser.back')}
      >
        <Icon src={ArrowLeftIcon} size={14} />
      </button>
      <button
        className="file-browser-nav-btn"
        onClick={goForward}
        disabled={historyIndex >= historyLength - 1}
        title={msg('fileBrowser.forward')}
      >
        <Icon src={ArrowRightIcon} size={14} />
      </button>
      <button className="file-browser-nav-btn" onClick={goUp} title={msg('fileBrowser.up')}>
        <Icon src={ArrowUpIcon} size={14} />
      </button>

      <div className="file-browser-path">
        {isEditingPath ? (
          <input
            type="text"
            className="file-browser-path-input"
            value={editedPath}
            onChange={handlePathInputChange}
            onKeyDown={handlePathInputKeyDown}
            onBlur={handlePathInputBlur}
            autoFocus
          />
        ) : (
          <div className="file-browser-path-parts" onClick={handlePathClick}>
            {pathParts.map((part, index) => {
              const subPath = buildSubPath(index);

              return (
                <span
                  key={index}
                  className="file-browser-path-part"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateTo(subPath);
                  }}
                >
                  {part}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <button
        className="file-browser-action-btn"
        onClick={handleCreateFolder}
        title={msg('fileBrowser.newFolder')}
      >
        <Icon src={FolderIcon} size={14} />
        <Icon src={PlusIcon} size={10} className="plus-overlay" />
      </button>
    </div>
  );
}

export default FileBrowserToolbar;