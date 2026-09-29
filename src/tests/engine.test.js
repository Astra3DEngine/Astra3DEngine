/**
 * @file tests/engine.test.js
 * @description engine 层纯逻辑测试：ObjectFactory 对象工厂 + TreeMath 层级树数学。
 */

import {
  createObject,
  createObjectDefaults,
  createFolderObject,
  createPointLightObject,
  createDirectionalLightObject,
  createSpotLightObject,
  createModelObject,
  createPrimitiveObject,
} from '../engine/ObjectFactory.js';
import {
  getAllDescendants,
  getAllDescendantIds,
  applyTransformToObject3D,
  extractTransformFromObject3D,
  computeRelativeTransform,
  computeWorldTransformFromRelative,
  computeRelativeTransformData,
  computeWorldTransformFromRelativeData,
  applyTransformToDescendants,
  collectDescendantRelativeTransforms,
} from '../engine/TreeMath.js';
import * as THREE from 'three';

describe('ObjectFactory', () => {
  test('createObjectDefaults 生成基础骨架', () => {
    const obj = createObjectDefaults(1, 'Cube', 'cube');
    expect(obj).toEqual({
      id: 1,
      name: 'Cube',
      type: 'cube',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    });
  });

  test('createObjectDefaults 合并额外字段', () => {
    const obj = createObjectDefaults(2, 'L', 'pointLight', { isLight: true, intensity: 2 });
    expect(obj.isLight).toBe(true);
    expect(obj.intensity).toBe(2);
  });

  test('createFolderObject', () => {
    const obj = createFolderObject(1, 'Folder');
    expect(obj.type).toBe('folder');
    expect(obj.isFolder).toBe(true);
  });

  test('点/平行/聚光对象带光源字段', () => {
    const point = createPointLightObject(1, 'Point');
    const dir = createDirectionalLightObject(2, 'Dir');
    const spot = createSpotLightObject(3, 'Spot');
    expect(point).toMatchObject({ type: 'pointLight', isLight: true, lightType: 'point' });
    expect(dir).toMatchObject({ type: 'directionalLight', lightType: 'directional' });
    expect(spot).toMatchObject({ type: 'spotLight', lightType: 'spot', angle: Math.PI / 4 });
  });

  test('createModelObject 携带 assetId', () => {
    const asset = { id: 'ast-1' };
    const obj = createModelObject(5, 'Car', asset);
    expect(obj).toMatchObject({ type: 'model', isModel: true, assetId: 'ast-1' });
  });

  test('cube 有 faceTextures，sphere/plane 有 UV 字段', () => {
    const cube = createPrimitiveObject(1, 'Cube', 'cube');
    const sphere = createPrimitiveObject(2, 'Sphere', 'sphere');
    const plane = createPrimitiveObject(3, 'Plane', 'plane');
    expect(cube.faceTextures).toEqual({
      right: null,
      left: null,
      top: null,
      bottom: null,
      front: null,
      back: null,
    });
    expect(sphere.textureId).toBeNull();
    expect(sphere.uvScale).toEqual([1, 1]);
    expect(plane.uvOffset).toEqual([0, 0]);
  });

  test('createObject 按类型分发', () => {
    expect(createObject(1, 'Folder', 'folder').type).toBe('folder');
    expect(createObject(1, 'L', 'pointLight').type).toBe('pointLight');
    expect(createObject(1, 'L', 'directionalLight').type).toBe('directionalLight');
    expect(createObject(1, 'L', 'spotLight').type).toBe('spotLight');
    expect(createObject(1, 'M', 'model', { id: 'ast' }).type).toBe('model');
    expect(createObject(1, 'C', 'cube').type).toBe('cube');
  });
});

