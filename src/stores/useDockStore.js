/**
 * @file stores/useDockStore.js
 * @description 可停靠面板状态：层级/场景/预制件/资源/终端 均可在 左(left)/下(bottom) 两区停靠，
 * 支持拖拽移动。右区由属性面板（Inspector）专用。
 * @module stores/useDockStore
 */

import { create } from 'zustand';
import { readRawLocalStorage, writeRawLocalStorage } from '../utils/localstorage.js';

/** 全部可停靠面板 id */
export const ALL_DOCK_PANELS = ['hierarchy', 'scene', 'prefabs', 'assets', 'terminal'];

/** 左侧固定视图默认停在 left，资源/终端默认在 bottom */
const DEFAULT_ZONE = {
  hierarchy: 'left',
  scene: 'left',
  prefabs: 'left',
  assets: 'bottom',
  terminal: 'bottom',
};

const readZone = (id) => {
  const saved = readRawLocalStorage(`astra-dock-${id}-zone`, null);
  if (saved === 'left' || saved === 'bottom' || saved === 'right') return saved;
  // 兼容旧值 'sidebar'（视为 left）
  if (saved === 'sidebar') return 'left';
  return DEFAULT_ZONE[id] || 'bottom';
};

export const useDockStore = create((set) => {
  const panels = {};
  for (const id of ALL_DOCK_PANELS) {
    panels[id] = { zone: readZone(id) };
  }
  return {
    /** 面板 id -> { zone: 'left' | 'bottom' | 'right' } */
    panels,

    /** 移动面板到指定停靠区 */
    movePanel: (id, zone) => {
      writeRawLocalStorage(`astra-dock-${id}-zone`, zone);
      set((s) => ({ panels: { ...s.panels, [id]: { zone } } }));
    },

    /** 底部当前激活的面板 id */
    activeBottomTab: 'assets',
    setActiveBottomTab: (id) => set({ activeBottomTab: id }),
  };
});
