/**
 * @file engine/TreeMath.js
 * @description 场景层级树的纯数学计算：相对变换、后代收集与传播。
 * 与 UI 无关，只依赖 THRErE 对象和场景对象数据，可在 Viewport / Inspector 等复用。
 * @module engine/TreeMath
 */

import * as THREE from 'three';

/**
 * 递归获取所有后代对象（不含自身）。
 *
 * 注意：对象树通过 `parentId` 关联。
 * @param {number} parentId - 父对象 ID
 * @param {Array<Object>} objects - 场景对象列表
 * @returns {Array<Object>} 所有后代对象列表
 */
export function getAllDescendants(parentId, objects) {
  const descendants = [];
  const children = objects.filter((o) => o.parentId === parentId);
  children.forEach((child) => {
    descendants.push(child);
    descendants.push(...getAllDescendants(child.id, objects));
  });
  return descendants;
}

/**
 * 收集某对象所有后代的 ID（含自身），返回 Set。
 * @param {number} parentId - 对象 ID
 * @param {Array<Object>} objects - 场景对象列表
 * @returns {Set<number>} 后代 ID 集合（含自身）
 */
export function getAllDescendantIds(parentId, objects) {
  const ids = new Set([parentId]);
  objects
    .filter((o) => o.parentId === parentId)
    .forEach((child) => {
      getAllDescendantIds(child.id, objects).forEach((id) => ids.add(id));
    });
  return ids;
}

/**
 * 计算子对象相对于父对象的相对变换。
 *
 * 相对变换 = 父对象世界变换的逆 × 子对象世界变换。
 * @param {THREE.Object3D} parentMesh - 父对象 mesh
 * @param {THREE.Object3D} childMesh - 子对象 mesh
 * @returns {{ position: THREE.Vector3, quaternion: THREE.Quaternion, scale: THREE.Vector3 }}
 */
export function computeRelativeTransform(parentMesh, childMesh) {
  const parentWorldQuat = new THREE.Quaternion();
  const parentWorldScale = new THREE.Vector3();
  parentMesh.matrixWorld.decompose(new THREE.Vector3(), parentWorldQuat, parentWorldScale);

  const childWorldPos = childMesh.position.clone();
  const childWorldQuat = new THREE.Quaternion();
  const childWorldScale = new THREE.Vector3();
  childMesh.matrixWorld.decompose(new THREE.Vector3(), childWorldQuat, childWorldScale);

  const relativePos = childWorldPos.clone().sub(parentMesh.position);
  relativePos.applyQuaternion(parentWorldQuat.clone().invert());
  relativePos.divide(parentWorldScale);

  const relativeQuat = parentWorldQuat.clone().invert().multiply(childWorldQuat);

  const relativeScale = new THREE.Vector3(
    childWorldScale.x / parentWorldScale.x,
    childWorldScale.y / parentWorldScale.y,
    childWorldScale.z / parentWorldScale.z
  );

  return { position: relativePos, quaternion: relativeQuat, scale: relativeScale };
}

/**
 * 由父对象新变换与子对象相对变换计算子对象世界变换（computeRelativeTransform 的逆运算）。
 * @param {THREE.Object3D} parentMesh - 父对象 mesh（已变换）
 * @param {Object} relativeTransform - 子对象相对变换
 * @returns {{ position: THREE.Vector3, quaternion: THREE.Quaternion, scale: THREE.Vector3 }}
 */
export function computeWorldTransformFromRelative(parentMesh, relativeTransform) {
  const parentWorldQuat = new THREE.Quaternion();
  const parentWorldScale = new THREE.Vector3();
  parentMesh.matrixWorld.decompose(new THREE.Vector3(), parentWorldQuat, parentWorldScale);

  const worldPos = relativeTransform.position.clone();
  worldPos.multiply(parentWorldScale);
  worldPos.applyQuaternion(parentWorldQuat);
  worldPos.add(parentMesh.position);

  const worldQuat = parentWorldQuat.multiply(relativeTransform.quaternion);

  const worldScale = new THREE.Vector3(
    relativeTransform.scale.x * parentWorldScale.x,
    relativeTransform.scale.y * parentWorldScale.y,
    relativeTransform.scale.z * parentWorldScale.z
  );

  return { position: worldPos, quaternion: worldQuat, scale: worldScale };
}

