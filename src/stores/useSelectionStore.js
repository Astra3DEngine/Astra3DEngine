/**
 * @file stores/useSelectionStore.js
 * @description 选中态 store：单选/多选对象与剪贴板引用。
 * 取代 App.jsx 中 selectedObject + selectedObjects 双 state 与 setTimeout hack，
 * 维持原有交互语义的前提下统一管理。
 * @module stores/useSelectionStore
 */

import { create } from 'zustand';

export const useSelectionStore = create((set, get) => ({
  selectedObject: null,
  selectedObjects: [],

  /**
   * 选择对象（支持多选）。
   * @param {Object|null} object - 目标对象
   * @param {boolean} [isMultiSelect=false] - 是否多选模式（Ctrl 点击）
   * @param {Object[]} [objectsToSelect] - 一次性选中列表（文件夹全选等）
   */
  selectObject: (object, isMultiSelect = false, objectsToSelect = null) => {
    if (!object) return;

    if (objectsToSelect) {
      if (isMultiSelect) {
        set((state) => {
          const allIds = new Set(objectsToSelect.map((o) => o.id));
          const isAlreadySelected = state.selectedObjects.some((o) => o && allIds.has(o.id));
          if (isAlreadySelected) {
            const newSelection = state.selectedObjects.filter((o) => o && !allIds.has(o.id));
            return { selectedObjects: newSelection, selectedObject: newSelection[0] || null };
          }
          return {
            selectedObjects: [...state.selectedObjects, ...objectsToSelect],
            selectedObject: object,
          };
        });
      } else {
        set({ selectedObject: object, selectedObjects: objectsToSelect });
      }
      return;
    }

    if (isMultiSelect) {
      set((state) => {
        const isSelected = state.selectedObjects.some((o) => o && o.id === object.id);
        if (isSelected) {
          const newSelection = state.selectedObjects.filter((o) => o && o.id !== object.id);
          return { selectedObjects: newSelection, selectedObject: newSelection[0] || null };
        }
        return { selectedObjects: [...state.selectedObjects, object], selectedObject: object };
      });
    } else {
      set({ selectedObject: object, selectedObjects: [object] });
    }
  },

  /** 整体替换选中态（添加/粘贴/复制等操作后使用） */
  replaceSelection: (object, objects) => {
    set({ selectedObject: object, selectedObjects: objects });
  },

  /** 更新当前单选对象字段（对象更新后保持选中态一致） */
  updateSelectedObject: (updates) => {
    const { selectedObject } = get();
    if (selectedObject) {
      set({ selectedObject: { ...selectedObject, ...updates } });
    }
  },

  /** 重命名后同步选中态 */
  renameSelectedObject: (id, newName) => {
    const { selectedObject } = get();
    if (selectedObject && selectedObject.id === id) {
      set({ selectedObject: { ...selectedObject, name: newName } });
    }
  },

  /** 删除时从选中态移除 */
  removeFromSelection: (ids) => {
    set((state) => {
      const idSet = new Set(ids);
      const selectedObject =
        state.selectedObject && idSet.has(state.selectedObject.id) ? null : state.selectedObject;
      const selectedObjects = state.selectedObjects.filter((o) => o && !idSet.has(o.id));
      return { selectedObject, selectedObjects };
    });
  },

  clearSelection: () => {
    set({ selectedObject: null, selectedObjects: [] });
  },
}));
