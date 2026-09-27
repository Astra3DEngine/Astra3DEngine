/**
 * @file stores/useAssetsStore.js
 * @description 资源状态 store：资产列表、选中与导入/删除/重命名，以及模型部件层级导入。
 * 承载原 App.jsx 中的 GLTF/OBJ/纹理加载逻辑。
 * @module stores/useAssetsStore
 */

import { create } from 'zustand';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { generateUniqueName } from '../utils/names.js';
import { resolveGltfResourceUrl } from '../utils/gltfResources.js';
import { toStandardMaterial } from '../engine/materials.js';
import { useScenesStore } from './useScenesStore.js';
import { useSelectionStore } from './useSelectionStore.js';

const gltfLoader = new GLTFLoader();
const objLoader = new OBJLoader();
const textureLoader = new THREE.TextureLoader();

const MODEL_EXTS = ['gltf', 'glb', 'obj'];
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];

/** 材质统一转换（模型导入时用，specular 推导 metalness/roughness） */
function convertMaterial(mat) {
  if (
    mat.type === 'MeshBasicMaterial' ||
    mat.type === 'MeshLambertMaterial' ||
    mat.type === 'MeshPhongMaterial'
  ) {
    return toStandardMaterial(mat, { deriveFromSpecular: true });
  }
  return mat;
}

function convertMaterials(material) {
  if (Array.isArray(material)) {
    return material.map(convertMaterial);
  }
  return convertMaterial(material);
}

/** 遍历模型设置阴影与法线 */
function prepareModelScene(scene) {
  scene.traverse((child) => {
    if (child.isMesh) {
      child.geometry.computeBoundingBox();
      child.geometry.computeVertexNormals();
      child.castShadow = true;
      child.receiveShadow = true;
      child.material = convertMaterials(child.material);
    }
  });
}

