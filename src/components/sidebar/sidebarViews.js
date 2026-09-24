/**
 * @file components/sidebar/sidebarViews.js
 * @description 侧栏视图注册表：VSCode 活动栏模型。
 * 每个条目 = 一个图标 + 标题 + 面板组件。
 * @module components/sidebar/sidebarViews
 */

import IconList from '../../assets/icons/tools/list.svg?react';
import IconScene from '../../assets/icons/tools/scene.svg?react';
import IconPrefab from '../../assets/icons/tools/prefab.svg?react';

/**
 * @typedef {Object} SidebarViewDef
 * @property {string} id
 * @property {React.ComponentType} icon - 活动栏图标
 * @property {string} titleKey - 面板标题 i18n key
 * @property {React.ComponentType} Component - 面板内容组件
 */

/** @type {Record<string, SidebarViewDef>} */
export const SIDEBAR_VIEWS = {
  hierarchy: {
    id: 'hierarchy',
    icon: IconList,
    titleKey: 'hierarchy.title',
    Component: null, // 运行时注入，避免循环依赖
  },
  scene: {
    id: 'scene',
    icon: IconScene,
    titleKey: 'scene.panelTitle',
    Component: null,
  },
  prefabs: {
    id: 'prefabs',
    icon: IconPrefab,
    titleKey: 'prefabs.title',
    Component: null,
  },
};

/** 在 App 装配时注入组件，避免循环 import */
export function registerSidebarViews(views) {
  for (const [id, def] of Object.entries(views)) {
    if (SIDEBAR_VIEWS[id]) SIDEBAR_VIEWS[id].Component = def;
  }
}
