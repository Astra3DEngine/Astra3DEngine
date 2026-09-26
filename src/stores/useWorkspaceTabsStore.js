/**
 * @file stores/useWorkspaceTabsStore.js
 * @description 顶部编辑器 Tab：切换不同编辑器视图（预览 / 代码等），类似 Godot 的编辑器切换。
 * @module stores/useWorkspaceTabsStore
 */

import { create } from 'zustand';
import { readRawLocalStorage, writeRawLocalStorage } from '../utils/localstorage.js';

const readActiveTab = () => {
  const saved = readRawLocalStorage('astra-active-tab', null);
  return saved === 'code' || saved === 'preview' ? saved : 'preview';
};

export const WORKSPACE_TABS = [
  { id: 'preview', titleKey: 'tabs.preview' },
  { id: 'code', titleKey: 'tabs.code' },
];

export const useWorkspaceTabsStore = create((set) => ({
  activeTab: readActiveTab(),
  setActiveTab: (id) => {
    writeRawLocalStorage('astra-active-tab', id);
    set({ activeTab: id });
  },
}));
