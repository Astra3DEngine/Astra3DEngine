import { describe, it, expect, beforeEach } from 'vitest';
import { useScenesStore } from '../stores/useScenesStore.js';
import { useSelectionStore } from '../stores/useSelectionStore.js';
import { usePrefabsStore } from '../stores/usePrefabsStore.js';
import { generateUniqueName } from '../utils/names.js';

function resetStores() {
  useScenesStore.getState().resetScenes();
  useScenesStore.setState({ clipboard: null });
  usePrefabsStore.getState().resetPrefabs();
  useSelectionStore.getState().clearSelection();
}

describe('names', () => {
  it('生成唯一名称并追加数字后缀', () => {
    const objects = [
      { id: 1, name: 'Cube' },
      { id: 2, name: 'Cube_1' },
    ];
    expect(generateUniqueName('Cube', objects)).toBe('Cube_2');
    expect(generateUniqueName('Sphere', objects)).toBe('Sphere');
    expect(generateUniqueName('Cube', objects, 1)).toBe('Cube');
  });
});

describe('useScenesStore', () => {
  beforeEach(resetStores);

  it('addObject 添加对象到当前场景并选中', () => {
    useScenesStore.getState().addObject('cube');
    const objects = useScenesStore.getState().getCurrentObjects();
    expect(objects).toHaveLength(1);
    expect(objects[0].type).toBe('cube');
    expect(useSelectionStore.getState().selectedObject?.id).toBe(objects[0].id);
  });

  it('addObject 生成不重复名称', () => {
    useScenesStore.getState().addObject('cube');
    useScenesStore.getState().addObject('cube');
    const objects = useScenesStore.getState().getCurrentObjects();
    expect(objects.map((o) => o.name).sort()).toEqual(['Cube', 'Cube_1']);
  });

  it('updateObject 修改对象并记录历史', () => {
    useScenesStore.getState().addObject('cube');
    const id = useScenesStore.getState().getCurrentObjects()[0].id;
    useScenesStore.getState().updateObject(id, { position: [1, 2, 3] });

    expect(useScenesStore.getState().getCurrentObjects()[0].position).toEqual([1, 2, 3]);
    expect(useScenesStore.getState().past.length).toBeGreaterThan(0);
  });

  it('undo/redo 恢复场景', () => {
    useScenesStore.getState().addObject('cube');
    const id = useScenesStore.getState().getCurrentObjects()[0].id;
    useScenesStore.getState().updateObject(id, { name: 'Renamed' });

    expect(useScenesStore.getState().getCurrentObjects()[0].name).toBe('Renamed');
    useScenesStore.getState().undo();
    expect(useScenesStore.getState().getCurrentObjects()[0].name).toBe('Cube');
    useScenesStore.getState().redo();
    expect(useScenesStore.getState().getCurrentObjects()[0].name).toBe('Renamed');
  });

  it('deleteSelectedObjects 删除多选对象并清空选中', () => {
    useScenesStore.getState().addObject('cube');
    useScenesStore.getState().addObject('sphere');
    const objects = useScenesStore.getState().getCurrentObjects();
    useSelectionStore.getState().replaceSelection(objects[0], objects);
    useScenesStore.getState().deleteSelectedObjects();
    expect(useScenesStore.getState().getCurrentObjects()).toHaveLength(0);
    expect(useSelectionStore.getState().selectedObjects).toHaveLength(0);
  });

  it('多场景：切换场景隔离对象', () => {
    useScenesStore.getState().addObject('cube');
    useScenesStore.getState().createScene();
    expect(useScenesStore.getState().scenes).toHaveLength(2);
    expect(useScenesStore.getState().getCurrentObjects()).toHaveLength(0);
    useScenesStore.getState().switchScene('scene-main-001');
    expect(useScenesStore.getState().getCurrentObjects()).toHaveLength(1);
  });
});

describe('usePrefabsStore', () => {
  beforeEach(resetStores);

  it('createPrefab 立即使用户对象获得 prefabId', () => {
    useScenesStore.getState().addObject('sphere');
    const id = useScenesStore.getState().getCurrentObjects()[0].id;
    const prefab = usePrefabsStore.getState().createPrefab(id);

    expect(prefab).toBeTruthy();
    expect(usePrefabsStore.getState().prefabs).toHaveLength(1);
    expect(useScenesStore.getState().getCurrentObjects()[0].prefabId).toBe(prefab.id);
  });
});
