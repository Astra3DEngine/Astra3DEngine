/**
 * @file components/FileBrowserDialog.jsx
 * @description 文件浏览器对话框（Electron 桌面端），支持打开/保存、导航历史、快速访问。
 * @module components/FileBrowserDialog
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { msg } from '../i18n/index.js';
import { useDialog } from '../hooks/useDialog.jsx';
import Modal from './Modal.jsx';
import FileBrowserToolbar from './fileBrowser/FileBrowserToolbar.jsx';
import FileBrowserSidebar from './fileBrowser/FileBrowserSidebar.jsx';
import FileBrowserList from './fileBrowser/FileBrowserList.jsx';
import FileBrowserFooter from './fileBrowser/FileBrowserFooter.jsx';
import { readRawLocalStorage, writeRawLocalStorage } from '../utils/localstorage.js';
import { normalizePath, splitPathParts } from '../utils/pathUtils.js';

/**
 * 记忆上次打开的路径（跨对话框复用，跨会话持久化）
 */
const LAST_PATH_KEY = 'a3de_last_filebrowser_path';

const FileBrowserDialog = ({
  isOpen,
  onClose,
  mode = 'open',
  title,
  defaultPath,
  filters = [],
  allowMultiple = false,
  showHiddenFiles = false,
  allowSelectFolder = false,
}) => {
  const dialog = useDialog();
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [commonDirs, setCommonDirs] = useState(null);
  const [drives, setDrives] = useState([]);
  const [filename, setFilename] = useState('');
  const [activeFilterIndex, setActiveFilterIndex] = useState(0);
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [editedPath, setEditedPath] = useState('');

  const isElectron = typeof window !== 'undefined' && window.electronAPI?.fs;

  useEffect(() => {
    if (isOpen && isElectron) {
      setIsLoading(true);
      setItems([]);
      setError(null);
      initBrowser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initBrowser 在 effect 之后声明，仅打开时触发一次
  }, [isOpen, isElectron]);

  const initBrowser = async () => {
    try {
      const dirs = await window.electronAPI.fs.getCommonDirs();
      setCommonDirs(dirs);

      const drivesResult = await window.electronAPI.fs.getDrives();
      if (drivesResult.success) {
        setDrives(drivesResult.drives);
      }

      const initialPath = defaultPath || readRawLocalStorage(LAST_PATH_KEY) || dirs.home || dirs.documents;
      if (initialPath) {
        navigateTo(initialPath, true);
      } else {
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
    }
  };

  // 使用 navigator.userAgent 检测平台，不依赖异步数据
  const isWindows = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return navigator.userAgent?.includes('Windows') || navigator.platform?.startsWith('Win');
  }, []);

  // 根据平台判断路径分隔符
  const pathSeparator = useMemo(() => {
    return isWindows ? '\\' : '/';
  }, [isWindows]);

  const navigateTo = useCallback(
    async (path, addToHistory = true) => {
      const normalizedPath = normalizePath(path);
      if (!normalizedPath) return;

      setIsLoading(true);
      setError(null);
      setSelectedItems([]);

      try {
        const result = await window.electronAPI.fs.listDirectory(normalizedPath);

        if (result.success) {
          const filteredItems = showHiddenFiles
            ? result.items
            : result.items.filter((item) => !item.isHidden);

          setItems(filteredItems);
          setCurrentPath(normalizedPath);
          writeRawLocalStorage(LAST_PATH_KEY, normalizedPath);

          if (addToHistory) {
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(normalizedPath);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
          }
        } else {
          setError(result.error || msg('fileBrowser.errorAccess'));
        }
      } catch (e) {
        setError(e.message);
      }

      setIsLoading(false);
    },
    [showHiddenFiles, history, historyIndex]
  );

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newPath = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      navigateTo(newPath, false);
    }
  }, [history, historyIndex, navigateTo]);

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newPath = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      navigateTo(newPath, false);
    }
  }, [history, historyIndex, navigateTo]);

  const goUp = useCallback(() => {
    const normalized = normalizePath(currentPath);
    if (!normalized) return;

    // Windows: 盘符根目录（如 D:\）不能再往上
    if (isWindows) {
      const driveRootMatch = normalized.match(/^([A-Za-z]:\\?)$/);
      if (driveRootMatch) return;

      const lastSep = normalized.lastIndexOf('\\');
      if (lastSep > 0) {
        // "D:\foo\bar" → "D:\foo",  "D:\foo" → "D:\"
        const parentPath = normalized.substring(0, lastSep);
        navigateTo(parentPath || drives[0]?.path);
      }
    } else {
      // Unix (Linux/macOS): 根目录 / 不能再往上
      if (normalized === '/') return;

      const lastSep = normalized.lastIndexOf('/');
      if (lastSep > 0) {
        // "/home/user" → "/home", "/home" → "/"
        const parentPath = normalized.substring(0, lastSep);
        navigateTo(parentPath || '/');
      } else if (lastSep === 0) {
        // 已经是根目录的直接子目录，如 "/home" → "/"
        navigateTo('/');
      }
    }
  }, [currentPath, drives, isWindows, navigateTo]);

  const handlePathClick = useCallback(() => {
    setIsEditingPath(true);
    setEditedPath(currentPath);
  }, [currentPath]);

  const handlePathInputChange = useCallback((e) => {
    setEditedPath(e.target.value);
  }, []);

  const handlePathInputKeyDown = useCallback(
    async (e) => {
      if (e.key === 'Enter') {
        setIsEditingPath(false);
        if (editedPath && editedPath !== currentPath) {
          // navigateTo 内部会调用 normalizePath 规范化
          await navigateTo(editedPath);
        }
      } else if (e.key === 'Escape') {
        setIsEditingPath(false);
        setEditedPath(currentPath);
      }
    },
    [editedPath, currentPath, navigateTo]
  );

  const handlePathInputBlur = useCallback(() => {
    setIsEditingPath(false);
    setEditedPath(currentPath);
  }, [currentPath]);

  const handleItemClick = useCallback(
    (item, e) => {
      if (item.isDirectory) {
        // 如果允许选择文件夹，Ctrl+点击可以选中文件夹
        if (allowSelectFolder && allowMultiple && e.ctrlKey) {
          setSelectedItems((prev) => {
            const exists = prev.some((i) => i.path === item.path);
            if (exists) {
              return prev.filter((i) => i.path !== item.path);
            }
            return [...prev, item];
          });
        } else if (allowSelectFolder && !allowMultiple) {
          // 单选模式下，点击文件夹选中它
          setSelectedItems([item]);
        } else {
          // 默认行为：进入文件夹
          navigateTo(item.path);
        }
      } else {
        if (allowMultiple && e.ctrlKey) {
          setSelectedItems((prev) => {
            const exists = prev.some((i) => i.path === item.path);
            if (exists) {
              return prev.filter((i) => i.path !== item.path);
            }
            return [...prev, item];
          });
        } else {
          setSelectedItems([item]);
        }
      }
    },
    [navigateTo, allowMultiple, allowSelectFolder]
  );

  const handleConfirm = useCallback(() => {
    if (mode === 'save') {
      if (!filename.trim()) {
        setError(msg('fileBrowser.errorFilename'));
        return;
      }

      const fullPath = currentPath + pathSeparator + filename.trim();
      onClose(fullPath);
    } else {
      if (selectedItems.length > 0) {
        const paths = selectedItems.map((i) => i.path);
        onClose(allowMultiple ? paths : paths[0]);
      }
    }
  }, [mode, filename, currentPath, pathSeparator, selectedItems, allowMultiple, onClose]);

  const handleItemDoubleClick = useCallback(
    (item) => {
      if (item.isDirectory) {
        navigateTo(item.path);
      } else {
        handleConfirm();
      }
    },
    [navigateTo, handleConfirm]
  );

  const handleCreateFolder = useCallback(async () => {
    const folderName = await dialog.prompt(
      msg('fileBrowser.folderNamePlaceholder'),
      '',
      msg('fileBrowser.newFolder')
    );
    if (!folderName || !folderName.trim()) return;

    const folderPath = currentPath + pathSeparator + folderName.trim();

    try {
      const result = await window.electronAPI.fs.createDirectory(folderPath);
      if (result.success) {
        navigateTo(currentPath, false);
      } else {
        setError(result.error);
      }
    } catch (e) {
      setError(e.message);
    }
  }, [currentPath, pathSeparator, navigateTo, dialog]);

  const matchesFilter = useCallback(
    (item) => {
      if (item.isDirectory) return true;
      if (filters.length === 0) return true;

      const activeFilter = filters[activeFilterIndex];
      if (!activeFilter || !activeFilter.extensions) return true;

      if (activeFilter.extensions.includes('*')) return true;

      const ext = item.name.split('.').pop()?.toLowerCase();
      return activeFilter.extensions.includes(ext);
    },
    [filters, activeFilterIndex]
  );

  const visibleItems = useMemo(() => {
    return items.filter(matchesFilter);
  }, [items, matchesFilter]);

  const pathParts = useMemo(() => {
    return splitPathParts(currentPath, isWindows, normalizePath);
  }, [currentPath, isWindows]);

  // 根据点击的 index 构建子路径
  const buildSubPath = useCallback(
    (index) => {
      if (pathParts.length === 0) return '';
      const firstPart = pathParts[0];
      // Windows 盘符路径 (D:, C: 等)
      if (/^[A-Za-z]:$/.test(firstPart)) {
        if (index === 0) {
          return firstPart + '\\';
        }
        // 盘符 + \ + 后续段用 \ 连接
        return firstPart + '\\' + pathParts.slice(1, index + 1).join('\\');
      }
      // 非 Windows 路径（Unix 风格）
      return '/' + pathParts.slice(0, index + 1).join('/');
    },
    [pathParts]
  );

  const modalTitle =
    title || (mode === 'save' ? msg('fileBrowser.saveTitle') : msg('fileBrowser.openTitle'));

  const renderContent = () => {
    if (!isElectron) {
      return (
        <div className="file-browser-content">
          <div className="file-browser-error">{msg('fileBrowser.notElectron')}</div>
        </div>
      );
    }

    if (isLoading && items.length === 0) {
      return (
        <div
          className="file-browser-content"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '300px',
          }}
        >
          <div className="file-browser-loading">{msg('fileBrowser.loading')}</div>
        </div>
      );
    }

    // 打开模式禁用 toolbar 的"进入文件"行为依赖此标志
    const canConfirm = mode === 'save' ? !!filename.trim() : selectedItems.length > 0;

    return (
      <>
        <FileBrowserToolbar
          goBack={goBack}
          goForward={goForward}
          goUp={goUp}
          historyIndex={historyIndex}
          historyLength={history.length}
          isEditingPath={isEditingPath}
          editedPath={editedPath}
          pathParts={pathParts}
          buildSubPath={buildSubPath}
          navigateTo={navigateTo}
          handlePathClick={handlePathClick}
          handlePathInputChange={handlePathInputChange}
          handlePathInputKeyDown={handlePathInputKeyDown}
          handlePathInputBlur={handlePathInputBlur}
          handleCreateFolder={handleCreateFolder}
        />

        <div className="file-browser-body">
          <FileBrowserSidebar
            commonDirs={commonDirs}
            drives={drives}
            currentPath={currentPath}
            isWindows={isWindows}
            navigateTo={navigateTo}
          />

          <FileBrowserList
            isLoading={isLoading}
            items={visibleItems}
            selectedItems={selectedItems}
            error={error}
            onItemClick={handleItemClick}
            onItemDoubleClick={handleItemDoubleClick}
          />
        </div>

        <FileBrowserFooter
          mode={mode}
          filename={filename}
          onFilenameChange={setFilename}
          filters={filters}
          activeFilterIndex={activeFilterIndex}
          onFilterChange={(v) => setActiveFilterIndex(parseInt(v, 10))}
          canConfirm={canConfirm}
          onCancel={onClose}
          onConfirm={handleConfirm}
        />
      </>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} width={720} height={500}>
      {renderContent()}
    </Modal>
  );
};

export default FileBrowserDialog;