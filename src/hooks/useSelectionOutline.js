/**
 * @file hooks/useSelectionOutline.js
 * @description Viewport 选中高亮 + 变换轴心管理：为选中对象生成轮廓，并将 TransformControls 吸附到对应轴心。
 * 从 Viewport.jsx 巨型组件拆分，依赖通过参数显式注入。
 * @module hooks/useSelectionOutline
 */

import { useEffect } from 'react';
import * as THREE from 'three';

/**
 * @param {Object} refs - three/ref 引用
 * @param {React.RefObject} refs.sceneRef - 场景引用
 * @param {React.RefObject} refs.meshesRef - mesh 映射
 * @param {React.RefObject} refs.transformControlsRef - TransformControls 引用
 * @param {Object} deps - 渲染期数据与回调
 * @param {Object|null} deps.selectedObject - 单选对象
 * @param {Object[]} deps.selectedObjects - 多选对象
 * @param {Function} deps.getMeshGeometryCenterWorld - 计算 mesh 几何中心（世界坐标）
 * @param {Function} deps.calculateSelectionsCenter - 计算多选中心
 */
export function useSelectionOutline(
  { sceneRef, meshesRef, transformControlsRef },
  { selectedObject, selectedObjects, getMeshGeometryCenterWorld, calculateSelectionsCenter }
) {
  useEffect(() => {
    if (!transformControlsRef.current || !sceneRef.current) return;

    Object.values(meshesRef.current).forEach((mesh) => {
      if (mesh.userData.outline) {
        mesh.remove(mesh.userData.outline);
        mesh.userData.outline.geometry.dispose();
        mesh.userData.outline.material.dispose();
        mesh.userData.outline = null;
      }
    });

    const objectsToHighlight =
      selectedObjects.length > 1
        ? selectedObjects.filter((o) => o)
        : selectedObject
          ? [selectedObject]
          : [];

    objectsToHighlight.forEach((obj, index) => {
      const mesh = meshesRef.current[obj.id];
      if (!mesh) return;

      const isPrimary = index === 0;

      if (mesh.userData.isModel) {
        const modelContent = mesh.children[0];
        if (modelContent) {
          const box = new THREE.Box3().setFromObject(modelContent);
          const size = new THREE.Vector3();
          box.getSize(size);
          const boxCenter = new THREE.Vector3();
          box.getCenter(boxCenter);
          const localCenter = modelContent.worldToLocal(boxCenter.clone());

          const outlineGeo = new THREE.BoxGeometry(size.x * 1.02, size.y * 1.02, size.z * 1.02);
          const outline = new THREE.LineSegments(
            new THREE.EdgesGeometry(outlineGeo),
            new THREE.LineBasicMaterial({ color: isPrimary ? 0x4a90d9 : 0x66aaff, linewidth: 2 })
          );
          outline.position.copy(localCenter);
          modelContent.add(outline);
          mesh.userData.outline = outline;
        }
      } else if (mesh.userData.isLight) {
        const outline = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.SphereGeometry(0.6, 8, 8)),
          new THREE.LineBasicMaterial({ color: isPrimary ? 0x4a90d9 : 0x66aaff, linewidth: 2 })
        );
        mesh.add(outline);
        mesh.userData.outline = outline;
      } else {
        const outline = new THREE.LineSegments(
          new THREE.EdgesGeometry(mesh.geometry),
          new THREE.LineBasicMaterial({ color: isPrimary ? 0x4a90d9 : 0x66aaff, linewidth: 2 })
        );
        outline.scale.setScalar(1.01);
        mesh.add(outline);
        mesh.userData.outline = outline;
      }
    });

    if (objectsToHighlight.length === 0) {
      transformControlsRef.current.detach();
    } else if (objectsToHighlight.length === 1) {
      const mesh = meshesRef.current[objectsToHighlight[0].id];
      if (mesh && mesh.parent === sceneRef.current) {
        const worldCenter = getMeshGeometryCenterWorld(mesh);
        const pivot = sceneRef.current.getObjectByName('singleSelectPivot');
        if (pivot) {
          pivot.position.copy(worldCenter);
          pivot.rotation.copy(mesh.rotation);
          pivot.scale.copy(mesh.scale);
          transformControlsRef.current.attach(pivot);
        }
      }
    } else {
      const meshes = objectsToHighlight
        .map((obj) => meshesRef.current[obj.id])
        .filter((m) => m && m.parent === sceneRef.current);

      if (meshes.length === 0) {
        const firstObj = objectsToHighlight[0];
        if (firstObj && firstObj.position) {
          const pivot = sceneRef.current.getObjectByName('multiSelectPivot');
          if (pivot) {
            pivot.position.set(firstObj.position[0], firstObj.position[1], firstObj.position[2]);
            pivot.rotation.set(
              THREE.MathUtils.degToRad(firstObj.rotation[0] || 0),
              THREE.MathUtils.degToRad(firstObj.rotation[1] || 0),
              THREE.MathUtils.degToRad(firstObj.rotation[2] || 0)
            );
            pivot.scale.set(firstObj.scale[0] || 1, firstObj.scale[1] || 1, firstObj.scale[2] || 1);
            transformControlsRef.current.attach(pivot);
          }
        }
        return;
      }

      const center = calculateSelectionsCenter(meshes);
      const primaryMesh = meshes[0];
      if (primaryMesh) {
        const pivot = sceneRef.current.getObjectByName('multiSelectPivot');
        if (pivot) {
          pivot.position.copy(center);
          pivot.rotation.copy(primaryMesh.rotation);
          pivot.scale.copy(primaryMesh.scale);
          transformControlsRef.current.attach(pivot);
        }
      }
    }
  }, [
    selectedObject,
    selectedObjects,
    getMeshGeometryCenterWorld,
    calculateSelectionsCenter,
    sceneRef,
    meshesRef,
    transformControlsRef,
  ]);
}
