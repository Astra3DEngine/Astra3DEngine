/**
 * @file stores/useProjectStore.js
 * @description 项目状态：文件名、未保存标记、自动保存与快照上限。
 * @module stores/useProjectStore
 */

import { create } from 'zustand';
import { Settings } from '../settings/settingsRegistry.js';

export const useProjectStore = create((set) => ({
  projectFileName: null,
  hasUnsavedChanges: false,
  autoSaveEnabled: Settings.get('autosaveEnabled') ?? true,
  maxSnapshots: Settings.get('maxSnapshots') ?? 10,

  setProjectFileName: (name) => set({ projectFileName: name }),
  setHasUnsavedChanges: (v) => set({ hasUnsavedChanges: v }),

  toggleAutoSave: () => {
    set((state) => {
      const next = !state.autoSaveEnabled;
      Settings.set('autosaveEnabled', next);
      return { autoSaveEnabled: next };
    });
  },

  setMaxSnapshots: (value) => {
    const clamped = Math.max(1, Math.min(50, value));
    Settings.set('maxSnapshots', clamped);
    set({ maxSnapshots: clamped });
  },

  resetProject: () => {
    set({ projectFileName: null, hasUnsavedChanges: false });
  },
}));
