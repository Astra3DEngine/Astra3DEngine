/**
 * @file components/Toolbar.jsx
 * @description 工具栏组件，提供菜单栏、文件操作和窗口控制
 * @module components/Toolbar
 *
 * 工具栏可以拖的，Electron 场景下也可拖动。
 */

import React, { useRef, useEffect, useState } from 'react';
import { msg } from '../i18n/index.js';
import DropdownMenu from './DropdownMenu.jsx';
import WindowControls from './toolbar/WindowControls.jsx';
import IconLogo from '../assets/icons/logo/logo.svg?react';
import InfoModal from './InfoModal.jsx';
import useDropdownMenu from '../hooks/useDropdownMenu.js';
import { modal as modalService } from '../lib/ModalManager.js';
import { shortcuts, formatShortcutDisplay } from '../lib/ShortcutManager.js';
import {
  buildFileMenuItems,
  buildEditMenuItems,
  buildViewMenuItems,
  buildRunMenuItems,
  buildLogoMenuItems,
} from './toolbar/menuItems.jsx';

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

  // 订阅快捷键绑定变化，让菜单项快捷键提示跟随热设置
  const [, setShortcutTick] = useState(0);
  useEffect(() => shortcuts.subscribe(() => setShortcutTick((t) => t + 1)), []);
  const shortcutOf = (id) => formatShortcutDisplay(shortcuts.getBinding(id));

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

  const fileMenuItems = buildFileMenuItems({
    onNewProject,
    onLoadProject,
    onImportAstra,
    onSaveProject,
    onSaveAsProject,
    onExportAsAstra,
    onOpenSnapshots,
    recentProjects,
    onOpenRecentProject,
    shortcutOf,
  });

  const editMenuItems = buildEditMenuItems({ canUndo, canRedo, onUndo, onRedo, shortcutOf });

  const viewMenuItems = buildViewMenuItems({
    theme,
    onToggleTheme,
    onSetLocale,
    onOpenPreferences,
    shortcutOf,
  });

  const runMenuItems = buildRunMenuItems({ isPlaying, setIsPlaying, shortcutOf });

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

  // 若任一菜单已打开，鼠标移到其他菜单项时自动切换展开
  const menuRefs = [fileMenuRef, editMenuRef, viewMenuRef, runMenuRef];
  const handleMenuHover = (targetRef) => {
    const anyOpen = menuRefs.some((ref) => ref.current?.isOpen());
    if (!anyOpen) return;
    menuRefs.forEach((ref) => ref.current?.close());
    targetRef.current?.open();
  };

  const handleLogoMenuItemClick = (action) => {
    logoMenu.close();
    if (action === 'source') {
      window.open('https://github.com/LanwyWriteXU/Astra3DEngine', '_blank');
    } else {
      modal.open(InfoModal, { type: action });
    }
  };

  const logoMenuItems = buildLogoMenuItems({ onItemClick: handleLogoMenuItemClick });

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
              onMouseEnter={() => handleMenuHover(fileMenuRef)}
            />
            <DropdownMenu
              ref={editMenuRef}
              label={msg('menu.edit')}
              items={editMenuItems}
              roundedCorners="bottom"
              onMouseEnter={() => handleMenuHover(editMenuRef)}
            />
            <DropdownMenu
              ref={viewMenuRef}
              label={msg('menu.view')}
              items={viewMenuItems}
              roundedCorners="bottom"
              onMouseEnter={() => handleMenuHover(viewMenuRef)}
            />
            <DropdownMenu
              ref={runMenuRef}
              label={msg('menu.run')}
              items={runMenuItems}
              roundedCorners="bottom"
              onMouseEnter={() => handleMenuHover(runMenuRef)}
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
            <WindowControls
              isMaximized={isMaximized}
              onMinimize={handleMinimize}
              onMaximize={handleMaximize}
              onClose={handleClose}
            />
          </>
        )}
      </div>
    </>
  );
}

export default Toolbar;
