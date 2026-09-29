import * as THREE from 'three';
import { BLOCK_SIZE, BLOCK_COLORS, BLOCK_TOP_COLORS, BLOCK_TYPES } from './config.js';
import { getWorld, getBlockData, getBlockKey, decodeKey, setBlock } from './world.js';

const instancedMeshes = {};
const tempMatrix = new THREE.Matrix4();
const tempPosition = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();
const tempScale = new THREE.Vector3(1, 1, 1);

let scene;
let geometry;

export function getInstancedMeshes() {
  return instancedMeshes;
}

export function initRenderer(pScene) {
  scene = pScene;
  geometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function createBlockMaterial(blockType) {
  const topColor = BLOCK_TOP_COLORS[blockType];
  const sideColor = BLOCK_COLORS[blockType];
  return [
    new THREE.MeshLambertMaterial({ color: sideColor }),
    new THREE.MeshLambertMaterial({ color: sideColor }),
    new THREE.MeshLambertMaterial({ color: topColor }),
    new THREE.MeshLambertMaterial({ color: sideColor }),
    new THREE.MeshLambertMaterial({ color: sideColor }),
    new THREE.MeshLambertMaterial({ color: sideColor }),
  ];
}

export function buildInstancedMeshes() {
  const world = getWorld();
  const blockData = getBlockData();

  const typeCounts = {};
  for (const type of Object.values(BLOCK_TYPES)) {
    if (type !== BLOCK_TYPES.AIR) typeCounts[type] = 0;
  }

  for (const type of world.values()) {
    typeCounts[type]++;
  }

  for (const [type, count] of Object.entries(typeCounts)) {
    if (count === 0) continue;

    const materials = createBlockMaterial(parseInt(type));
    const mesh = new THREE.InstancedMesh(geometry, materials, count + 1000);
    mesh.userData.blockType = parseInt(type);
    mesh.userData.blockIndices = new Map();

    let index = 0;
    for (const [key, blockType] of world) {
      if (blockType === parseInt(type)) {
        const { x, y, z } = decodeKey(key);
        tempPosition.set(x + 0.5, y + 0.5, z + 0.5);
        tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
        mesh.setMatrixAt(index, tempMatrix);
        mesh.userData.blockIndices.set(key, index);
        blockData[key] = { mesh, index, x, y, z };
        index++;
      }
    }

    mesh.count = index;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    scene.add(mesh);
    instancedMeshes[type] = mesh;
  }
}

export function addBlock(x, y, z, type) {
  const world = getWorld();
  const blockData = getBlockData();
  const key = getBlockKey(x, y, z);
  if (world.has(key)) return false;

  setBlock(x, y, z, type);

  let mesh = instancedMeshes[type];
  if (!mesh) {
    const materials = createBlockMaterial(type);
    mesh = new THREE.InstancedMesh(geometry, materials, 2000);
    mesh.userData.blockType = type;
    mesh.userData.blockIndices = new Map();
    mesh.count = 0;
    scene.add(mesh);
    instancedMeshes[type] = mesh;
  }

  if (mesh.count >= mesh.instanceMatrix.count) {
    const oldMesh = mesh;
    const newMesh = new THREE.InstancedMesh(geometry, oldMesh.material, mesh.count + 1000);
    newMesh.userData = oldMesh.userData;
    newMesh.count = oldMesh.count;
    for (let i = 0; i < mesh.count; i++) {
      oldMesh.getMatrixAt(i, tempMatrix);
      newMesh.setMatrixAt(i, tempMatrix);
    }
    newMesh.instanceMatrix.needsUpdate = true;
    scene.remove(oldMesh);
    scene.add(newMesh);
    mesh = newMesh;
    instancedMeshes[type] = mesh;

    for (const [k, idx] of mesh.userData.blockIndices) {
      blockData[k].mesh = mesh;
    }
  }

  const index = mesh.count;
  tempPosition.set(x + 0.5, y + 0.5, z + 0.5);
  tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
  mesh.setMatrixAt(index, tempMatrix);
  mesh.userData.blockIndices.set(key, index);
  blockData[key] = { mesh, index, x, y, z };
  mesh.count++;
  mesh.instanceMatrix.needsUpdate = true;

  return true;
}

export function removeBlock(x, y, z) {
  const world = getWorld();
  const blockData = getBlockData();
  const key = getBlockKey(x, y, z);
  const data = blockData[key];
  if (!data) return false;

  const { mesh, index } = data;
  mesh.userData.blockIndices.delete(key);
  delete blockData[key];
  world.delete(key);

  const lastIndex = mesh.count - 1;
  if (index < lastIndex) {
    mesh.getMatrixAt(lastIndex, tempMatrix);
    mesh.setMatrixAt(index, tempMatrix);

    for (const [k, idx] of mesh.userData.blockIndices) {
      if (idx === lastIndex) {
        mesh.userData.blockIndices.set(k, index);
        blockData[k].index = index;
        break;
      }
    }
  }

  mesh.count--;
  mesh.instanceMatrix.needsUpdate = true;

  return true;
}