/**
 * 计算子对象相对于父对象的相对变换（数据版，基于编辑器数组坐标）。
 *
 * 相对位置、旋转、缩放均以父对象局部坐标系表示。
 * 输入输出均为编辑器对象数据格式：{ position: number[], rotation: number[](度), scale: number[] }。
 *
 * @param {Object} child - 子对象数据
 * @param {Object} parent - 父对象数据
 * @returns {{ position: number[], rotation: number[], scale: number[] }} 相对变换（rotation 为度）
 */
export function computeRelativeTransformData(child, parent) {
  const childPos = new THREE.Vector3(child.position[0], child.position[1], child.position[2]);
  const childRot = new THREE.Euler(
    THREE.MathUtils.degToRad(child.rotation[0]),
    THREE.MathUtils.degToRad(child.rotation[1]),
    THREE.MathUtils.degToRad(child.rotation[2])
  );
  const childQuat = new THREE.Quaternion().setFromEuler(childRot);
  const childScale = new THREE.Vector3(child.scale[0], child.scale[1], child.scale[2]);

  const parentPos = new THREE.Vector3(parent.position[0], parent.position[1], parent.position[2]);
  const parentRot = new THREE.Euler(
    THREE.MathUtils.degToRad(parent.rotation[0]),
    THREE.MathUtils.degToRad(parent.rotation[1]),
    THREE.MathUtils.degToRad(parent.rotation[2])
  );
  const parentQuat = new THREE.Quaternion().setFromEuler(parentRot);
  const parentScale = new THREE.Vector3(parent.scale[0], parent.scale[1], parent.scale[2]);

  const relativePos = childPos.clone().sub(parentPos);
  relativePos.applyQuaternion(parentQuat.clone().invert());
  relativePos.divide(parentScale);

  const relativeQuat = parentQuat.clone().invert().multiply(childQuat);
  const relativeEuler = new THREE.Euler().setFromQuaternion(relativeQuat);

  const relativeScale = new THREE.Vector3(
    childScale.x / parentScale.x,
    childScale.y / parentScale.y,
    childScale.z / parentScale.z
  );

  return {
    position: [relativePos.x, relativePos.y, relativePos.z],
    rotation: [
      THREE.MathUtils.radToDeg(relativeEuler.x),
      THREE.MathUtils.radToDeg(relativeEuler.y),
      THREE.MathUtils.radToDeg(relativeEuler.z),
    ],
    scale: [relativeScale.x, relativeScale.y, relativeScale.z],
  };
}

/**
 * 由父对象变换与子对象相对变换计算子对象世界变换（数据版，computeRelativeTransformData 的逆运算）。
 *
 * @param {Object} relativeTransform - 子对象的相对变换
 * @param {Object} parent - 父对象数据
 * @returns {{ position: number[], rotation: number[], scale: number[] }} 世界变换（rotation 为度）
 */
export function computeWorldTransformFromRelativeData(relativeTransform, parent) {
  const relativePos = new THREE.Vector3(
    relativeTransform.position[0],
    relativeTransform.position[1],
    relativeTransform.position[2]
  );
  const relativeRot = new THREE.Euler(
    THREE.MathUtils.degToRad(relativeTransform.rotation[0]),
    THREE.MathUtils.degToRad(relativeTransform.rotation[1]),
    THREE.MathUtils.degToRad(relativeTransform.rotation[2])
  );
  const relativeQuat = new THREE.Quaternion().setFromEuler(relativeRot);
  const relativeScale = new THREE.Vector3(
    relativeTransform.scale[0],
    relativeTransform.scale[1],
    relativeTransform.scale[2]
  );

  const parentPos = new THREE.Vector3(parent.position[0], parent.position[1], parent.position[2]);
  const parentRot = new THREE.Euler(
    THREE.MathUtils.degToRad(parent.rotation[0]),
    THREE.MathUtils.degToRad(parent.rotation[1]),
    THREE.MathUtils.degToRad(parent.rotation[2])
  );
  const parentQuat = new THREE.Quaternion().setFromEuler(parentRot);
  const parentScale = new THREE.Vector3(parent.scale[0], parent.scale[1], parent.scale[2]);

  const worldPos = relativePos.clone();
  worldPos.multiply(parentScale);
  worldPos.applyQuaternion(parentQuat);
  worldPos.add(parentPos);

  const worldQuat = parentQuat.clone().multiply(relativeQuat);
  const worldEuler = new THREE.Euler().setFromQuaternion(worldQuat);

  const worldScale = new THREE.Vector3(
    relativeScale.x * parentScale.x,
    relativeScale.y * parentScale.y,
    relativeScale.z * parentScale.z
  );

  return {
    position: [worldPos.x, worldPos.y, worldPos.z],
    rotation: [
      THREE.MathUtils.radToDeg(worldEuler.x),
      THREE.MathUtils.radToDeg(worldEuler.y),
      THREE.MathUtils.radToDeg(worldEuler.z),
    ],
    scale: [worldScale.x, worldScale.y, worldScale.z],
  };
}

