/**
 * @file engine/ModelLoader.js
 * @description 模型对象构建：从资源生成可渲染的 THREE.Group / Mesh，
 * 统一 GLTF / OBJ / mesh 部件 的克隆、居中、阴影与材质处理。
 * @module engine/ModelLoader
 */

import * as THREE from 'three';
import { ensureStandardMaterial, cloneTexture } from './materials.js';

/**
 * 从资源构建模型 Group。
 *
 * OBJ 模型的子 Mesh 已在加载时相对中心偏移，无需再次居中；GLTF 需要 `position -= center`。
 * @param {Object} asset - 资源（需含 gltfScene / center / size）
 * @param {Object} obj - 场景对象数据（position/rotation/scale/textureId/uvScale/uvOffset）
 * @returns {THREE.Group}
 */
export function buildModelGroup(asset, obj) {
  const modelGroup = new THREE.Group();

  const modelContent = asset.gltfScene.clone();
  const center = asset.center || new THREE.Vector3(0, 0, 0);
  const isObjModel = asset.name && asset.name.toLowerCase().endsWith('.obj');
  if (!isObjModel) {
    modelContent.position.sub(center);
  }

  modelContent.traverse((child) => {
    if (child.isMesh) {
      if (!child.geometry.attributes.normal) {
        child.geometry.computeVertexNormals();
      }
      child.castShadow = true;
      child.receiveShadow = true;
      child.material = ensureStandardMaterial(child.material, true);
    }
  });

  if (obj.textureId) {
    const textureAsset = obj.assets?.find((a) => a.id === obj.textureId);
    if (textureAsset && textureAsset.texture) {
      const texture = cloneTexture(textureAsset.texture, obj.uvScale, obj.uvOffset);
      modelContent.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = ensureStandardMaterial(child.material, true);
          child.material.map = texture;
          child.material.needsUpdate = true;
        }
      });
    }
  }

  modelGroup.add(modelContent);
  modelGroup.position.set(obj.position[0], obj.position[1], obj.position[2]);
  modelGroup.rotation.set(
    THREE.MathUtils.degToRad(obj.rotation[0]),
    THREE.MathUtils.degToRad(obj.rotation[1]),
    THREE.MathUtils.degToRad(obj.rotation[2])
  );
  modelGroup.scale.set(obj.scale[0], obj.scale[1], obj.scale[2]);
  modelGroup.userData = { id: obj.id, isModel: true, assetSize: asset.size };
  return modelGroup;
}

/**
 * 依据 meshPath 在资源场景中查找目标 Mesh。
 *
 * meshPath 不含资源根节点名称：
 * - ''            → 资源本身就是 mesh
 * - 'MeshName'    → 顶层子对象
 * - 'G1/MeshName' → 嵌套查找
 * @param {THREE.Object3D} gltfScene - 资源场景
 * @param {string} meshPath - 路径
 * @returns {THREE.Mesh|null}
 */
export function findMeshByPath(gltfScene, meshPath) {
  if (meshPath === '') {
    return gltfScene.isMesh ? gltfScene : null;
  }

  const pathParts = meshPath.split('/');

  // 单段路径：先查直接子对象，再退化为全树查找（兼容旧行为）
  if (pathParts.length === 1) {
    let found = gltfScene.children.find((c) => c.name === pathParts[0]);
    if (found && found.isMesh) return found;
    let matched = null;
    gltfScene.traverse((child) => {
      if (child.isMesh && child.name === pathParts[0] && !matched) {
        matched = child;
      }
    });
    return matched;
  }

  let currentObj = gltfScene;
  for (let i = 0; i < pathParts.length; i++) {
    currentObj = currentObj.children.find((c) => c.name === pathParts[i]);
    if (!currentObj) break;
  }
  return currentObj && currentObj.isMesh ? currentObj : null;
}

/**
 * 从资源构建 mesh 部件（独立 Mesh），供"导入模型为部件层级"场景使用。
 * @param {Object} asset - 资源
 * @param {Object} obj - 场景对象数据（含 meshPath）
 * @returns {THREE.Mesh|null}
 */
export function buildMeshPart(asset, obj) {
  const targetMesh = findMeshByPath(asset.gltfScene, obj.meshPath);
  if (!targetMesh) return null;

  const geometry = targetMesh.geometry.clone();
  if (!geometry.attributes.normal) {
    geometry.computeVertexNormals();
  }

  let material = Array.isArray(targetMesh.material)
    ? targetMesh.material.map((m) => m.clone())
    : targetMesh.material.clone();
  material = ensureStandardMaterial(material, true);

  if (obj.textureId) {
    const textureAsset = obj.assets?.find((a) => a.id === obj.textureId);
    if (textureAsset && textureAsset.texture) {
      const texture = cloneTexture(textureAsset.texture, obj.uvScale, obj.uvOffset);
      material = ensureStandardMaterial(material, true);
      if (Array.isArray(material)) {
        material = material.map((m) => {
          m.map = texture;
          m.needsUpdate = true;
          return m;
        });
      } else {
        material.map = texture;
        material.needsUpdate = true;
      }
    }
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(obj.position[0], obj.position[1], obj.position[2]);
  mesh.rotation.set(
    THREE.MathUtils.degToRad(obj.rotation[0]),
    THREE.MathUtils.degToRad(obj.rotation[1]),
    THREE.MathUtils.degToRad(obj.rotation[2])
  );
  mesh.scale.set(obj.scale[0], obj.scale[1], obj.scale[2]);
  mesh.userData = { id: obj.id, isMeshPart: true };
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
