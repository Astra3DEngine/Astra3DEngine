/**
 * @file components/Toolbar.jsx
 * @description 工具栏组件，提供菜单栏、文件操作和窗口控制
 * @module components/Toolbar
 *
 * 工具栏可以拖的，Electron 场景下也可拖动。
 */

import React, { useRef, useEffect, useState } from 'react';
import { msg, languages, getLocale } from '../i18n/index.js';
import DropdownMenu from './DropdownMenu.jsx';
import IconLogo from '../assets/icons/logo/logo.svg?react';
import InfoModal from './InfoModal.jsx';
import useDropdownMenu from '../hooks/useDropdownMenu.js';
import { modal as modalService } from '../lib/ModalManager.js';

import IconNewProject from '../assets/icons/editor/new-project.svg?react';
import IconOpenProject from '../assets/icons/editor/open-project.svg?react';
import IconSave from '../assets/icons/editor/save.svg?react';
import IconSaveAs from '../assets/icons/editor/save-as.svg?react';
import IconUndo from '../assets/icons/editor/undo.svg?react';
import IconRedo from '../assets/icons/editor/redo.svg?react';
import IconTheme from '../assets/icons/misc/theme.svg?react';
import IconLanguage from '../assets/icons/misc/language.svg?react';
import IconSettings from '../assets/icons/editor/settings.svg?react';
import IconPlay from '../assets/icons/viewport/play.svg?react';
import IconStop from '../assets/icons/viewport/stop.svg?react';
import IconImport from '../assets/icons/editor/import.svg?react';
import IconExport from '../assets/icons/editor/export.svg?react';
import IconSnapshot from '../assets/icons/editor/snapshot.svg?react';
import IconRecent from '../assets/icons/editor/recent.svg?react';

import IconWindowMinimize from '../assets/icons/window/window-minimize.svg?react';
import IconWindowMaximize from '../assets/icons/window/window-maximize.svg?react';
import IconWindowRestore from '../assets/icons/window/window-restore.svg?react';
import IconWindowClose from '../assets/icons/window/window-close.svg?react';

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
 * @param {Function} props.onExportAsAstra - 导出 ..astra 回调
 * @param {Function} props.onImportAstra - 导入 .astra 回调
 * @param {Function} props.onOpenSnapshots - 打开快照管理回调
 * @returns {JSX.Element} 工具栏组件
 */
