import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { msg } from '../i18n/index.js';

import ArrowLeftIcon from '../icons/arrow-left.svg';
import ArrowRightIcon from '../icons/arrow-right.svg';
import ArrowUpIcon from '../icons/arrow-up.svg';
import FolderIcon from '../icons/folder.svg';
import FileIcon from '../icons/file.svg';
import CloseIcon from '../icons/close.svg';
import PlusIcon from '../icons/plus.svg';
import HomeIcon from '../icons/home.svg';
import DesktopIcon from '../icons/desktop.svg';
import DocumentIcon from '../icons/document.svg';
import DownloadIcon from '../icons/download.svg';
import ImageFileIcon from '../icons/image-file.svg';
import AudioIcon from '../icons/audio.svg';
import VideoIcon from '../icons/video.svg';
import BookIcon from '../icons/book.svg';
import ListIcon from '../icons/list.svg';
import CodeIcon from '../icons/code.svg';
import BoxIcon from '../icons/box.svg';
import PlayCircleIcon from '../icons/play-circle.svg';
import ModelIcon from '../icons/model.svg';

const Icon = ({ src, size = 16, className = '' }) => (
  <img 
    src={src} 
    alt="" 
    width={size} 
    height={size} 
    className={`icon ${className}`}
    style={{ 
      filter: 'var(--icon-filter, none)',
      opacity: 'var(--icon-opacity, 1)'
    }}
  />
);

const getFileIcon = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const iconMap = {
    'jpg': ImageFileIcon, 'jpeg': ImageFileIcon, 'png': ImageFileIcon, 'gif': ImageFileIcon, 'bmp': ImageFileIcon, 'svg': ImageFileIcon,
    'mp3': AudioIcon, 'wav': AudioIcon, 'ogg': AudioIcon, 'flac': AudioIcon,
    'mp4': VideoIcon, 'avi': VideoIcon, 'mkv': VideoIcon, 'mov': VideoIcon, 'webm': VideoIcon,
    'pdf': BookIcon, 'doc': DocumentIcon, 'docx': DocumentIcon, 'xls': DocumentIcon, 'xlsx': DocumentIcon, 'ppt': DocumentIcon, 'pptx': DocumentIcon,
    'zip': BoxIcon, 'rar': BoxIcon, '7z': BoxIcon, 'tar': BoxIcon, 'gz': BoxIcon,
    'exe': PlayCircleIcon, 'msi': PlayCircleIcon, 'app': PlayCircleIcon, 'dmg': PlayCircleIcon,
    'js': CodeIcon, 'ts': CodeIcon, 'jsx': CodeIcon, 'tsx': CodeIcon, 'py': CodeIcon, 'java': CodeIcon, 'cpp': CodeIcon, 'c': CodeIcon,
    'json': ListIcon, 'xml': ListIcon, 'yaml': ListIcon, 'yml': ListIcon, 'toml': ListIcon,
    'md': DocumentIcon, 'txt': DocumentIcon, 'rtf': DocumentIcon,
    'html': CodeIcon, 'css': CodeIcon, 'scss': CodeIcon,
    'gltf': ModelIcon, 'glb': ModelIcon, 'obj': ModelIcon, 'fbx': ModelIcon,
    'astra': PlayCircleIcon, 'a3d': PlayCircleIcon
  };
  
  return iconMap[ext] || FileIcon;
};

