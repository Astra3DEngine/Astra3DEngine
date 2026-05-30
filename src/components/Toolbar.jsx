/**
 * @file components/Toolbar.jsx
 * @description 工具栏组件，提供菜单栏、文件操作和窗口控制
 * @module components/Toolbar
 * 
 * 工具栏可以拖的，Electron 场景下。
 */

import React, { useRef, useEffect, useState } from 'react';
import { msg, languages, getLocale } from '../i18n/index.js';
import DropdownMenu from './DropdownMenu.jsx';
import InfoModal from './InfoModal.jsx';

import IconNewProject from '../icons/new-project.svg?react';
import IconOpenProject from '../icons/open-project.svg?react';
import IconSave from '../icons/save.svg?react';
import IconSaveAs from '../icons/save-as.svg?react';
import IconUndo from '../icons/undo.svg?react';
import IconRedo from '../icons/redo.svg?react';
import IconTheme from '../icons/theme.svg?react';
import IconLanguage from '../icons/language.svg?react';
import IconSettings from '../icons/settings.svg?react';
import IconPuzzle from '../icons/puzzle.svg?react';
import IconPlay from '../icons/play.svg?react';
import IconStop from '../icons/stop.svg?react';
import IconImport from '../icons/import.svg?react';
import IconExport from '../icons/export.svg?react';
import IconSnapshot from '../icons/snapshot.svg?react';
import IconRecent from '../icons/recent.svg?react';

import IconWindowMinimize from '../icons/window-minimize.svg?react';
import IconWindowMaximize from '../icons/window-maximize.svg?react';
import IconWindowRestore from '../icons/window-restore.svg?react';
import IconWindowClose from '../icons/window-close.svg?react';

/**
 * 工具栏组件
 * @param {Object} props - 组件属性
 * @param {boolean} props.isPlaying - 是否处于播放模式
 * @param {Function} props.setIsPlaying - 设置播放模式回调
 * @param {Function} props.onToggleLocale - 切换语言回调
 * @param {Function} props.onSetLocale - 设置语言回调
 * @param {Function} props.onSaveProject - 保存项目回调
 * @param {Function} props.onSaveAsProject - 另存为回调
 * @param {Function} props.onLoadProject - 加载项目回调
 * @param {Function} props.onNewProject - 新建项目回调
 * @param {string} props.projectFileName - 项目文件名
 * @param {Function} props.onToggleTheme - 切换主题回调
 * @param {string} props.theme - 当前主题
 * @param {boolean} props.canUndo - 是否可撤销
 * @param {boolean} props.canRedo - 是否可重做
 * @param {Function} props.onUndo - 撤销回调
 * @param {Function} props.onRedo - 重做回调
 * @param {Function} props.onOpenPreferences - 打开设置回调
 * @param {Array} props.recentProjects - 最近项目列表
 * @param {Function} props.onOpenRecentProject - 打开最近项目回调
 * @param {Function} props.onExportAsAstra - 导出为 .astra 回调
 * @param {Function} props.onImportAstra - 导入 .astra 回调
 * @param {Function} props.onOpenSnapshots - 打开快照管理回调
 * @param {Function} props.onOpenPluginSettings - 打开插件设置回调
 * @returns {JSX.Element} 工具栏组件
 */
