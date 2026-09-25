/**
 * @file stores/useBottomPanelStore.js
 * @description 底部面板状态：收起/高度跨模块共享（BottomPanel 渲染 + 状态栏手柄触发展开）。
 * @module stores/useBottomPanelStore
 */

import { create } from 'zustand';

const DEFAULT_HEIGHT = 100;
const MIN_HEIGHT = 60;
const MAX_HEIGHT = 400;
/** 高度 ≤ 该值视为收起 */
const HIDE_THRESHOLD = 40;
const STORAGE_KEY = 'astra-bottom-panel-height';
const COLLAPSED_KEY = 'astra-bottom-panel-collapsed';

const readHeight = () => {
  const v = parseInt(localStorage.getItem(STORAGE_KEY) || '', 10);
  return Number.isFinite(v) ? Math.max(MIN_HEIGHT, Math.min(v, MAX_HEIGHT)) : DEFAULT_HEIGHT;
};

/** 首次打开默认折叠；此后记住用户选择 */
const readCollapsed = () => {
  const v = localStorage.getItem(COLLAPSED_KEY);
  return v === null ? true : v === '1';
};

export const useBottomPanelStore = create((set, get) => ({
  collapsed: readCollapsed(),
  height: readHeight(),

  /** 设置面板高度；≤ 阈值则收起 */
  setHeight: (h) => {
    if (h <= HIDE_THRESHOLD) {
      set({ collapsed: true });
      return;
    }
    const clamped = Math.max(MIN_HEIGHT, Math.min(h, MAX_HEIGHT));
    localStorage.setItem(STORAGE_KEY, String(clamped));
    localStorage.setItem(COLLAPSED_KEY, '0');
    set({ height: clamped, collapsed: false });
  },

  /** 收起 */
  collapse: () => {
    localStorage.setItem(COLLAPSED_KEY, '1');
    set({ collapsed: true });
  },

  /** 展开（恢复上次高度） */
  expand: () => {
    const h = get().height < MIN_HEIGHT ? MIN_HEIGHT : get().height;
    localStorage.setItem(COLLAPSED_KEY, '0');
    set({ collapsed: false, height: h });
  },
}));