const FileBrowserDialog = ({
  isOpen,
  onClose,
  onSelect,
  mode = 'open',
  title,
  defaultPath,
  filters = [],
  allowMultiple = false,
  showHiddenFiles = false
}) => {
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
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [activeFilterIndex, setActiveFilterIndex] = useState(0);
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [editedPath, setEditedPath] = useState('');
  
  const isElectron = typeof window !== 'undefined' && window.electronAPI?.fs;
  
  useEffect(() => {
    if (isOpen && isElectron) {
      initBrowser();
    }
  }, [isOpen, isElectron]);
  
  const initBrowser = async () => {
    try {
      const dirs = await window.electronAPI.fs.getCommonDirs();
      setCommonDirs(dirs);
      
      const drivesResult = await window.electronAPI.fs.getDrives();
      if (drivesResult.success) {
        setDrives(drivesResult.drives);
      }
      
      const initialPath = defaultPath || dirs.home || dirs.documents;
      if (initialPath) {
        navigateTo(initialPath, true);
      }
    } catch (e) {
      console.error('Failed to initialize file browser:', e);
    }
  };
  
  const pathSeparator = useMemo(() => {
    return currentPath.includes('\\') ? '\\' : '/';
  }, [currentPath]);
  
  const isWindows = useMemo(() => {
    return drives.length > 0 && drives[0].path.includes('\\');
  }, [drives]);
  
  const navigateTo = useCallback(async (path, addToHistory = true) => {
    setIsLoading(true);
    setError(null);
    setSelectedItems([]);
    
    try {
      const result = await window.electronAPI.fs.listDirectory(path);
      
      if (result.success) {
        const filteredItems = showHiddenFiles 
          ? result.items 
          : result.items.filter(item => !item.isHidden);
        
        setItems(filteredItems);
        setCurrentPath(path);
        
        if (addToHistory) {
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(path);
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
  }, [showHiddenFiles, history, historyIndex]);
  
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
    const parentPath = currentPath.split(/[\\/]/).slice(0, -1).join(pathSeparator) || (isWindows ? drives[0]?.path : '/');
    if (parentPath) {
      navigateTo(parentPath);
    }
  }, [currentPath, drives, isWindows, pathSeparator, navigateTo]);
  
  const handlePathClick = useCallback(() => {
    setIsEditingPath(true);
    setEditedPath(currentPath);
  }, [currentPath]);
  
  const handlePathInputChange = useCallback((e) => {
    setEditedPath(e.target.value);
  }, []);
  
  const handlePathInputKeyDown = useCallback(async (e) => {
    if (e.key === 'Enter') {
      setIsEditingPath(false);
      if (editedPath && editedPath !== currentPath) {
        let normalizedPath = editedPath;
        
        if (isWindows) {
          const driveRegex = /^([A-Za-z]:)(.*)$/;
          const match = editedPath.match(driveRegex);
          if (match && !match[2].startsWith('\\')) {
            normalizedPath = match[1] + '\\' + match[2];
          }
        }
        
        await navigateTo(normalizedPath);
      }
    } else if (e.key === 'Escape') {
      setIsEditingPath(false);
      setEditedPath(currentPath);
    }
  }, [editedPath, currentPath, navigateTo, isWindows]);
  
  const handlePathInputBlur = useCallback(() => {
    setIsEditingPath(false);
    setEditedPath(currentPath);
  }, [currentPath]);
  
  const handleItemClick = useCallback((item, e) => {
    if (item.isDirectory) {
      navigateTo(item.path);
    } else {
      if (allowMultiple && e.ctrlKey) {
        setSelectedItems(prev => {
          const exists = prev.some(i => i.path === item.path);
          if (exists) {
            return prev.filter(i => i.path !== item.path);
          }
          return [...prev, item];
        });
      } else {
        setSelectedItems([item]);
        setFilename(item.name);
      }
    }
  }, [navigateTo, allowMultiple]);
  
  const handleConfirm = useCallback(() => {
    if (mode === 'save') {
      if (!filename.trim()) {
        setError(msg('fileBrowser.errorFilename'));
        return;
      }
      
      const fullPath = currentPath + pathSeparator + filename.trim();
      onSelect(fullPath);
    } else {
      if (selectedItems.length > 0) {
        const paths = selectedItems.map(i => i.path);
        onSelect(allowMultiple ? paths : paths[0]);
      }
    }
    onClose();
  }, [mode, filename, currentPath, pathSeparator, selectedItems, allowMultiple, onSelect, onClose]);
  
  const handleItemDoubleClick = useCallback((item) => {
    if (item.isDirectory) {
      navigateTo(item.path);
    } else {
      handleConfirm();
    }
  }, [navigateTo, handleConfirm]);
  
  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    
    const folderPath = currentPath + pathSeparator + newFolderName.trim();
    
    try {
      const result = await window.electronAPI.fs.createDirectory(folderPath);
      if (result.success) {
        navigateTo(currentPath, false);
        setShowNewFolderDialog(false);
        setNewFolderName('');
      } else {
        setError(result.error);
      }
    } catch (e) {
      setError(e.message);
    }
  }, [newFolderName, currentPath, pathSeparator, navigateTo]);
  
  const formatSize = useCallback((bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }, []);
  
  const formatDate = useCallback((timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  }, []);
  
  const matchesFilter = useCallback((item) => {
    if (item.isDirectory) return true;
    if (filters.length === 0) return true;
    
    const activeFilter = filters[activeFilterIndex];
    if (!activeFilter || !activeFilter.extensions) return true;
    
    if (activeFilter.extensions.includes('*')) return true;
    
    const ext = item.name.split('.').pop()?.toLowerCase();
    return activeFilter.extensions.includes(ext);
  }, [filters, activeFilterIndex]);
  
  const visibleItems = useMemo(() => {
    return items.filter(matchesFilter);
  }, [items, matchesFilter]);
  
  const pathParts = useMemo(() => {
    if (!currentPath) return [];
    const parts = currentPath.split(/[\\/]/).filter(Boolean);
    return parts;
  }, [currentPath]);
  
  const buildSubPath = useCallback((index) => {
    if (isWindows) {
      const firstPart = pathParts[0];
      if (firstPart && firstPart.endsWith(':')) {
        if (index === 0) {
          return firstPart + '\\';
        }
        return firstPart + '\\' + pathParts.slice(1, index + 1).join('\\');
      }
      return pathParts.slice(0, index + 1).join('\\');
    } else {
      return '/' + pathParts.slice(0, index + 1).join('/');
    }
  }, [isWindows, pathParts]);
  
  if (!isOpen) return null;
  
  if (!isElectron) {
    return (
      <div className="file-browser-overlay">
        <div className="file-browser-dialog">
          <div className="file-browser-header">
            <h3>{title || msg('fileBrowser.title')}</h3>
            <button className="file-browser-close" onClick={onClose}>
              <Icon src={CloseIcon} size={14} />
            </button>
          </div>
          <div className="file-browser-content">
            <div className="file-browser-error">
              {msg('fileBrowser.notElectron')}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="file-browser-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="file-browser-dialog">
        <div className="file-browser-header">
          <h3>{title || (mode === 'save' ? msg('fileBrowser.saveTitle') : msg('fileBrowser.openTitle'))}</h3>
          <button className="file-browser-close" onClick={onClose}>
            <Icon src={CloseIcon} size={14} />
          </button>
        </div>
        
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
            disabled={historyIndex >= history.length - 1}
            title={msg('fileBrowser.forward')}
          >
            <Icon src={ArrowRightIcon} size={14} />
          </button>
          <button 
            className="file-browser-nav-btn" 
            onClick={goUp}
            title={msg('fileBrowser.up')}
          >
            <Icon src={ArrowUpIcon} size={14} />
          </button>
          
          <div className="file-browser-path">
            {isWindows && drives.length > 0 && (
              <select 
                className="file-browser-drive-select"
                value={currentPath ? currentPath.split('\\')[0] + '\\' : drives[0]?.path || ''}
                onChange={(e) => navigateTo(e.target.value)}
              >
                {drives.map(drive => (
                  <option key={drive.path} value={drive.path}>
                    {drive.label}
                  </option>
                ))}
              </select>
            )}
            
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
            onClick={() => setShowNewFolderDialog(true)}
            title={msg('fileBrowser.newFolder')}
          >
            <Icon src={FolderIcon} size={14} />
            <Icon src={PlusIcon} size={10} className="plus-overlay" />
          </button>
        </div>
        
        <div className="file-browser-body">
          <div className="file-browser-sidebar">
            <div className="file-browser-quick-access">
              <h4>{msg('fileBrowser.quickAccess')}</h4>
              {commonDirs && (
                <>
                  {commonDirs.desktop && (
                    <div 
                      className="file-browser-quick-item"
                      onClick={() => navigateTo(commonDirs.desktop)}
                    >
                      <Icon src={DesktopIcon} size={16} />
                      <span>{msg('fileBrowser.desktop')}</span>
                    </div>
                  )}
                  {commonDirs.documents && (
                    <div 
                      className="file-browser-quick-item"
                      onClick={() => navigateTo(commonDirs.documents)}
                    >
                      <Icon src={DocumentIcon} size={16} />
                      <span>{msg('fileBrowser.documents')}</span>
                    </div>
                  )}
                  {commonDirs.downloads && (
                    <div 
                      className="file-browser-quick-item"
                      onClick={() => navigateTo(commonDirs.downloads)}
                    >
                      <Icon src={DownloadIcon} size={16} />
                      <span>{msg('fileBrowser.downloads')}</span>
                    </div>
                  )}
                  {commonDirs.home && (
                    <div 
                      className="file-browser-quick-item"
                      onClick={() => navigateTo(commonDirs.home)}
                    >
                      <Icon src={HomeIcon} size={16} />
                      <span>{msg('fileBrowser.home')}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {drives.length > 0 && (
              <div className="file-browser-drives">
                <h4>{msg('fileBrowser.drives')}</h4>
                {drives.map(drive => (
                  <div 
                    key={drive.path}
                    className={`file-browser-quick-item ${currentPath.startsWith(drive.path) ? 'active' : ''}`}
                    onClick={() => navigateTo(drive.path)}
                  >
                    <Icon src={DesktopIcon} size={16} />
                    <span>{drive.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="file-browser-content">
            {isLoading && (
              <div className="file-browser-loading">
                {msg('fileBrowser.loading')}
              </div>
            )}
            
            {error && (
              <div className="file-browser-error">
                {error}
              </div>
            )}
            
            {!isLoading && !error && visibleItems.length === 0 && (
              <div className="file-browser-empty">
                {msg('fileBrowser.empty')}
              </div>
            )}
            
            {!isLoading && !error && visibleItems.length > 0 && (
              <div className="file-browser-list">
                {visibleItems.map(item => (
                  <div
                    key={item.path}
                    className={`file-browser-item ${selectedItems.some(i => i.path === item.path) ? 'selected' : ''}`}
                    onClick={(e) => handleItemClick(item, e)}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                  >
                    <span className="file-browser-item-icon">
                      <Icon src={item.isDirectory ? FolderIcon : getFileIcon(item.name)} size={16} />
                    </span>
                    <span className="file-browser-item-name">{item.name}</span>
                    <span className="file-browser-item-size">
                      {item.isDirectory ? '' : formatSize(item.size)}
                    </span>
                    <span className="file-browser-item-date">
                      {formatDate(item.modifiedTime)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="file-browser-footer">
          {mode === 'save' && (
            <div className="file-browser-filename-input">
              <label>{msg('fileBrowser.filename')}:</label>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder={msg('fileBrowser.filenamePlaceholder')}
              />
            </div>
          )}
          
          {filters.length > 0 && (
            <div className="file-browser-filter">
              <label>{msg('fileBrowser.filter')}:</label>
              <select 
                value={activeFilterIndex}
                onChange={(e) => setActiveFilterIndex(parseInt(e.target.value, 10))}
              >
                {filters.map((filter, index) => (
                  <option key={index} value={index}>
                    {filter.name} ({filter.extensions?.join(', ') || '*'})
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="file-browser-actions">
            <button className="file-browser-btn-cancel" onClick={onClose}>
              {msg('fileBrowser.cancel')}
            </button>
            <button 
              className="file-browser-btn-confirm"
              onClick={handleConfirm}
              disabled={mode === 'save' ? !filename.trim() : selectedItems.length === 0}
            >
              {mode === 'save' ? msg('fileBrowser.save') : msg('fileBrowser.open')}
            </button>
          </div>
        </div>
        
        {showNewFolderDialog && (
          <div className="file-browser-new-folder-overlay">
            <div className="file-browser-new-folder-dialog">
              <h4>{msg('fileBrowser.newFolder')}</h4>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder={msg('fileBrowser.folderNamePlaceholder')}
                autoFocus
              />
              <div className="file-browser-new-folder-actions">
                <button onClick={() => setShowNewFolderDialog(false)}>
                  {msg('fileBrowser.cancel')}
                </button>
                <button onClick={handleCreateFolder}>
                  {msg('fileBrowser.create')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileBrowserDialog;