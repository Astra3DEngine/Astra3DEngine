/**
 * @file stores/useScenesStore.js
 * @description 场景状态 store：多场景数组、当前场景、撤销/重做历史，以及全部对象 CRUD。
 * 取代 App.jsx 中散落的状态与处理函数，作为唯一状态源。
 * @module stores/useScenesStore
 */

import { create } from 'zustand';
import { createObject } from '../engine/ObjectFactory.js';
import { generateUniqueName } from '../utils/names.js';
import { createHistorySlice } from './history.js';
import { useSelectionStore } from './useSelectionStore.js';

/** 默认场景模板 */
export function createDefaultScene(overrides = {}) {
  return {
    id: 'scene-main-001',
    name: 'Main Scene',
    objects: [],
    isMain: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {
      ambientLight: { color: '#ffffff', intensity: 0.5 },
      backgroundColor: '#1a1a2e',
      fog: { enabled: false },
    },
    ...overrides,
  };
}

/** 获取当前场景的对象数组 */
function currentObjects(state) {
  return state.scenes.find((s) => s.id === state.currentSceneId)?.objects || [];
}

export const useScenesStore = create((set, get) => ({
  scenes: [createDefaultScene()],
  currentSceneId: 'scene-main-001',
  clipboard: null,
  ...createHistorySlice(set, get, [createDefaultScene()], 'scenes'),

  getCurrentScene: () => get().scenes.find((s) => s.id === get().currentSceneId) || get().scenes[0],
  getCurrentObjects: () => currentObjects(get()),

  /**
   * 更新当前场景对象数组（可记录历史）。
   * @param {Object[]|Function} newObjects - 新对象数组或更新函数
   * @param {boolean} [recordHistory=true]
   */
  updateCurrentSceneObjects: (newObjects, recordHistory = true) => {
    const now = new Date().toISOString();
    get().setState(
      (prev) =>
        prev.map((s) =>
          s.id === get().currentSceneId ? { ...s, objects: newObjects, updatedAt: now } : s
        ),
      recordHistory
    );
  },

  // ===== 场景 CRUD =====
  switchScene: (sceneId) => {
    if (sceneId === get().currentSceneId) return;
    set({ currentSceneId: sceneId });
    useSelectionStore.getState().clearSelection();
  },

  createScene: () => {
    const sceneCount = get().scenes.length;
    const newScene = createDefaultScene({
      id: `scene-${Date.now()}`,
      name: `Scene ${sceneCount + 1}`,
      isMain: false,
    });
    get().setState((prev) => [...prev, newScene]);
    set({ currentSceneId: newScene.id });
    useSelectionStore.getState().clearSelection();
  },

  deleteScene: (sceneId) => {
    const { scenes, currentSceneId } = get();
    if (scenes.length <= 1) return;
    const sceneToDelete = scenes.find((s) => s.id === sceneId);
    if (sceneToDelete?.isMain) return;

    get().setState((prev) => prev.filter((s) => s.id !== sceneId));
    if (sceneId === currentSceneId) {
      const mainScene = scenes.find((s) => s.isMain && s.id !== sceneId);
      const firstScene = scenes.find((s) => s.id !== sceneId);
      set({ currentSceneId: mainScene?.id || firstScene?.id });
      useSelectionStore.getState().clearSelection();
    }
  },

  renameScene: (sceneId, newName) => {
    const now = new Date().toISOString();
    get().setState((prev) =>
      prev.map((s) => (s.id === sceneId ? { ...s, name: newName, updatedAt: now } : s))
    );
  },

  setMainScene: (sceneId) => {
    get().setState((prev) =>
      prev.map((s) => (s.id === sceneId ? { ...s, isMain: true } : { ...s, isMain: false }))
    );
  },

  updateSceneSettings: (newSettings) => {
    const now = new Date().toISOString();
    get().setState((prev) =>
      prev.map((s) =>
        s.id === get().currentSceneId ? { ...s, settings: newSettings, updatedAt: now } : s
      )
    );
  },

  // ===== 对象 CRUD =====
  addObject: (type, asset = null) => {
    const objects = currentObjects(get());
    const id = Date.now();

    let baseName;
    if (type === 'folder') baseName = 'Folder';
    else if (type === 'pointLight') baseName = 'Point Light';
    else if (type === 'directionalLight') baseName = 'Directional Light';
    else if (type === 'spotLight') baseName = 'Spot Light';
    else if (asset && (asset.type === 'gltf' || asset.type === 'glb' || asset.type === 'obj')) {
      baseName = asset.name.replace(/\.[^.]+$/, '');
    } else {
      baseName = type.charAt(0).toUpperCase() + type.slice(1);
    }

    const name = generateUniqueName(baseName, objects);
    const newObject = createObject(id, name, type, asset);

    useSelectionStore.getState().replaceSelection(newObject, [newObject]);
    get().updateCurrentSceneObjects([...objects, newObject]);
  },

  deleteObject: (id) => {
    const now = new Date().toISOString();
    get().setState((prev) =>
      prev.map((s) =>
        s.id === get().currentSceneId
          ? { ...s, objects: s.objects.filter((obj) => obj.id !== id), updatedAt: now }
          : s
      )
    );
    useSelectionStore.getState().removeFromSelection([id]);
  },

  deleteSelectedObjects: () => {
    const { selectedObjects } = useSelectionStore.getState();
    if (selectedObjects.length === 0) return;
    const idsToDelete = selectedObjects.filter((o) => o).map((o) => o.id);
    const now = new Date().toISOString();
    get().setState((prev) =>
      prev.map((s) =>
        s.id === get().currentSceneId
          ? {
              ...s,
              objects: s.objects.filter((obj) => !idsToDelete.includes(obj.id)),
              updatedAt: now,
            }
          : s
      )
    );
    useSelectionStore.getState().clearSelection();
  },

  updateObject: (id, updates, recordHistory = true) => {
    const now = new Date().toISOString();
    get().setState(
      (prev) =>
        prev.map((s) =>
          s.id === get().currentSceneId
            ? {
                ...s,
                objects: s.objects.map((obj) => (obj.id === id ? { ...obj, ...updates } : obj)),
                updatedAt: now,
              }
            : s
        ),
      recordHistory
    );
    const { selectedObject } = useSelectionStore.getState();
    if (selectedObject && selectedObject.id === id) {
      useSelectionStore.getState().updateSelectedObject({ ...updates });
    }
  },

  renameObject: (id, newName) => {
    const objects = currentObjects(get());
    const uniqueName = generateUniqueName(newName, objects, id);
    get().updateCurrentSceneObjects(
      objects.map((obj) => (obj.id === id ? { ...obj, name: uniqueName } : obj)),
      true
    );
    useSelectionStore.getState().renameSelectedObject(id, uniqueName);
  },

  reorderObjects: (draggedId, targetId, position) => {
    const objects = [...currentObjects(get())];

    const draggedIndex = objects.findIndex((o) => o.id === draggedId);
    if (draggedIndex === -1) return;
    const draggedObj = { ...objects[draggedIndex] };

    const getAllDescendantIds = (parentId) => {
      const descendants = new Set([parentId]);
      objects
        .filter((o) => o.parentId === parentId)
        .forEach((child) => {
          getAllDescendantIds(child.id).forEach((id) => descendants.add(id));
        });
      return descendants;
    };

    const draggedDescendants = getAllDescendantIds(draggedId);

    if (targetId === null) {
      draggedObj.parentId = null;
      objects.splice(draggedIndex, 1);
      objects.push(draggedObj);
      get().updateCurrentSceneObjects(objects);
      return;
    }

    if (draggedDescendants.has(targetId)) return;

    const targetIndex = objects.findIndex((o) => o.id === targetId);
    if (targetIndex === -1) return;
    const targetObj = objects[targetIndex];

    if (position === 'inside') {
      draggedObj.parentId = targetId;
    } else {
      draggedObj.parentId = targetObj.parentId || null;
    }

    objects.splice(draggedIndex, 1);

    const newTargetIndex = objects.findIndex((o) => o.id === targetId);
    if (newTargetIndex === -1) {
      objects.push(draggedObj);
      get().updateCurrentSceneObjects(objects);
      return;
    }

    let insertIndex;
    if (position === 'inside') {
      insertIndex = newTargetIndex + 1;
      for (let i = newTargetIndex + 1; i < objects.length; i++) {
        if (objects[i].parentId === targetId) insertIndex = i + 1;
        else break;
      }
    } else if (position === 'before') {
      insertIndex = newTargetIndex;
    } else {
      insertIndex = newTargetIndex + 1;
      const targetParentId = targetObj.parentId;
      if (targetParentId) {
        for (let i = newTargetIndex + 1; i < objects.length; i++) {
          if (objects[i].parentId === targetParentId) insertIndex = i + 1;
          else break;
        }
      }
    }

    objects.splice(insertIndex, 0, draggedObj);
    get().updateCurrentSceneObjects(objects);
  },

  // ===== 剪贴板 =====
  copyObject: (id) => {
    const { selectedObjects } = useSelectionStore.getState();
    const objects = currentObjects(get());

    if (selectedObjects && selectedObjects.length > 1) {
      const objectsToCopy = selectedObjects.map((obj) => ({ ...obj }));
      set({ clipboard: { type: 'multi', objects: objectsToCopy } });
    } else {
      const obj = objects.find((o) => o.id === id);
      if (obj) {
        set({ clipboard: { type: 'single', object: { ...obj } } });
      }
    }
  },

  pasteObject: () => {
    const clipboard = get().clipboard;
    if (!clipboard) return null;

    const objects = currentObjects(get());
    let newObjects;

    if (clipboard.type === 'multi') {
      newObjects = clipboard.objects.map((obj, index) => {
        const uniqueName = generateUniqueName(obj.name, objects);
        return {
          ...obj,
          id: Date.now() + index,
          name: uniqueName,
          position: [obj.position[0] + 1, obj.position[1], obj.position[2]],
          parentId: null,
        };
      });
    } else {
      const uniqueName = generateUniqueName(clipboard.object.name, objects);
      newObjects = [
        {
          ...clipboard.object,
          id: Date.now(),
          name: uniqueName,
          position: [
            clipboard.object.position[0] + 1,
            clipboard.object.position[1],
            clipboard.object.position[2],
          ],
          parentId: null,
        },
      ];
    }

    useSelectionStore.getState().replaceSelection(newObjects[0], newObjects);
    get().updateCurrentSceneObjects([...objects, ...newObjects]);
    return true;
  },

  duplicateObject: (id) => {
    const { selectedObjects } = useSelectionStore.getState();
    const objects = currentObjects(get());

    if (
      selectedObjects &&
      selectedObjects.length > 1 &&
      selectedObjects.some((o) => o && o.id === id)
    ) {
      const newObjects = selectedObjects.map((obj, index) => {
        const uniqueName = generateUniqueName(obj.name, objects);
        return {
          ...obj,
          id: Date.now() + index,
          name: uniqueName,
          position: [obj.position[0] + 1, obj.position[1], obj.position[2]],
          parentId: null,
        };
      });
      useSelectionStore.getState().replaceSelection(newObjects[0], newObjects);
      get().updateCurrentSceneObjects([...objects, ...newObjects]);
      return true;
    }

    const obj = objects.find((o) => o.id === id);
    if (!obj) return false;

    const uniqueName = generateUniqueName(obj.name, objects);
    const newObj = {
      ...obj,
      id: Date.now(),
      name: uniqueName,
      position: [obj.position[0] + 1, obj.position[1], obj.position[2]],
      parentId: null,
    };

    useSelectionStore.getState().replaceSelection(newObj, [newObj]);
    get().updateCurrentSceneObjects([...objects, newObj]);
    return true;
  },

  // ===== 项目级 =====
  loadScenes: (scenes, mainSceneId) => {
    get().reset(scenes);
    set({ currentSceneId: mainSceneId || scenes[0]?.id || 'scene-main-001' });
    useSelectionStore.getState().clearSelection();
  },

  resetScenes: () => {
    const fresh = [createDefaultScene()];
    get().reset(fresh);
    set({ currentSceneId: 'scene-main-001' });
    useSelectionStore.getState().clearSelection();
  },
}));
