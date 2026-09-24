/**
 * @file stores/useDockStore.js
 * @description 可停靠面板状态：记录每个 dock 面板归属区（bottom / sidebar），支持拖拽移动。
 * @module stores/useDockStore
 */

import { create } from 'zustand';

const readZone = (id) => {
  const saved = localStorage.getItem(`astra-dock-${id}-zone`);
  return saved === 'sidebar' || saved === 'bottom' ? saved : 'bottom';
};

export const useDockStore = create((set) => ({
  /** 面板 id -> { zone }；zone: 'bottom' | 'sidebar' */
  panels: {
    assets: { zone: readZone('assets') },
    terminal: { zone: readZone('terminal') },
  },

  /** 移动面板到指定停靠区 */
  movePanel: (id, zone) => {
    localStorage.setItem(`astra-dock-${id}-zone`, zone);
    set((s) => ({ panels: { ...s.panels, [id]: { zone } } }));
  },

  /** 底部当前激活的面板 id */
  activeBottomTab: 'assets',
  setActiveBottomTab: (id) => set({ activeBottomTab: id }),
}));
