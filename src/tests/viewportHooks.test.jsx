/**
 * @file tests/viewportHooks.test.jsx
 * @description Viewport 拆分 hooks 的交互测试：拾取、选中高亮、ViewCube 挂载。
 * 这些 hook 依赖注入 refs，用真实 three 数学做射线拾取断言，ViewCube 引擎 mock。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import * as THREE from 'three';
import { useViewportPick } from '../hooks/useViewportPick.js';
import { useSelectionOutline } from '../hooks/useSelectionOutline.js';

vi.mock('../engine/ViewCube.js', () => ({
  ViewCube: vi.fn(function MockViewCube() {
    this.constructed = true;
  }),
  animateCameraToDirection: vi.fn(),
}));

import { useViewCubeMount } from '../hooks/useViewCubeMount.js';
import { ViewCube } from '../engine/ViewCube.js';

/** 构造一个可捕获事件监听的伪 canvas */
function createFakeCanvas(width = 200, height = 200) {
  const listeners = {};
  const canvas = {
    getBoundingClientRect: () => ({ left: 0, top: 0, right: width, bottom: height, width, height }),
    addEventListener: (type, handler) => {
      listeners[type] = handler;
    },
    removeEventListener: (type) => {
      delete listeners[type];
    },
    _listeners: listeners,
  };
  return canvas;
}

describe('useViewportPick', () => {
  const getSetup = () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
    camera.position.set(0, 0, 10);

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    mesh.userData.id = 1;
    scene.add(mesh);

    // 真实渲染流程中每帧会 updateMatrixWorld；测试需手动刷新保证射线命中判定
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);

    const canvas = createFakeCanvas();
    const hasDraggedRef = { current: false };

    const refs = {
      containerRef: { current: document.createElement('div') },
      rendererRef: { current: { domElement: canvas } },
      cameraRef: { current: camera },
      sceneRef: { current: scene },
      meshesRef: { current: { 1: mesh } },
      hasDraggedRef,
    };

    const onSelectObject = vi.fn();
    return { refs, canvas, onSelectObject, mesh };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('点击命中物体时回调对应对象', () => {
    const { refs, canvas, onSelectObject, mesh } = getSetup();
    const objects = [{ id: 1, name: 'Cube' }];

    renderHook(() =>
      useViewportPick(refs, {
        objects,
        currentTool: 'select',
        onSelectObject,
        isPlaying: false,
      })
    );

    // 中心点击：射线应从相机穿过原点命中立方体
    canvas._listeners.click({ clientX: 100, clientY: 100 });

    expect(onSelectObject).toHaveBeenCalledTimes(1);
    expect(onSelectObject).toHaveBeenCalledWith(objects[0]);
    expect(mesh.quaternion).toBeDefined();
  });

  it('点击空白处且工具为 select 时清空选择', () => {
    const { refs, canvas, onSelectObject } = getSetup();
    // 相机看向角落，点击中心不会命中场景物体（射线向左上偏移）
    refs.cameraRef.current.position.set(-10, 10, 10);
    refs.cameraRef.current.lookAt(0, 0, 0);

    renderHook(() =>
      useViewportPick(refs, {
        objects: [{ id: 1, name: 'Cube' }],
        currentTool: 'select',
        onSelectObject,
        isPlaying: false,
      })
    );

    canvas._listeners.click({ clientX: 100, clientY: 100 });

    expect(onSelectObject).toHaveBeenCalledWith(null);
  });

  it('点击空白处但工具非 select 时不清空', () => {
    const { refs, canvas, onSelectObject } = getSetup();
    refs.cameraRef.current.position.set(-10, 10, 10);
    refs.cameraRef.current.lookAt(0, 0, 0);

    renderHook(() =>
      useViewportPick(refs, {
        objects: [{ id: 1, name: 'Cube' }],
        currentTool: 'move',
        onSelectObject,
        isPlaying: false,
      })
    );

    canvas._listeners.click({ clientX: 100, clientY: 100 });

    expect(onSelectObject).not.toHaveBeenCalled();
  });

  it('拖拽后点击不触发选中', () => {
    const { refs, canvas, onSelectObject } = getSetup();
    refs.hasDraggedRef.current = true;

    renderHook(() =>
      useViewportPick(refs, {
        objects: [{ id: 1, name: 'Cube' }],
        currentTool: 'select',
        onSelectObject,
        isPlaying: false,
      })
    );

    canvas._listeners.click({ clientX: 100, clientY: 100 });

    expect(onSelectObject).not.toHaveBeenCalled();
    expect(refs.hasDraggedRef.current).toBe(false);
  });

  it('点击子级 mesh 时向上找到有 id 的父级', () => {
    const { refs, canvas, onSelectObject } = getSetup();
    // 构造一个没有 userData.id 的子 mesh，挂在有 id 的父 mesh 下
    const parent = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    parent.userData.id = 7;
    const child = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5));
    parent.add(child);
    refs.sceneRef.current.add(parent);
    refs.meshesRef.current = { 7: parent };
    refs.cameraRef.current.position.set(0, 0, 10);

    renderHook(() =>
      useViewportPick(refs, {
        objects: [
          { id: 7, name: 'Parent' },
          { id: 1, name: 'Cube' },
        ],
        currentTool: 'select',
        onSelectObject,
        isPlaying: false,
      })
    );

    canvas._listeners.click({ clientX: 100, clientY: 100 });

    expect(onSelectObject).toHaveBeenCalledTimes(1);
    expect(onSelectObject).toHaveBeenCalledWith({ id: 7, name: 'Parent' });
  });
});