/**
 * 收集指定对象所有后代的相对变换（自顶向下逐层计算）。
 * @param {number} parentId - 父对象 ID
 * @param {Array<Object>} objects - 场景对象列表
 * @param {Record<number, THREE.Object3D>} meshes - mesh 映射
 * @returns {Map<number, Object>} 后代 ID -> 相对变换
 */
export function collectDescendantRelativeTransforms(parentId, objects, meshes) {
  const transforms = new Map();
  const children = objects.filter((o) => o.parentId === parentId);

  children.forEach((child) => {
    const childMesh = meshes[child.id];
    const parentMesh = meshes[parentId];
    if (childMesh && parentMesh) {
      transforms.set(child.id, computeRelativeTransform(parentMesh, childMesh));
      const descendantTransforms = collectDescendantRelativeTransforms(child.id, objects, meshes);
      descendantTransforms.forEach((transform, id) => transforms.set(id, transform));
    }
  });

  return transforms;
}

/**
 * 应用父对象的新变换到所有后代（必须自顶向下处理）。
 * @param {number} parentId - 父对象 ID
 * @param {Map<number, Object>} relativeTransforms - 后代相对变换
 * @param {Array<Object>} objects - 场景对象列表
 * @param {Record<number, THREE.Object3D>} meshes - mesh 映射
 */
export function applyTransformToDescendants(parentId, relativeTransforms, objects, meshes) {
  const children = objects.filter((o) => o.parentId === parentId);

  children.forEach((child) => {
    const childMesh = meshes[child.id];
    const parentMesh = meshes[parentId];
    const relative = relativeTransforms.get(child.id);

    if (childMesh && parentMesh && relative) {
      const worldTransform = computeWorldTransformFromRelative(parentMesh, relative);
      childMesh.position.copy(worldTransform.position);
      childMesh.quaternion.copy(worldTransform.quaternion);
      childMesh.scale.copy(worldTransform.scale);
      applyTransformToDescendants(child.id, relativeTransforms, objects, meshes);
    }
  });
}

/**
 * 将对象编辑器数组坐标写入 THREE.Object3D。
 * @param {THREE.Object3D} obj - three 对象
 * @param {Object} data - { position, rotation(deg), scale }
 */
export function applyTransformToObject3D(obj, data) {
  obj.position.set(data.position[0], data.position[1], data.position[2]);
  obj.rotation.set(
    THREE.MathUtils.degToRad(data.rotation?.[0] || 0),
    THREE.MathUtils.degToRad(data.rotation?.[1] || 0),
    THREE.MathUtils.degToRad(data.rotation?.[2] || 0)
  );
  obj.scale.set(data.scale[0], data.scale[1], data.scale[2]);
}

/**
 * 将 THREE.Object3D 的变换导出为编辑器对象数组格式。
 * @param {THREE.Object3D} obj - three 对象
 * @returns {{ position: number[], rotation: number[], scale: number[] }} rotation 为角度
 */
export function extractTransformFromObject3D(obj) {
  return {
    position: [obj.position.x, obj.position.y, obj.position.z],
    rotation: [
      THREE.MathUtils.radToDeg(obj.rotation.x),
      THREE.MathUtils.radToDeg(obj.rotation.y),
      THREE.MathUtils.radToDeg(obj.rotation.z),
    ],
    scale: [obj.scale.x, obj.scale.y, obj.scale.z],
  };
}
