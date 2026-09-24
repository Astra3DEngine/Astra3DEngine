/**
 * @file stores/useWorkspaceTabsStore.js
 * @description 顶部编辑器 Tab：切换不同编辑器视图（预览 / 代码等），类似 Godot 的编辑器切换。
 * @module stores/useWorkspaceTabsStore
 */

import { create } from 'zustand';

const readActiveTab = () => {
  const saved = localStorage.getItem('astra-active-tab');
  return saved === 'code' || saved === 'preview' ? saved : 'preview';
};

export const WORKSPACE_TABS = [
  { id: 'preview', titleKey: 'tabs.preview' },
  { id: 'code', titleKey: 'tabs.code' },
];

export const useWorkspaceTabsStore = create((set) => ({
  activeTab: readActiveTab(),
  setActiveTab: (id) => {
    localStorage.setItem('astra-active-tab', id);
    set({ activeTab: id });
  },
}));