describe('useSelectionOutline', () => {
  const getSetup = () => {
    const scene = new THREE.Scene();
    const pivot = new THREE.Object3D();
    pivot.name = 'singleSelectPivot';
    scene.add(pivot);

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    mesh.userData.id = 1;
    scene.add(mesh);

    const transformControls = {
      attach: vi.fn(),
      detach: vi.fn(),
    };

    const refs = {
      sceneRef: { current: scene },
      meshesRef: { current: { 1: mesh } },
      transformControlsRef: { current: transformControls },
    };

    return { refs, mesh, pivot, transformControls };
  };

  it('选中单个对象时生成轮廓并吸附到单选框轴', () => {
    const { refs, mesh, pivot, transformControls } = getSetup();

    renderHook(() =>
      useSelectionOutline(refs, {
        selectedObject: { id: 1 },
        selectedObjects: [],
        getMeshGeometryCenterWorld: () => new THREE.Vector3(0, 0, 0),
        calculateSelectionsCenter: () => new THREE.Vector3(),
      })
    );

    expect(mesh.userData.outline).toBeTruthy();
    // 由于 selectedObjects.length === 0，走单选框逻辑：attach pivot
    expect(transformControls.attach).toHaveBeenCalledWith(pivot);
  });

  it('无选中时 detach 变换控件', () => {
    const { refs, transformControls } = getSetup();

    renderHook(() =>
      useSelectionOutline(refs, {
        selectedObject: null,
        selectedObjects: [],
        getMeshGeometryCenterWorld: () => new THREE.Vector3(0, 0, 0),
        calculateSelectionsCenter: () => new THREE.Vector3(),
      })
    );

    expect(transformControls.detach).toHaveBeenCalled();
  });

  it('多选时生成主轮廓并吸附到多选框轴', () => {
    const { refs, mesh, transformControls } = getSetup();
    const multiPivot = new THREE.Object3D();
    multiPivot.name = 'multiSelectPivot';
    const mesh2 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    mesh2.userData.id = 2;
    refs.sceneRef.current.add(mesh2);
    refs.sceneRef.current.add(multiPivot);
    refs.meshesRef.current = { 1: mesh, 2: mesh2 };

    renderHook(() =>
      useSelectionOutline(refs, {
        selectedObject: { id: 1 },
        selectedObjects: [{ id: 1 }, { id: 2 }],
        getMeshGeometryCenterWorld: () => new THREE.Vector3(0, 0, 0),
        calculateSelectionsCenter: () => new THREE.Vector3(1, 2, 3),
      })
    );

    expect(mesh.userData.outline).toBeTruthy();
    expect(transformControls.attach).toHaveBeenCalledWith(multiPivot);
  });
});

describe('useViewCubeMount', () => {
  beforeEach(() => {
    ViewCube.mockClear();
  });

  it('挂载时创建 ViewCube 实例并存入 ref，卸载时清空', () => {
    const viewCubeEl = document.createElement('div');
    const viewCubeRef = { current: null };

    const { unmount } = renderHook(() =>
      useViewCubeMount({
        viewCubeElRef: { current: viewCubeEl },
        viewCubeRef,
        cameraRef: { current: new THREE.PerspectiveCamera() },
        orthographicCameraRef: { current: new THREE.OrthographicCamera() },
        cameraTypeRef: { current: 'perspective' },
        orbitControlsRef: { current: { target: new THREE.Vector3(), update: vi.fn() } },
      })
    );

    expect(ViewCube).toHaveBeenCalledTimes(1);
    expect(viewCubeRef.current).toBeTruthy();

    unmount();
    expect(viewCubeRef.current).toBeNull();
  });

  it('容器不存在时不创建 ViewCube', () => {
    const viewCubeRef = { current: null };

    renderHook(() =>
      useViewCubeMount({
        viewCubeElRef: { current: null },
        viewCubeRef,
        cameraRef: { current: new THREE.PerspectiveCamera() },
        orthographicCameraRef: { current: new THREE.OrthographicCamera() },
        cameraTypeRef: { current: 'perspective' },
        orbitControlsRef: { current: { target: new THREE.Vector3(), update: vi.fn() } },
      })
    );

    expect(ViewCube).not.toHaveBeenCalled();
    expect(viewCubeRef.current).toBeNull();
  });
});