export const useAssetsStore = create((set, get) => ({
  assets: [],
  selectedAsset: null,

  selectAsset: (asset) => {
    set({ selectedAsset: asset });
    const { assets } = get();
    const live = assets.find((a) => a.id === asset.id) || asset;
    if (live.assetType === 'model' && live.gltfScene) {
      useAssetsStore.getState().importModelParts(live);
    } else if (live.assetType === 'model') {
      useScenesStore.getState().addObject('model', live);
    }
  },

  /**
   * 导入资源文件。
   * @param {File|{file: File, resourceMap: Map}} fileOrObject - 文件或带 resourceMap 的 GLTF 包
   */
  importAsset: (fileOrObject) => {
    if (fileOrObject && fileOrObject.file && fileOrObject.resourceMap) {
      useAssetsStore.getState()._importGltfWithResources(fileOrObject);
      return;
    }

    const file = fileOrObject;
    const fileExt = file.name.split('.').pop().toLowerCase();
    const assetType = MODEL_EXTS.includes(fileExt)
      ? 'model'
      : IMAGE_EXTS.includes(fileExt)
        ? 'texture'
        : 'unknown';

    const asset = {
      id: Date.now(),
      name: file.name,
      type: fileExt,
      assetType,
      file,
      url: URL.createObjectURL(file),
    };

    if (assetType === 'model') {
      if (fileExt === 'obj') {
        objLoader.load(
          asset.url,
          (obj) => {
            const box = new THREE.Box3().setFromObject(obj);
            const center = new THREE.Vector3();
            box.getCenter(center);

            asset.gltfScene = obj;
            asset.center = center.clone();
            asset.size = box.getSize(new THREE.Vector3());

            obj.traverse((child) => {
              if (child.isMesh) {
                child.position.sub(center);
                child.geometry.computeBoundingBox();
                child.geometry.computeVertexNormals();
                child.castShadow = true;
                child.receiveShadow = true;

                const oldMat = child.material;
                child.material = convertMaterials(child.material);
                if (oldMat && oldMat !== child.material) oldMat.dispose();
              }
            });
            obj.position.set(0, 0, 0);

            set((s) => ({ assets: [...s.assets, asset] }));
          },
          undefined,
          (error) => {
            console.error('Error loading OBJ:', error);
          }
        );
      } else {
        gltfLoader.load(
          asset.url,
          (gltf) => {
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const center = new THREE.Vector3();
            box.getCenter(center);

            asset.gltfScene = gltf.scene;
            asset.center = center.clone();
            asset.size = box.getSize(new THREE.Vector3());

            prepareModelScene(gltf.scene);

            set((s) => ({ assets: [...s.assets, asset] }));
          },
          undefined,
          (error) => {
            console.error('Error loading GLTF:', error);
          }
        );
      }
    } else if (assetType === 'texture') {
      textureLoader.load(
        asset.url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          asset.texture = texture;
          set((s) => ({ assets: [...s.assets, asset] }));
        },
        undefined,
        (error) => {
          console.error('Error loading texture:', error);
          set((s) => ({ assets: [...s.assets, asset] }));
        }
      );
    } else {
      set((s) => ({ assets: [...s.assets, asset] }));
    }
  },

  /** 导入带 resourceMap 的 GLTF（模型文件夹） */
  _importGltfWithResources: ({ file, resourceMap }) => {
    const asset = {
      id: Date.now(),
      name: file.name,
      type: 'gltf',
      assetType: 'model',
      file,
      url: URL.createObjectURL(file),
    };

    const urlMap = new Map();
    for (const [relativePath, resourceFile] of resourceMap) {
      urlMap.set(relativePath, URL.createObjectURL(resourceFile));
    }

    const manager = new THREE.LoadingManager();
    manager.setURLModifier((url) => {
      const resolved = resolveGltfResourceUrl(url, urlMap);
      if (resolved === url && !url.startsWith('blob:') && !url.startsWith('data:')) {
        console.warn(`GLTF resource not found in package: "${url}"`);
      }
      return resolved;
    });

    const loader = new GLTFLoader(manager);
    const reader = new FileReader();

    const release = () => {
      for (const blobUrl of urlMap.values()) {
        URL.revokeObjectURL(blobUrl);
      }
    };

    reader.onload = (e) => {
      loader.parse(
        e.target.result,
        '',
        (gltf) => {
          try {
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const center = new THREE.Vector3();
            box.getCenter(center);

            asset.gltfScene = gltf.scene;
            asset.center = center.clone();
            asset.size = box.getSize(new THREE.Vector3());

            prepareModelScene(gltf.scene);

            set((s) => ({ assets: [...s.assets, asset] }));
          } catch (parseErr) {
            console.error('Error preparing GLTF scene:', parseErr);
          }
          release();
        },
        (error) => {
          console.error('Error parsing GLTF (missing external resources?):', error);
          release();
        }
      );
    };

    reader.readAsArrayBuffer(file);
  },

  deleteAsset: (asset) => {
    if (asset.url) {
      URL.revokeObjectURL(asset.url);
    }
    set((s) => ({
      assets: s.assets.filter((a) => a.id !== asset.id),
      selectedAsset: s.selectedAsset?.id === asset.id ? null : s.selectedAsset,
    }));
  },

  renameAsset: (asset, newName) => {
    set((s) => ({
      assets: s.assets.map((a) => (a.id === asset.id ? { ...a, name: newName } : a)),
    }));
  },

  /** 导入模型为部件层级 */
  importModelParts: (asset) => {
    if (!asset || !asset.gltfScene) return;

    const objects = useScenesStore.getState().getCurrentObjects();

    const modelBaseName = asset.name.replace(/\.[^.]+$/, '');
    const rootFolderName = generateUniqueName(modelBaseName, objects);
    const baseId = Date.now();

    const modelCenter = asset.center || new THREE.Vector3(0, 0, 0);
    const allNewObjects = [];
    let idCounter = 0;

    const parseObject3D = (threeObj, parentId, meshPath) => {
      const objId = baseId + idCounter;
      idCounter++;

      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();
      threeObj.getWorldPosition(worldPos);
      threeObj.getWorldQuaternion(worldQuat);
      threeObj.getWorldScale(worldScale);

      const relativePos = worldPos.clone().sub(modelCenter);
      const worldEuler = new THREE.Euler().setFromQuaternion(worldQuat);

      const objName = generateUniqueName(threeObj.name || (threeObj.isMesh ? 'Mesh' : 'Group'), [
        ...objects,
        ...allNewObjects,
      ]);

      if (threeObj.isMesh) {
        const meshObj = {
          id: objId,
          name: objName,
          type: 'mesh',
          position: [relativePos.x, relativePos.y, relativePos.z],
          rotation: [
            THREE.MathUtils.radToDeg(worldEuler.x),
            THREE.MathUtils.radToDeg(worldEuler.y),
            THREE.MathUtils.radToDeg(worldEuler.z),
          ],
          scale: [worldScale.x, worldScale.y, worldScale.z],
          parentId,
          assetId: asset.id,
          meshPath,
          textureId: null,
          uvScale: [1, 1],
          uvOffset: [0, 0],
        };
        allNewObjects.push(meshObj);
        return meshObj;
      }

      const folderObj = {
        id: objId,
        name: objName,
        type: 'folder',
        position: [relativePos.x, relativePos.y, relativePos.z],
        rotation: [
          THREE.MathUtils.radToDeg(worldEuler.x),
          THREE.MathUtils.radToDeg(worldEuler.y),
          THREE.MathUtils.radToDeg(worldEuler.z),
        ],
        scale: [worldScale.x, worldScale.y, worldScale.z],
        isFolder: true,
        children: [],
        parentId,
        assetId: asset.id,
        meshPath,
      };

      threeObj.children.forEach((child) => {
        const childMeshPath = meshPath ? `${meshPath}/${child.name}` : child.name;
        const childObj = parseObject3D(child, objId, childMeshPath);
        if (childObj) {
          folderObj.children.push(childObj.id);
        }
      });

      allNewObjects.push(folderObj);
      return folderObj;
    };

    const rootObj = parseObject3D(asset.gltfScene, null, '');
    if (rootObj) {
      const existingNames = [...objects, ...allNewObjects.filter((o) => o.id !== rootObj.id)];
      rootObj.name = generateUniqueName(rootFolderName, existingNames);
    }

    if (rootObj) {
      useSelectionStore.getState().replaceSelection(rootObj, allNewObjects);
    }
    useScenesStore.getState().updateCurrentSceneObjects([...objects, ...allNewObjects]);
  },
}));
