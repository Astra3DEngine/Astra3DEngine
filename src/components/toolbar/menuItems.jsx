/**
 * @file components/toolbar/menuItems.js
 * @description 工具栏菜单项定义（文件/编辑/视图/运行），接收状态与回调生成 items 数组。
 * @module components/toolbar/menuItems
 */

import { msg, languages, getLocale } from '../../i18n/index.js';
import IconNewProject from '../../assets/icons/editor/new-project.svg?react';
import IconOpenProject from '../../assets/icons/editor/open-project.svg?react';
import IconSave from '../../assets/icons/editor/save.svg?react';
import IconSaveAs from '../../assets/icons/editor/save-as.svg?react';
import IconUndo from '../../assets/icons/editor/undo.svg?react';
import IconRedo from '../../assets/icons/editor/redo.svg?react';
import IconTheme from '../../assets/icons/misc/theme.svg?react';
import IconLanguage from '../../assets/icons/misc/language.svg?react';
import IconSettings from '../../assets/icons/editor/settings.svg?react';
import IconPlay from '../../assets/icons/viewport/play.svg?react';
import IconStop from '../../assets/icons/viewport/stop.svg?react';
import IconImport from '../../assets/icons/editor/import.svg?react';
import IconExport from '../../assets/icons/editor/export.svg?react';
import IconSnapshot from '../../assets/icons/editor/snapshot.svg?react';
import IconRecent from '../../assets/icons/editor/recent.svg?react';

/** 构建文件菜单项 */
export function buildFileMenuItems({
  onNewProject,
  onLoadProject,
  onImportAstra,
  onSaveProject,
  onSaveAsProject,
  onExportAsAstra,
  onOpenSnapshots,
  recentProjects = [],
  onOpenRecentProject,
  shortcutOf,
}) {
  return [
    {
      label: msg('menu.newProject'),
      icon: <IconNewProject className="menu-icon" />,
      shortcut: shortcutOf('file.new'),
      onClick: onNewProject,
    },
    {
      label: msg('menu.openProject'),
      icon: <IconOpenProject className="menu-icon" />,
      shortcut: shortcutOf('file.open'),
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
      shortcut: shortcutOf('file.save'),
      onClick: onSaveProject,
    },
    {
      label: msg('menu.saveAs'),
      icon: <IconSaveAs className="menu-icon" />,
      shortcut: shortcutOf('file.saveAs'),
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
}

/** 构建编辑菜单项 */
export function buildEditMenuItems({ canUndo, canRedo, onUndo, onRedo, shortcutOf }) {
  return [
    {
      label: msg('menu.undo'),
      icon: <IconUndo className="menu-icon" />,
      shortcut: shortcutOf('edit.undo'),
      disabled: !canUndo,
      onClick: onUndo,
    },
    {
      label: msg('menu.redo'),
      icon: <IconRedo className="menu-icon" />,
      shortcut: shortcutOf('edit.redo'),
      disabled: !canRedo,
      onClick: onRedo,
    },
  ];
}

/** 构建视图菜单项 */
export function buildViewMenuItems({
  theme,
  onToggleTheme,
  onSetLocale,
  onOpenPreferences,
  shortcutOf,
}) {
  return [
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
      shortcut: shortcutOf('preferences.open'),
      onClick: onOpenPreferences,
    },
  ];
}

/** 构建运行菜单项 */
export function buildRunMenuItems({ isPlaying, setIsPlaying, shortcutOf }) {
  return [
    {
      label: isPlaying ? msg('toolbar.stop') : msg('toolbar.play'),
      icon: isPlaying ? <IconStop className="menu-icon" /> : <IconPlay className="menu-icon" />,
      shortcut: shortcutOf('view.togglePlay'),
      onClick: () => setIsPlaying(!isPlaying),
    },
  ];
}

/** 构建 Logo 菜单项 */
export function buildLogoMenuItems({ onItemClick }) {
  return [
    { label: msg('logo.privacy'), onClick: () => onItemClick('privacy') },
    { label: msg('logo.source'), onClick: () => onItemClick('source') },
    { label: msg('logo.update'), onClick: () => onItemClick('update') },
    { label: msg('logo.about'), onClick: () => onItemClick('about') },
  ];
}
