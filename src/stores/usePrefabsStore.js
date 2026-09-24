/**
 * @file stores/usePrefabsStore.js
 * @description 预制件状态 store：预制件列表、选中态与创建/实例化/删除/更新/断开/应用。
 * 预制件变更会同步更新场景对象。
 * @module stores/usePrefabsStore
 */

import { create } from 'zustand';
import { useScenesStore } from './useScenesStore.js';

export const usePrefabsStore = create((set, get) => ({
  prefabs: [],
  selectedPrefab: null,

  setSelectedPrefab: (prefab) => set({ selectedPrefab: prefab }),

  createPrefab: (objectId) => {
    const objects = useScenesStore.getState().getCurrentObjects();
    const obj = objects.find((o) => o.id === objectId);
    if (!obj) return null;

    const prefab = {
      id: Date.now(),
      name: `${obj.name}_Prefab`,
      template: {
        type: obj.type,
        color: obj.color,
        scale: [...obj.scale],
        defaultPosition: [0, 0, 0],
        defaultRotation: [0, 0, 0],
        assetId: obj.assetId,
        isModel: obj.isModel,
      },
    };

    set((s) => ({ prefabs: [...s.prefabs, prefab] }));

    useScenesStore
      .getState()
      .updateCurrentSceneObjects(
        objects.map((o) =>
          o.id === objectId
            ? { ...o, prefabId: prefab.id, overrides: { scale: false, color: false } }
            : o
        )
      );

    return prefab;
  },

  instantiatePrefab: (prefabId, position = null) => {
    const prefab = get().prefabs.find((p) => p.id === prefabId);
    if (!prefab) return;

    const instancePosition = position || [...prefab.template.defaultPosition];
    const instance = {
      id: Date.now(),
      name: `${prefab.name}_Instance`,
      prefabId: prefab.id,
      type: prefab.template.type,
      position: instancePosition,
      rotation: [...prefab.template.defaultRotation],
      scale: [...prefab.template.scale],
      color: prefab.template.color,
      assetId: prefab.template.assetId,
      isModel: prefab.template.isModel,
      overrides: { scale: false, color: false },
    };

    const objects = useScenesStore.getState().getCurrentObjects();
    useScenesStore.getState().updateCurrentSceneObjects([...objects, instance]);
    return instance;
  },

  deletePrefab: (prefabId) => {
    const objects = useScenesStore.getState().getCurrentObjects();
    const templateType = get().prefabs.find((p) => p.id === prefabId)?.template.type;

    useScenesStore.getState().updateCurrentSceneObjects(
      objects.map((obj) =>
        obj.prefabId === prefabId
          ? {
              ...obj,
              prefabId: null,
              type: templateType || obj.type,
              overrides: undefined,
            }
          : obj
      )
    );

    set((s) => ({
      prefabs: s.prefabs.filter((p) => p.id !== prefabId),
      selectedPrefab: s.selectedPrefab?.id === prefabId ? null : s.selectedPrefab,
    }));
  },

  updatePrefab: (prefabId, updates) => {
    set((s) => ({
      prefabs: s.prefabs.map((p) => (p.id === prefabId ? { ...p, ...updates } : p)),
    }));

    const objects = useScenesStore.getState().getCurrentObjects();
    const prefab = get().prefabs.find((p) => p.id === prefabId);
    if (!prefab) return;

    useScenesStore.getState().updateCurrentSceneObjects(
      objects.map((obj) => {
        if (obj.prefabId !== prefabId) return obj;
        const newObj = { ...obj };
        if (!obj.overrides?.scale && updates.template?.scale) {
          newObj.scale = [...updates.template.scale];
        }
        if (!obj.overrides?.color && updates.template?.color) {
          newObj.color = updates.template.color;
        }
        return newObj;
      }),
      false
    );
  },

  disconnectPrefab: (objectId) => {
    const objects = useScenesStore.getState().getCurrentObjects();
    const obj = objects.find((o) => o.id === objectId);
    if (!obj || !obj.prefabId) return;

    const prefab = get().prefabs.find((p) => p.id === obj.prefabId);

    useScenesStore.getState().updateCurrentSceneObjects(
      objects.map((o) =>
        o.id === objectId
          ? {
              ...o,
              prefabId: null,
              type: prefab?.template.type || o.type,
              assetId: prefab?.template.assetId,
              isModel: prefab?.template.isModel,
              overrides: undefined,
            }
          : o
      )
    );
  },

  applyToPrefab: (objectId) => {
    const objects = useScenesStore.getState().getCurrentObjects();
    const obj = objects.find((o) => o.id === objectId);
    if (!obj || !obj.prefabId) return;

    const prefab = get().prefabs.find((p) => p.id === obj.prefabId);

    get().updatePrefab(obj.prefabId, {
      template: {
        ...prefab?.template,
        color: obj.color,
        scale: [...obj.scale],
      },
    });

    useScenesStore
      .getState()
      .updateCurrentSceneObjects(
        objects.map((o) =>
          o.id === objectId ? { ...o, overrides: { scale: false, color: false } } : o
        )
      );
  },

  loadPrefabs: (prefabs) => set({ prefabs }),
  resetPrefabs: () => set({ prefabs: [], selectedPrefab: null }),
}));