function Toolbar({ 
  isPlaying, 
  setIsPlaying, 
  onToggleLocale,
  onSetLocale,
  onSaveProject,
  onSaveAsProject,
  onLoadProject,
  onNewProject,
  projectFileName,
  onToggleTheme,
  theme,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenPreferences,
  recentProjects = [],
  onOpenRecentProject,
  onExportAsAstra,
  onImportAstra,
  onOpenSnapshots,
  onOpenPluginSettings
}) {
  const fileMenuRef = useRef(null);
  const editMenuRef = useRef(null);
  const viewMenuRef = useRef(null);
  const runMenuRef = useRef(null);
  const logoMenuRef = useRef(null);
  
  const [isMaximized, setIsMaximized] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const [logoMenuOpen, setLogoMenuOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalType, setInfoModalType] = useState('about');

  useEffect(() => {
    const electronDetected = typeof window !== 'undefined' && !!window.electronAPI;
    setIsElectron(electronDetected);
    
    if (electronDetected) {
      window.electronAPI.isMaximized().then(setIsMaximized);
      
      window.electronAPI.onMaximize(() => setIsMaximized(true));
      window.electronAPI.onUnmaximize(() => setIsMaximized(false));
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (logoMenuRef.current && !logoMenuRef.current.contains(event.target)) {
        setLogoMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleMenuShortcut = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        const key = e.key.toLowerCase();
        const allRefs = [fileMenuRef, editMenuRef, viewMenuRef, runMenuRef];
        
        if (key === 'f' || key === 'e' || key === 'v' || key === 'r') {
          e.preventDefault();
          allRefs.forEach(ref => ref.current?.close());
          // 快捷键舒爽啊
          
          if (key === 'f') fileMenuRef.current?.open();
          else if (key === 'e') editMenuRef.current?.open();
          else if (key === 'v') viewMenuRef.current?.open();
          else if (key === 'r') runMenuRef.current?.open();
        }
      }
    };

    document.addEventListener('keydown', handleMenuShortcut);
    return () => document.removeEventListener('keydown', handleMenuShortcut);
  }, []);

  const fileMenuItems = [
    {
      label: msg('menu.newProject'),
      icon: <IconNewProject className="menu-icon" />,
      shortcut: 'Ctrl+Alt+N',
      onClick: onNewProject
    },
    {
      label: msg('menu.openProject'),
      icon: <IconOpenProject className="menu-icon" />,
      shortcut: 'Ctrl+O',
      onClick: onLoadProject
    },
    {
      label: msg('menu.importAstra'),
      icon: <IconImport className="menu-icon" />,
      onClick: onImportAstra
    },
    { divider: true },
    {
      label: msg('menu.saveProject'),
      icon: <IconSave className="menu-icon" />,
      shortcut: 'Ctrl+S',
      onClick: onSaveProject
    },
    {
      label: msg('menu.saveAs'),
      icon: <IconSaveAs className="menu-icon" />,
      shortcut: 'Ctrl+Shift+S',
      onClick: onSaveAsProject
    },
    {
      label: msg('menu.exportAstra'),
      icon: <IconExport className="menu-icon" />,
      onClick: onExportAsAstra
    },
    { divider: true },
    {
      label: msg('menu.snapshots'),
      icon: <IconSnapshot className="menu-icon" />,
      onClick: onOpenSnapshots
    },
    ...(recentProjects.length > 0 ? [
      { divider: true },
      {
        label: msg('menu.recentProjects'),
        icon: <IconRecent className="menu-icon" />,
        submenu: recentProjects.slice(0, 5).map(project => ({
          label: project.name,
          hint: new Date(project.lastOpened).toLocaleDateString(),
          onClick: () => onOpenRecentProject && onOpenRecentProject(project)
        }))
      }
    ] : [])
  ];

  const editMenuItems = [
    {
      label: msg('menu.undo'),
      icon: <IconUndo className="menu-icon" />,
      shortcut: 'Ctrl+Z',
      disabled: !canUndo,
      onClick: onUndo
    },
    {
      label: msg('menu.redo'),
      icon: <IconRedo className="menu-icon" />,
      shortcut: 'Ctrl+Y',
      disabled: !canRedo,
      onClick: onRedo
    }
  ];

  const viewMenuItems = [
    {
      label: theme === 'dark' ? msg('menu.lightMode') : msg('menu.darkMode'),
      icon: <IconTheme className="menu-icon" />,
      onClick: onToggleTheme
    },
    {
      label: msg('menu.language'),
      icon: <IconLanguage className="menu-icon" />,
      submenu: languages.map(lang => ({
        label: lang.nativeName,
        active: getLocale() === lang.code,
        onClick: () => onSetLocale(lang.code)
      }))
    },
    { divider: true },
    {
      label: msg('menu.preferences'),
      icon: <IconSettings className="menu-icon" />,
      onClick: onOpenPreferences
    },
    {
      label: msg('menu.plugins') || '插件管理',
      icon: <IconPuzzle className="menu-icon" />,
      onClick: onOpenPluginSettings
    }
  ];

  const runMenuItems = [
    {
      label: isPlaying ? msg('toolbar.stop') : msg('toolbar.play'),
      icon: isPlaying ? <IconStop className="menu-icon" /> : <IconPlay className="menu-icon" />,
      shortcut: 'F5',
      onClick: () => setIsPlaying(!isPlaying)
    }
  ];

  const handleMinimize = () => {
    if (isElectron) {
      window.electronAPI.minimize();
    }
  };

  const handleMaximize = () => {
    if (isElectron) {
      window.electronAPI.maximize();
    }
  };

  const handleClose = () => {
    if (isElectron) {
      window.electronAPI.close();
    }
  };

  const handleLogoClick = (e) => {
    if (e.altKey && isElectron) {
      window.electronAPI.openGame();
    } else {
      setLogoMenuOpen(!logoMenuOpen);
    }
  };

  const handleLogoMenuItemClick = (action) => {
    setLogoMenuOpen(false);
    if (action === 'source') {
      window.open('https://github.com/LanwyWriteXU/Astra3DEngine', '_blank');
    } else {
      setInfoModalType(action);
      setInfoModalOpen(true);
    }
  };

  return (
    <>
      <div className={`toolbar ${isElectron ? 'toolbar-electron' : ''}`}>
        <div className="toolbar-left">
          <div className="toolbar-logo-wrapper" ref={logoMenuRef}>
            <button className="toolbar-logo-btn" onClick={handleLogoClick}>
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"
                  height="24" viewBox="0,0,69.99346,66.43688">
                  <g transform="translate(-205.00327,-146.78156)">
                      <g stroke="#000000" strokeWidth="0" strokeMiterlimit="10">
                          <path d="M274.99673,190.93032l-11.95866,22.28812h-44.44009l13.31277,-22.10459z"
                              fill="#0073bf" />
                          <path d="M216.31868,212.14198l-11.31541,-21.28864l24.21416,-0.00471z" fill="#66ccff" />
                          <path d="M227.50821,146.78156l23.50249,0.00667l23.98603,44.14209l-11.95866,22.28812z"
                              fill="#0099ff" />
                          <path d="M205.06042,188.54619l22.44779,-41.76463l23.50249,0.00667l-20.58917,41.73314z"
                              fill="#66ccff" />
                      </g>
                  </g>
              </svg>
            </button>
            {logoMenuOpen && (
              <div className="logo-dropdown-menu">
                <button className="logo-menu-item" onClick={() => handleLogoMenuItemClick('privacy')}>
                  {msg('logo.privacy')}
                </button>
                <button className="logo-menu-item" onClick={() => handleLogoMenuItemClick('source')}>
                  {msg('logo.source')}
                </button>
                <button className="logo-menu-item" onClick={() => handleLogoMenuItemClick('update')}>
                  {msg('logo.update')}
                </button>
                <button className="logo-menu-item" onClick={() => handleLogoMenuItemClick('about')}>
                  {msg('logo.about')}
                </button>
              </div>
            )}
          </div>
          <div className="toolbar-menus">
            <DropdownMenu 
              ref={fileMenuRef}
              label={msg('menu.file')} 
              items={fileMenuItems}
              roundedCorners="bottom"
            />
            <DropdownMenu 
              ref={editMenuRef}
              label={msg('menu.edit')} 
              items={editMenuItems}
              roundedCorners="bottom"
            />
            <DropdownMenu 
              ref={viewMenuRef}
              label={msg('menu.view')} 
              items={viewMenuItems}
              roundedCorners="bottom"
            />
            <DropdownMenu 
              ref={runMenuRef}
              label={msg('menu.run')} 
              items={runMenuItems}
              roundedCorners="bottom"
            />
          </div>
          {projectFileName && (
            <div className="toolbar-filename">
              <span className="filename-text">{projectFileName}</span>
            </div>
          )}
        </div>
        
        {isElectron && (
          <>
            <div className="toolbar-spacer"></div>
            <div className="toolbar-window-controls">
              <button className="window-control-btn minimize" onClick={handleMinimize} title="最小化">
                <IconWindowMinimize />
              </button>
              <button className="window-control-btn maximize" onClick={handleMaximize} title={isMaximized ? "还原" : "最大化"}>
                {isMaximized ? <IconWindowRestore /> : <IconWindowMaximize />}
              </button>
              <button className="window-control-btn close" onClick={handleClose} title="关闭">
                <IconWindowClose />
              </button>
            </div>
          </>
        )}
      </div>
      
      <InfoModal 
        isOpen={infoModalOpen} 
        onClose={() => setInfoModalOpen(false)} 
        type={infoModalType}
      />
    </>
  );
}

export default Toolbar;
