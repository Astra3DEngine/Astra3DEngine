/**
 * @file stores/useUIStore.js
 * @description 界面布局状态：各面板折叠、场景/预制件高度占比。
 * 取代 App.jsx 中 ~12 处惰性初始化 localStorage 的 useState。
 * @module stores/useUIStore
 */

import { create } from 'zustand';

const readBool = (key) => localStorage.getItem(key) === 'true';
const readFloat = (key, fallback) => {
  const saved = localStorage.getItem(key);
  return saved ? parseFloat(saved) : fallback;
};

export const useUIStore = create((set) => ({
  isAssetsPanelCollapsed: readBool('astra-panel-assets-collapsed'),
  hierarchyCollapsed: readBool('astra-panel-hierarchy-collapsed'),
  scenePanelCollapsed: readBool('astra-panel-scene-collapsed'),
  prefabsCollapsed: readBool('astra-panel-prefabs-collapsed'),
  scenePanelRatio: readFloat('astra-scene-panel-ratio', 0.15),
  prefabsPanelRatio: readFloat('astra-prefabs-panel-ratio', 0.2),

  setAssetsPanelCollapsed: (v) => {
    localStorage.setItem('astra-panel-assets-collapsed', String(v));
    set({ isAssetsPanelCollapsed: v });
  },
  setHierarchyCollapsed: (v) => {
    localStorage.setItem('astra-panel-hierarchy-collapsed', String(v));
    set({ hierarchyCollapsed: v });
  },
  setScenePanelCollapsed: (v) => {
    localStorage.setItem('astra-panel-scene-collapsed', String(v));
    set({ scenePanelCollapsed: v });
  },
  setPrefabsCollapsed: (v) => {
    localStorage.setItem('astra-panel-prefabs-collapsed', String(v));
    set({ prefabsCollapsed: v });
  },
  setScenePanelRatio: (ratio) => {
    localStorage.setItem('astra-scene-panel-ratio', String(ratio));
    set({ scenePanelRatio: ratio });
  },
  setPrefabsPanelRatio: (ratio) => {
    localStorage.setItem('astra-prefabs-panel-ratio', String(ratio));
    set({ prefabsPanelRatio: ratio });
  },
}));