describe('TreeMath', () => {
  describe('层级遍历', () => {
    const objects = [
      { id: 1, parentId: null },
      { id: 2, parentId: 1 },
      { id: 3, parentId: 1 },
      { id: 4, parentId: 2 },
      { id: 5, parentId: null },
    ];

    test('getAllDescendants 递归收集', () => {
      const ids = getAllDescendants(1, objects)
        .map((o) => o.id)
        .sort();
      expect(ids).toEqual([2, 3, 4]);
    });

    test('getAllDescendantIds 含自身', () => {
      expect([...getAllDescendantIds(2, objects)].sort()).toEqual([2, 4]);
      expect([...getAllDescendantIds(1, objects)].sort()).toEqual([1, 2, 3, 4]);
    });
  });

  describe('变换读写', () => {
    test('applyTransformToObject3D 将度写入弧度 rotation', () => {
      const mesh = new THREE.Object3D();
      applyTransformToObject3D(mesh, {
        position: [1, 2, 3],
        rotation: [90, 0, 0],
        scale: [2, 2, 2],
      });
      expect(mesh.position.toArray()).toEqual([1, 2, 3]);
      expect(mesh.rotation.x).toBeCloseTo(Math.PI / 2);
      expect(mesh.scale.toArray()).toEqual([2, 2, 2]);
    });

    test('extractTransformFromObject3D 转回角度', () => {
      const mesh = new THREE.Object3D();
      mesh.position.set(1, 2, 3);
      mesh.rotation.set(Math.PI / 2, 0, 0);
      const out = extractTransformFromObject3D(mesh);
      expect(out.position).toEqual([1, 2, 3]);
      expect(out.rotation[0]).toBeCloseTo(90);
      expect(out.scale).toEqual([1, 1, 1]);
    });

    test('apply 与 extract 互为逆运算', () => {
      const mesh = new THREE.Object3D();
      const data = {
        position: [3, -1, 5],
        rotation: [30, 60, 90],
        scale: [1.5, 0.5, 2],
      };
      applyTransformToObject3D(mesh, data);
      const back = extractTransformFromObject3D(mesh);
      expect(back.position).toEqual(data.position);
      expect(back.rotation[0]).toBeCloseTo(30);
      expect(back.rotation[1]).toBeCloseTo(60);
      expect(back.rotation[2]).toBeCloseTo(90);
      expect(back.scale).toEqual(data.scale);
    });
  });

  describe('相对变换', () => {
    test('computeRelativeTransform / computeWorldTransformFromRelative 逆向一致', () => {
      const parent = new THREE.Object3D();
      const child = new THREE.Object3D();
      parent.position.set(5, 5, 5);
      parent.rotation.y = Math.PI / 4;
      parent.scale.set(2, 2, 2);
      parent.updateMatrixWorld(true);
      child.position.set(7, 5, 7);

      const relative = computeRelativeTransform(parent, child);
      const world = computeWorldTransformFromRelative(parent, relative);
      expect(world.position.x).toBeCloseTo(7);
      expect(world.position.z).toBeCloseTo(7);
    });

    test('computeRelativeTransformData / computeWorldTransformFromRelativeData 逆向一致', () => {
      const parent = { position: [5, 5, 5], rotation: [0, 45, 0], scale: [2, 2, 2] };
      const child = { position: [7, 5, 7], rotation: [0, 0, 0], scale: [1, 1, 1] };

      const relative = computeRelativeTransformData(child, parent);
      const world = computeWorldTransformFromRelativeData(relative, parent);
      expect(world.position[0]).toBeCloseTo(7);
      expect(world.position[2]).toBeCloseTo(7);
    });

    test('computeRelativeTransformData 与 mesh 版结果一致', () => {
      const parentMesh = new THREE.Object3D();
      const childMesh = new THREE.Object3D();
      parentMesh.position.set(5, 5, 5);
      parentMesh.rotation.y = Math.PI / 4;
      parentMesh.scale.set(2, 2, 2);
      parentMesh.updateMatrixWorld(true);
      childMesh.position.set(7, 5, 7);
      childMesh.updateMatrixWorld(true);

      const parent = { position: [5, 5, 5], rotation: [0, 45, 0], scale: [2, 2, 2] };
      const child = { position: [7, 5, 7], rotation: [0, 0, 0], scale: [1, 1, 1] };

      const data = computeRelativeTransformData(child, parent);
      const mesh = computeRelativeTransform(parentMesh, childMesh);
      expect(data.position[0]).toBeCloseTo(mesh.position.x);
      expect(data.position[1]).toBeCloseTo(mesh.position.y);
      expect(data.position[2]).toBeCloseTo(mesh.position.z);
      expect(data.scale[0]).toBeCloseTo(mesh.scale.x);
    });
  });

  describe('后代变换传播', () => {
    test('collect + apply 保持后代世界位置', () => {
      // Viewport 中所有 mesh 是 scene 直子，position 为绝对坐标，层级仅由 parentId 表达
      const objects = [
        { id: 1, parentId: null },
        { id: 2, parentId: 1 },
        { id: 3, parentId: 2 },
      ];
      const parentMesh = new THREE.Object3D();
      parentMesh.position.set(5, 5, 5);
      const childMesh = new THREE.Object3D();
      childMesh.position.set(7, 5, 5);
      const grandMesh = new THREE.Object3D();
      grandMesh.position.set(8, 5, 5);
      parentMesh.updateMatrixWorld(true);
      childMesh.updateMatrixWorld(true);
      grandMesh.updateMatrixWorld(true);

      const meshes = { 1: parentMesh, 2: childMesh, 3: grandMesh };
      // 收集相对变换（基于当前绝对位置）
      const rel = collectDescendantRelativeTransforms(1, objects, meshes);
      // 移动父对象到新绝对坐标（通过 world up-to-date 的计算）
      applyTransformToObject3D(parentMesh, {
        position: [11, 5, 5],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      });
      applyTransformToDescendants(1, rel, objects, meshes);

      childMesh.updateMatrixWorld(true);
      grandMesh.updateMatrixWorld(true);
      const childWorld = new THREE.Vector3();
      const grandWorld = new THREE.Vector3();
      childMesh.getWorldPosition(childWorld);
      grandMesh.getWorldPosition(grandWorld);
      // 子保持相对父的 (+2, 0, 0)，孙保持相对子的 (+1, 0, 0)
      expect(childWorld.x).toBeCloseTo(13);
      expect(grandWorld.x).toBeCloseTo(14);
    });
  });
});
