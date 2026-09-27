/**
 * @file components/dock/dockPanels.js
 * @description 可停靠面板注册表：底部/侧栏共用的 dock 面板。
 * 组件通过 registerDockPanels 在 App 装配时注入，避免循环依赖。
 * @module components/dock/dockPanels
 */

import IconImage from '../../assets/icons/misc/image.svg?react';
import IconCode from '../../assets/icons/misc/code.svg?react';

/** @type {Record<string, {id:string, icon:React.ComponentType, titleKey:string, Component:React.ComponentType|null}>} */
export const DOCK_PANELS = {
  assets: { id: 'assets', icon: IconImage, titleKey: 'assets.title', Component: null },
  terminal: { id: 'terminal', icon: IconCode, titleKey: 'dock.terminal', Component: null },
};

export function registerDockPanels(views) {
  for (const [id, def] of Object.entries(views)) {
    if (DOCK_PANELS[id]) DOCK_PANELS[id].Component = def;
  }
}
