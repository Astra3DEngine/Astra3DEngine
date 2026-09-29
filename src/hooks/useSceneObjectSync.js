/**
 * @file hooks/useSceneObjectSync.js
 * @description Viewport 对象同步：将场景对象数组 diff 到 three mesh 映射（创建/更新/移除）。
 * 从 Viewport.jsx 巨型组件拆分，依赖通过参数显式注入。
 * @module hooks/useSceneObjectSync
 */

import { useEffect } from 'react';
import * as THREE from 'three';
import {
  ensureStandardMaterial,
  applyTextureToMaterial,
  cloneTexture,
  createPrimitiveMaterial,
} from '../engine/materials.js';
import { applyTransformToObject3D } from '../engine/TreeMath.js';
import { buildModelGroup, buildMeshPart, findMeshByPath } from '../engine/ModelLoader.js';
import { createLightFromObject, updateLightTargetFromObject } from '../engine/lights.js';

/** 立方体六个面的约定顺序（与 ObjectFactory 的 faceTextures 键一致） */
export const CUBE_FACE_NAMES = ['right', 'left', 'top', 'bottom', 'front', 'back'];

/** 无贴图时的占位面贴图 */
export const FALLBACK_FACE_TEXTURES = () => ({
  right: null,
  left: null,
  top: null,
  bottom: null,
  front: null,
  back: null,
});

/**
 * @param {Object} refs - three/ref 引用
 * @param {React.RefObject} refs.sceneRef - 场景引用
 * @param {React.RefObject} refs.meshesRef - mesh 映射（id -> Object3D）
 * @param {React.RefObject} refs.assetsRef - 资源引用
 * @param {React.RefObject} refs.defaultLightRef - 默认光引用
 * @param {React.RefObject} refs.lightRenderingEnabledRef - 光渲染开关引用
 * @param {Object} props - 渲染期 props
 * @param {Object[]} props.objects - 场景对象列表
 * @param {Object[]} props.assets - 资源列表
 * @param {boolean} props.lightRenderingEnabled - 光渲染是否开启
 */
