/**
 * @file stores/useUIStore.js
 * @description 界面布局状态：侧栏活动视图、侧栏/底栏折叠。
 * @module stores/useUIStore
 */

import { create } from 'zustand';

const readBool = (key, fallback = false) => {
  const saved = localStorage.getItem(key);
  return saved === null ? fallback : saved === 'true';
};

/** 侧栏当前活动视图（VSCode 活动栏模型；含 dock 面板 id：assets/terminal） */
const readSidebarView = () => {
  const saved = localStorage.getItem('astra-sidebar-view');
  return ['scene', 'prefabs', 'hierarchy', 'assets', 'terminal'].includes(saved)
    ? saved
    : 'hierarchy';
};

export const useUIStore = create((set) => ({
  activeSidebarView: readSidebarView(),
  sidebarCollapsed: readBool('astra-sidebar-collapsed', false),
  isAssetsPanelCollapsed: readBool('astra-panel-assets-collapsed', false),

  setActiveSidebarView: (view) => {
    localStorage.setItem('astra-sidebar-view', view);
    set({ activeSidebarView: view });
  },
  setSidebarCollapsed: (collapsed) => {
    localStorage.setItem('astra-sidebar-collapsed', String(collapsed));
    set({ sidebarCollapsed: collapsed });
  },
  setAssetsPanelCollapsed: (v) => {
    localStorage.setItem('astra-panel-assets-collapsed', String(v));
    set({ isAssetsPanelCollapsed: v });
  },
}));
