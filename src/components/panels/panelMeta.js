/**
 * @file components/panels/panelMeta.js
 * @description 全部可停靠面板的元信息（图标/标题/内容组件），供 ActivityBar / Sidebar / Dock 共用。
 * Component 由 App 装配时注入。
 * @module components/panels/panelMeta
 */

import { SIDEBAR_VIEWS } from '../sidebar/sidebarViews.js';
import { DOCK_PANELS } from '../dock/dockPanels.js';

/**
 * 合并全部面板：固定视图（层级/场景/预制件）+ dock 面板（资源/终端）。
 * @type {Record<string, {id:string, icon:React.ComponentType, titleKey:string, Component:React.ComponentType|null}>}
 */
export const PANEL_META = { ...SIDEBAR_VIEWS, ...DOCK_PANELS };