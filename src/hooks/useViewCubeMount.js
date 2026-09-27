/**
 * @file hooks/useViewCubeMount.js
 * @description Viewport 视图立方体挂载：在容器元素上创建 ViewCube 并接入相机/轨道控制引用。
 * 从 Viewport.jsx 巨型组件拆分，依赖通过参数显式注入。
 * @module hooks/useViewCubeMount
 */

import { useEffect } from 'react';
import * as THREE from 'three';
import { ViewCube, animateCameraToDirection } from '../engine/ViewCube.js';

/**
 * @param {Object} refs - 注入的 refs
 * @param {React.RefObject} refs.viewCubeElRef - ViewCube 挂载 DOM 引用
 * @param {React.RefObject} refs.viewCubeRef - ViewCube 实例存储引用
 * @param {React.RefObject} refs.cameraRef - 透视相机
 * @param {React.RefObject} refs.orthographicCameraRef - 正交相机
 * @param {React.RefObject} refs.cameraTypeRef - 相机类型（'perspective' | 'orthographic'）
 * @param {React.RefObject} refs.orbitControlsRef - 轨道控制
 */
export function useViewCubeMount({
  viewCubeElRef,
  viewCubeRef,
  cameraRef,
  orthographicCameraRef,
  cameraTypeRef,
  orbitControlsRef,
}) {
  useEffect(() => {
    if (!viewCubeElRef.current) return;

    const viewCube = new ViewCube(viewCubeElRef.current, {
      getActiveCamera: () =>
        cameraTypeRef.current === 'orthographic'
          ? orthographicCameraRef.current
          : cameraRef.current,
      isOrthographic: () => cameraTypeRef.current === 'orthographic',
      getOrbitTarget: () => orbitControlsRef.current?.target.clone() || new THREE.Vector3(0, 0, 0),
      onFaceClick: (direction) => {
        animateCameraToDirection(
          cameraRef.current,
          orbitControlsRef.current?.target.clone() || new THREE.Vector3(0, 0, 0),
          direction,
          () => orbitControlsRef.current?.update()
        );
      },
    });
    viewCubeRef.current = viewCube;

    return () => {
      viewCubeRef.current = null;
    };
  }, [
    viewCubeElRef,
    viewCubeRef,
    cameraRef,
    orthographicCameraRef,
    cameraTypeRef,
    orbitControlsRef,
  ]);
}