export function useSceneObjectSync(
  { sceneRef, meshesRef, assetsRef, defaultLightRef, lightRenderingEnabledRef },
  { objects, assets, lightRenderingEnabled }
) {
  useEffect(() => {
    if (!sceneRef.current) return;

    const hasUserLights = objects.some((obj) => obj.isLight);
    if (defaultLightRef.current) {
      defaultLightRef.current.intensity = hasUserLights ? 0 : 0.2;
      defaultLightRef.current.castShadow = hasUserLights ? false : lightRenderingEnabled;
    }

    const existingIds = new Set(Object.keys(meshesRef.current));
    const newIds = new Set(objects.map((obj) => obj.id));

    // 移除已不存在的对象
    existingIds.forEach((id) => {
      if (!newIds.has(parseInt(id))) {
        const mesh = meshesRef.current[id];
        if (mesh) {
          sceneRef.current.remove(mesh);
          if (mesh.userData.isLight && mesh.target) {
            sceneRef.current.remove(mesh.target);
          }
          if (mesh.geometry) {
            mesh.geometry.dispose();
          }
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else {
              mesh.material.dispose();
            }
          }
          mesh.traverse((child) => {
            if (child !== mesh && child.geometry) child.geometry.dispose();
          });
          delete meshesRef.current[id];
        }
      }
    });

    objects.forEach((obj) => {
      const existingMesh = meshesRef.current[obj.id];

      if (existingMesh) {
        const mesh = existingMesh;

        // model 未加载内容时补充重建（资产已就绪但 Group 为空）
        if (obj.isModel && mesh.userData.isModel && mesh.children.length === 0) {
          const asset = assetsRef.current.find((a) => a.id === obj.assetId);
          if (asset && asset.gltfScene) {
            sceneRef.current.remove(mesh);
            const modelGroup = buildModelGroup(asset, { ...obj, assets: assetsRef.current });
            sceneRef.current.add(modelGroup);
            meshesRef.current[obj.id] = modelGroup;
            return;
          }
        }

        applyTransformToObject3D(mesh, obj);

        if (obj.type === 'cube') {
          const faceTextures = obj.faceTextures || FALLBACK_FACE_TEXTURES();
          if (Array.isArray(mesh.material)) {
            CUBE_FACE_NAMES.forEach((faceName, index) => {
              const textureId = faceTextures[faceName];
              const textureAsset = textureId
                ? assetsRef.current.find((a) => a.id === textureId)
                : null;
              mesh.material[index].color.setStyle(obj.color || '#4a90d9');
              mesh.material[index].map = textureAsset?.texture || null;
              mesh.material[index].needsUpdate = true;
            });
          }
        } else if (obj.type === 'sphere' || obj.type === 'plane') {
          if (mesh.material) {
            mesh.material.color.setStyle(obj.color || '#4a90d9');
            if (obj.textureId) {
              const textureAsset = assetsRef.current.find((a) => a.id === obj.textureId);
              if (textureAsset && textureAsset.texture) {
                const texture = cloneTexture(textureAsset.texture, obj.uvScale, obj.uvOffset);
                mesh.material.map = texture;
                mesh.material.needsUpdate = true;
              } else {
                mesh.material.map = null;
                mesh.material.needsUpdate = true;
              }
            } else if (mesh.material.map) {
              mesh.material.map = null;
              mesh.material.needsUpdate = true;
            }
          }
        } else if (obj.isModel && mesh.userData.isModel) {
          if (obj.textureId) {
            const textureAsset = assetsRef.current.find((a) => a.id === obj.textureId);
            if (textureAsset && textureAsset.texture) {
              const texture = cloneTexture(textureAsset.texture, obj.uvScale, obj.uvOffset);
              mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                  // 模型材质使用 specular 推导的转换，兼容原始行为
                  child.material = ensureStandardMaterial(child.material, true);
                  child.material.map = texture;
                  child.material.needsUpdate = true;
                }
              });
            }
          } else {
            mesh.traverse((child) => {
              if (child.isMesh && child.material) {
                child.material.map = null;
                child.material.needsUpdate = true;
              }
            });
          }
        } else if (obj.type === 'mesh' && mesh.userData.isMeshPart) {
          if (obj.textureId) {
            const textureAsset = assetsRef.current.find((a) => a.id === obj.textureId);
            if (textureAsset && textureAsset.texture) {
              const texture = cloneTexture(textureAsset.texture, obj.uvScale, obj.uvOffset);
              mesh.material = applyTextureToMaterial(mesh.material, texture);
            }
          } else {
            // 清除贴图，恢复原始材质
            const asset = assetsRef.current.find((a) => a.id === obj.assetId);
            if (asset && asset.gltfScene) {
              const targetMesh = findMeshByPath(asset.gltfScene, obj.meshPath);
              if (targetMesh) {
                if (Array.isArray(mesh.material)) {
                  mesh.material.forEach((mat, i) => {
                    if (targetMesh.material[i]) {
                      mat.map = targetMesh.material[i].map;
                      mat.needsUpdate = true;
                    }
                  });
                } else {
                  mesh.material.map = targetMesh.material.map;
                  mesh.material.needsUpdate = true;
                }
              }
            }
          }
        } else if (mesh.material && mesh.material.color) {
          mesh.material.color.setStyle(obj.color || '#4a90d9');
        }

        // 光源属性更新
        if (obj.isLight && mesh.userData.isLight) {
          mesh.color.setStyle(obj.color || '#ffffff');
          mesh.intensity = obj.intensity || 2;
          if (obj.lightType === 'point' || obj.lightType === 'spot') {
            mesh.distance = obj.distance || 10;
            mesh.decay = obj.decay || 1;
          }
          if (obj.lightType === 'spot') {
            mesh.angle = obj.angle || Math.PI / 4;
            mesh.penumbra = obj.penumbra || 0.3;
          }
          if (obj.lightType === 'directional' || obj.lightType === 'spot') {
            updateLightTargetFromObject(mesh, obj);
          }
          if (mesh.userData.visualMesh) {
            mesh.userData.visualMesh.traverse((child) => {
              if (child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach((m) => {
                  if (m.color) m.color.setStyle(obj.color || '#ffffff');
                });
              }
            });
            if (obj.lightType === 'spot') {
              const coneLength = 0.6;
              const coneRadius = coneLength * Math.tan(obj.angle || Math.PI / 4);
              mesh.userData.visualMesh.children.forEach((child) => {
                if (child.geometry) {
                  if (child.geometry.type === 'ConeGeometry') {
                    child.geometry.dispose();
                    child.geometry = new THREE.ConeGeometry(coneRadius, coneLength, 16, 1, true);
                  } else if (child.geometry.type === 'EdgesGeometry') {
                    const newConeGeo = new THREE.ConeGeometry(coneRadius, coneLength, 16, 1, true);
                    child.geometry.dispose();
                    child.geometry = new THREE.EdgesGeometry(newConeGeo);
                    newConeGeo.dispose();
                  }
                }
              });
            }
          }
        }
        return;
      }

      // ===== 新对象创建 =====

      if (obj.isFolder) {
        return;
      }

      if (obj.type === 'mesh' && obj.assetId && obj.meshPath) {
        const asset = assetsRef.current.find((a) => a.id === obj.assetId);
        if (asset && asset.gltfScene) {
          const mesh = buildMeshPart(asset, { ...obj, assets: assetsRef.current });
          if (mesh) {
            sceneRef.current.add(mesh);
            meshesRef.current[obj.id] = mesh;
          }
        }
        return;
      }

      if (obj.isModel && obj.assetId) {
        const asset = assetsRef.current.find((a) => a.id === obj.assetId);
        if (asset && asset.gltfScene) {
          const modelGroup = buildModelGroup(asset, { ...obj, assets: assetsRef.current });
          sceneRef.current.add(modelGroup);
          meshesRef.current[obj.id] = modelGroup;
        }
        return;
      }

      if (obj.isLight) {
        const light = createLightFromObject(obj);
        if (light) {
          if (!lightRenderingEnabledRef.current) {
            light.userData.originalIntensity = light.intensity;
            light.intensity = 0;
            light.castShadow = false;
          }
          sceneRef.current.add(light);
          if (light.userData.visualMesh) {
            light.add(light.userData.visualMesh);
          }
          meshesRef.current[obj.id] = light;
        }
        return;
      }

      // 基础图元
      let geometry;
      switch (obj.type) {
        case 'cube':
          geometry = new THREE.BoxGeometry(1, 1, 1);
          break;
        case 'sphere':
          geometry = new THREE.SphereGeometry(0.5, 32, 32);
          break;
        case 'plane':
          geometry = new THREE.PlaneGeometry(2, 2);
          break;
        default:
          geometry = new THREE.BoxGeometry(1, 1, 1);
      }

      let material;
      if (obj.type === 'cube') {
        const faceTextures = obj.faceTextures || FALLBACK_FACE_TEXTURES();
        material = CUBE_FACE_NAMES.map((faceName) => {
          const textureId = faceTextures[faceName];
          const textureAsset = textureId ? assetsRef.current.find((a) => a.id === textureId) : null;
          if (textureAsset && textureAsset.texture) {
            return new THREE.MeshStandardMaterial({
              map: textureAsset.texture,
              color: obj.color || 0x4a90d9,
              metalness: 0.3,
              roughness: 0.7,
            });
          }
          return createPrimitiveMaterial(obj.color);
        });
      } else if ((obj.type === 'sphere' || obj.type === 'plane') && obj.textureId) {
        const textureAsset = assetsRef.current.find((a) => a.id === obj.textureId);
        if (textureAsset && textureAsset.texture) {
          const texture = cloneTexture(textureAsset.texture, obj.uvScale, obj.uvOffset);
          material = new THREE.MeshStandardMaterial({
            map: texture,
            color: obj.color || 0x4a90d9,
            metalness: 0.3,
            roughness: 0.7,
          });
        } else {
          material = createPrimitiveMaterial(obj.color);
        }
      } else {
        material = createPrimitiveMaterial(obj.color);
      }

      const mesh = new THREE.Mesh(geometry, material);
      applyTransformToObject3D(mesh, obj);
      mesh.userData = { id: obj.id };
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      sceneRef.current.add(mesh);
      meshesRef.current[obj.id] = mesh;
    });
  }, [
    objects,
    assets,
    lightRenderingEnabled,
    sceneRef,
    meshesRef,
    assetsRef,
    defaultLightRef,
    lightRenderingEnabledRef,
  ]);
}
