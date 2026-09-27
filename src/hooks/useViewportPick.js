/**
 * @file hooks/useViewportPick.js
 * @description Viewport 交互子逻辑：射线拾取选中 + 播放模式旋转动画。
 * 从 Viewport.jsx 巨型组件中拆分，依赖通过参数显式传入（refs + props），便于复用与测试。
 * @module hooks/useViewportPick
 */

import { useEffect } from 'react';
import * as THREE from 'three';

/**
 * @param {Object} refs - 注入的 DOM/three 引用
 * @param {React.RefObject} refs.containerRef - 容器 DOM 引用
 * @param {React.RefObject} refs.rendererRef - WebGLRenderer 引用
 * @param {React.RefObject} refs.cameraRef - 相机引用
 * @param {React.RefObject} refs.sceneRef - 场景引用
 * @param {React.RefObject} refs.meshesRef - mesh 映射（id -> Object3D）
 * @param {React.RefObject} refs.hasDraggedRef - 拖拽标记（与主 effect 共享）
 * @param {Object} props - 渲染期 props
 * @param {Object[]} props.objects - 场景对象列表
 * @param {string} props.currentTool - 当前工具
 * @param {Function} props.onSelectObject - 选中回调
 * @param {boolean} props.isPlaying - 是否播放中
 */
export function useViewportPick(
  { containerRef, rendererRef, cameraRef, sceneRef, meshesRef, hasDraggedRef },
  { objects, currentTool, onSelectObject, isPlaying }
) {
  // 射线拾取：点击选中物体 / 空白处清空选择
  useEffect(() => {
    if (!containerRef.current || !rendererRef.current) return;

    const canvas = rendererRef.current.domElement;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e) => {
      if (hasDraggedRef.current) {
        hasDraggedRef.current = false;
        return;
      }

      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);

      const validObjects = Object.values(meshesRef.current).filter(
        (mesh) => mesh.parent === sceneRef.current
      );
      const intersects = raycaster.intersectObjects(validObjects, true);

      if (intersects.length > 0) {
        let clickedMesh = intersects[0].object;
        while (clickedMesh.parent && !meshesRef.current[clickedMesh.userData?.id]) {
          clickedMesh = clickedMesh.parent;
        }
        if (clickedMesh.userData?.id) {
          const found = objects.find((obj) => obj.id === clickedMesh.userData.id);
          if (found) {
            onSelectObject(found);
          }
        }
      } else if (currentTool === 'select') {
        onSelectObject(null);
      }
    };

    canvas.addEventListener('click', handleClick);
    return () => {
      canvas.removeEventListener('click', handleClick);
    };
  }, [
    objects,
    currentTool,
    onSelectObject,
    containerRef,
    rendererRef,
    cameraRef,
    sceneRef,
    meshesRef,
    hasDraggedRef,
  ]);

  // 播放模式：旋转实体对象（排除灯光/可视化/轴心/网格辅助）
  useEffect(() => {
    if (!sceneRef.current || !isPlaying) return;

    const animate = () => {
      Object.values(meshesRef.current).forEach((mesh) => {
        if (
          mesh.userData?.id &&
          !mesh.userData?.isLight &&
          !mesh.userData?.visualMesh &&
          !mesh.userData?.outline &&
          mesh.type !== 'DirectionalLight' &&
          mesh.type !== 'PointLight' &&
          mesh.type !== 'SpotLight' &&
          mesh.type !== 'Object3D'
        ) {
          mesh.rotation.y += 0.01;
        }
      });
    };
    const interval = setInterval(animate, 16);
    return () => clearInterval(interval);
  }, [isPlaying, sceneRef, meshesRef]);
}