function Toolbar({
  isPlaying,
  setIsPlaying,
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
}) {
  const fileMenuRef = useRef(null);
  const editMenuRef = useRef(null);
  const viewMenuRef = useRef(null);
  const runMenuRef = useRef(null);

  const [isMaximized, setIsMaximized] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const modal = modalService;

  const logoMenu = useDropdownMenu();

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
    const handleMenuShortcut = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        const key = e.key.toLowerCase();
        const allRefs = [fileMenuRef, editMenuRef, viewMenuRef, runMenuRef];

        if (key === 'f' || key === 'e' || key === 'v' || key === 'r') {
          e.preventDefault();
          allRefs.forEach((ref) => ref.current?.close());
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
      onClick: onNewProject,
    },
    {
      label: msg('menu.openProject'),
      icon: <IconOpenProject className="menu-icon" />,
      shortcut: 'Ctrl+O',
      onClick: onLoadProject,
    },
    {
      label: msg('menu.importAstra'),
      icon: <IconImport className="menu-icon" />,
      onClick: onImportAstra,
    },
    { divider: true },
    {
      label: msg('menu.saveProject'),
      icon: <IconSave className="menu-icon" />,
      shortcut: 'Ctrl+S',
      onClick: onSaveProject,
    },
    {
      label: msg('menu.saveAs'),
      icon: <IconSaveAs className="menu-icon" />,
      shortcut: 'Ctrl+Shift+S',
      onClick: onSaveAsProject,
    },
    {
      label: msg('menu.exportAstra'),
      icon: <IconExport className="menu-icon" />,
      onClick: onExportAsAstra,
    },
    { divider: true },
    {
      label: msg('menu.snapshots'),
      icon: <IconSnapshot className="menu-icon" />,
      onClick: onOpenSnapshots,
    },
    ...(recentProjects.length > 0
      ? [
          { divider: true },
          {
            label: msg('menu.recentProjects'),
            icon: <IconRecent className="menu-icon" />,
            submenu: recentProjects.slice(0, 5).map((project) => ({
              label: project.name,
              hint: new Date(project.lastOpened).toLocaleDateString(),
              onClick: () => onOpenRecentProject && onOpenRecentProject(project),
            })),
          },
        ]
      : []),
  ];

  const editMenuItems = [
    {
      label: msg('menu.undo'),
      icon: <IconUndo className="menu-icon" />,
      shortcut: 'Ctrl+Z',
      disabled: !canUndo,
      onClick: onUndo,
    },
    {
      label: msg('menu.redo'),
      icon: <IconRedo className="menu-icon" />,
      shortcut: 'Ctrl+Y',
      disabled: !canRedo,
      onClick: onRedo,
    },
  ];

  const viewMenuItems = [
    {
      label: theme === 'dark' ? msg('menu.lightMode') : msg('menu.darkMode'),
      icon: <IconTheme className="menu-icon" />,
      onClick: onToggleTheme,
    },
    {
      label: msg('menu.language'),
      icon: <IconLanguage className="menu-icon" />,
      submenu: languages.map((lang) => ({
        label: lang.nativeName,
        active: getLocale() === lang.code,
        onClick: () => onSetLocale(lang.code),
      })),
    },
    { divider: true },
    {
      label: msg('menu.preferences'),
      icon: <IconSettings className="menu-icon" />,
      onClick: onOpenPreferences,
    },
  ];

  const runMenuItems = [
    {
      label: isPlaying ? msg('toolbar.stop') : msg('toolbar.play'),
      icon: isPlaying ? <IconStop className="menu-icon" /> : <IconPlay className="menu-icon" />,
      shortcut: 'F5',
      onClick: () => setIsPlaying(!isPlaying),
    },
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
      if (logoMenu.isOpen) {
        logoMenu.close();
      } else {
        const rect = e.currentTarget.getBoundingClientRect();
        logoMenu.openAt(rect.left, rect.bottom);
      }
    }
  };

  const handleLogoMenuItemClick = (action) => {
    logoMenu.close();
    if (action === 'source') {
      window.open('https://github.com/LanwyWriteXU/Astra3DEngine', '_blank');
    } else {
      modal.open(InfoModal, { type: action });
    }
  };

  const logoMenuItems = [
    { label: msg('logo.privacy'), onClick: () => handleLogoMenuItemClick('privacy') },
    { label: msg('logo.source'), onClick: () => handleLogoMenuItemClick('source') },
    { label: msg('logo.update'), onClick: () => handleLogoMenuItemClick('update') },
    { label: msg('logo.about'), onClick: () => handleLogoMenuItemClick('about') },
  ];

  return (
    <>
      <div className={`toolbar ${isElectron ? 'toolbar-electron' : ''}`}>
        <div className="toolbar-left">
          <div className="toolbar-logo-wrapper">
            <button
              className="toolbar-logo-btn"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleLogoClick}
            >
              <IconLogo className="toolbar-logo" />
            </button>
            <DropdownMenu
              isOpen={logoMenu.isOpen}
              onClose={logoMenu.close}
              position={logoMenu.position}
              menuRef={logoMenu.menuRef}
              roundedCorners="all"
              items={logoMenuItems}
            />
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
              <button
                className="window-control-btn minimize"
                onClick={handleMinimize}
                title="最小化"
              >
                <IconWindowMinimize />
              </button>
              <button
                className="window-control-btn maximize"
                onClick={handleMaximize}
                title={isMaximized ? '还原' : '最大化'}
              >
                {isMaximized ? <IconWindowRestore /> : <IconWindowMaximize />}
              </button>
              <button className="window-control-btn close" onClick={handleClose} title="关闭">
                <IconWindowClose />
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default Toolbar;
