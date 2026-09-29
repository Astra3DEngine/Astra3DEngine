/**
 * @file components/fileBrowser/FileBrowserSidebar.jsx
 * @description 文件浏览器侧栏：快速访问目录 + 驱动器列表。
 * @module components/fileBrowser/FileBrowserSidebar
 */

import { msg } from '../../i18n/index.js';
import { Icon } from './FileIcons.jsx';
import DesktopIcon from '../../assets/icons/editor/desktop.svg?react';
import DocumentIcon from '../../assets/icons/editor/document.svg?react';
import DownloadIcon from '../../assets/icons/editor/download.svg?react';
import HomeIcon from '../../assets/icons/editor/home.svg?react';

/**
 * @param {Object} props
 * @param {Object|null} props.commonDirs
 * @param {Array<Object>} props.drives
 * @param {string} props.currentPath
 * @param {boolean} props.isWindows
 * @param {Function} props.navigateTo
 */
function FileBrowserSidebar({ commonDirs, drives, currentPath, isWindows, navigateTo }) {
  const quickItems = [
    { dir: commonDirs?.desktop, icon: DesktopIcon, label: 'fileBrowser.desktop' },
    { dir: commonDirs?.documents, icon: DocumentIcon, label: 'fileBrowser.documents' },
    { dir: commonDirs?.downloads, icon: DownloadIcon, label: 'fileBrowser.downloads' },
    { dir: commonDirs?.home, icon: HomeIcon, label: 'fileBrowser.home' },
  ].filter((item) => item.dir);

  return (
    <div className="file-browser-sidebar">
      <div className="file-browser-quick-access">
        <h4>{msg('fileBrowser.quickAccess')}</h4>
        {quickItems.map((item) => (
          <div
            key={item.label}
            className="file-browser-quick-item"
            onClick={() => navigateTo(item.dir)}
          >
            <Icon src={item.icon} size={16} />
            <span>{msg(item.label)}</span>
          </div>
        ))}
      </div>

      {drives.length > 0 && (
        <div className="file-browser-drives">
          <h4>{msg('fileBrowser.drives')}</h4>
          {drives.map((drive) => {
            // 去掉末尾斜杠进行比较，避免路径格式不一致导致判断失败
            const drivePathNormalized = drive.path.replace(/[\\/]$/, '');
            const currentPathNormalized = currentPath.replace(/[\\/]$/, '');
            const isActive =
              currentPathNormalized === drivePathNormalized ||
              (currentPathNormalized.startsWith(drivePathNormalized + (isWindows ? '\\' : '/')) &&
                isWindows); // Linux 区别于 Windows 的分区机制
            return (
              <div
                key={drive.path}
                className={`file-browser-quick-item ${isActive ? 'active' : ''}`}
                onClick={() => navigateTo(drive.path)}
              >
                <Icon src={DesktopIcon} size={16} />
                <span>{drive.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FileBrowserSidebar;
