/**
 * @file engine/materials.js
 * @description 统一材质工具：把任意材质转换为 MeshStandardMaterial、贴图克隆与 UV 变换。
 * 汇总此前散落在 Viewport.jsx / App.jsx 中的多份重复实现。
 * @module engine/materials
 */

import * as THREE from 'three';

/** 编辑器基础图元默认颜色（此前以 0x4a90d9 / '#4a90d9' 散落多处） */
export const DEFAULT_PRIMITIVE_COLOR = '#4a90d9';

/**
 * 生成默认的 PBR 图元材质。
 * @param {string|number} color - 颜色
 * @returns {THREE.MeshStandardMaterial}
 */
export function createPrimitiveMaterial(color = DEFAULT_PRIMITIVE_COLOR) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.3,
    roughness: 0.7,
  });
}

/**
 * 把任意材质转换为 MeshStandardMaterial。
 *
 * - MeshStandardMaterial：原样返回（可选更新 map）。
 * - 其余类型：基于旧材质属性重建，避免丢失光照。
 *
 * @param {THREE.Material} mat - 旧材质
 * @param {Object} [opts]
 * @param {THREE.Texture} [opts.texture] - 需要应用到新材质的贴图
 * @param {boolean} [opts.deriveFromSpecular=false] - 是否从旧材质 specular/shininess 推导 metalness/roughness
 * @returns {THREE.MeshStandardMaterial}
 */
export function toStandardMaterial(mat, { texture = null, deriveFromSpecular = false } = {}) {
  if (!mat) return createPrimitiveMaterial();

  if (mat.type === 'MeshStandardMaterial') {
    if (texture) {
      mat.map = texture;
      mat.needsUpdate = true;
    }
    return mat;
  }

  const oldMat = mat;

  let metalness = 0.1;
  let roughness = 0.8;

  if (deriveFromSpecular) {
    let specularIntensity = 0;
    if (oldMat.specular) {
      specularIntensity = (oldMat.specular.r + oldMat.specular.g + oldMat.specular.b) / 3;
    }
    metalness = specularIntensity < 0.1 ? 0.0 : Math.min(specularIntensity, 0.5);
    roughness = oldMat.shininess ? Math.max(1 - oldMat.shininess / 100, 0.5) : 0.8;
  }

  const newMat = new THREE.MeshStandardMaterial({
    color: oldMat.color || 0xffffff,
    map: texture || oldMat.map || null,
    transparent: oldMat.transparent,
    opacity: oldMat.opacity,
    side: THREE.FrontSide,
    metalness,
    roughness,
    emissive: oldMat.emissive || 0x000000,
  });
  newMat.needsUpdate = true;
  oldMat.dispose();
  return newMat;
}

/**
 * 将指定贴图应用到单个材质，必要时转换为 MeshStandardMaterial。
 * @param {THREE.Material} mat - 材质（可为数组）
 * @param {THREE.Texture} texture - 贴图
 * @returns {THREE.Material|THREE.Material[]}
 */
export function applyTextureToMaterial(mat, texture) {
  if (Array.isArray(mat)) {
    return mat.map((m) => applyTextureToMaterial(m, texture));
  }
  return toStandardMaterial(mat, { texture });
}

/**
 * 确保一组材质（数组或单个）全部为 MeshStandardMaterial。
 * @param {THREE.Material|THREE.Material[]} material - 材质
 * @param {boolean} [deriveFromSpecular=false] - 是否推导 metalness/roughness
 * @returns {THREE.Material|THREE.Material[]}
 */
export function ensureStandardMaterial(material, deriveFromSpecular = false) {
  if (Array.isArray(material)) {
    return material.map((m) => toStandardMaterial(m, { deriveFromSpecular }));
  }
  return toStandardMaterial(material, { deriveFromSpecular });
}

/**
 * 克隆贴图并设置 UV 变换。
 *
 * 注意：调用方必须负责在不再使用时 dispose 返回的克隆（防止 GPU 泄漏）。
 * @param {THREE.Texture} texture - 源贴图
 * @param {number[]} [uvScale=[1,1]] - UV 缩放
 * @param {number[]} [uvOffset=[0,0]] - UV 偏移
 * @returns {THREE.Texture} 配置好的克隆贴图
 */
export function cloneTexture(texture, uvScale = [1, 1], uvOffset = [0, 0]) {
  const cloned = texture.clone();
  cloned.needsUpdate = true;
  cloned.colorSpace = THREE.SRGBColorSpace;
  cloned.repeat.set(uvScale[0], uvScale[1]);
  cloned.offset.set(uvOffset[0], uvOffset[1]);
  return cloned;
}
