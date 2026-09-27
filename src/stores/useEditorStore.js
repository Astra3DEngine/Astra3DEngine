/**
 * @file stores/useEditorStore.js
 * @description 编辑器全局状态：当前工具、播放态、光渲染开关。
 * @module stores/useEditorStore
 */

import { create } from 'zustand';

export const useEditorStore = create((set) => ({
  currentTool: 'select',
  isPlaying: false,
  lightRenderingEnabled: false,

  setCurrentTool: (tool) => set({ currentTool: tool }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setLightRenderingEnabled: (lightRenderingEnabled) => set({ lightRenderingEnabled }),
}));
