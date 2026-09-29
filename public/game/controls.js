import * as THREE from 'three';
import { BLOCK_TYPES, BLOCK_COLORS, JUMP_FORCE, WORLD_SIZE } from './config.js';
import { decodeKey } from './world.js';
import { getInstancedMeshes, addBlock, removeBlock } from './blocks.js';
import {
  wouldCollide,
  setMoveState,
  setIsCrouching,
  getVelocity,
  getCanJump,
  setCanJump,
  getIsCrouching,
} from './player.js';

let selectedBlockType = BLOCK_TYPES.GRASS;
let selectedIndex = 0;
let isLocked = false;
let camera;

const raycaster = new THREE.Raycaster();
raycaster.far = 5;
const pointer = new THREE.Vector2(0, 0);

const BLOCK_LIST = [
  BLOCK_TYPES.GRASS,
  BLOCK_TYPES.DIRT,
  BLOCK_TYPES.STONE,
  BLOCK_TYPES.WOOD,
  BLOCK_TYPES.LEAVES,
  BLOCK_TYPES.SAND,
];

const SENSITIVITY = 0.002;

export function getIsLocked() {
  return isLocked;
}

export function getSelectedBlockType() {
  return selectedBlockType;
}

export function initControls(pCamera, renderer) {
  camera = pCamera;

  const blocker = document.getElementById('blocker');
  const playBtn = document.getElementById('playBtn');
  const crosshair = document.getElementById('crosshair');
  const hotbar = document.getElementById('hotbar');
  const debug = document.getElementById('debug');
  const fps = document.getElementById('fps');

  playBtn.addEventListener('click', () => renderer.domElement.requestPointerLock());

  document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === renderer.domElement;
    blocker.classList.toggle('hidden', isLocked);
    crosshair.style.display = isLocked ? 'block' : 'none';
    hotbar.style.display = isLocked ? 'flex' : 'none';
    debug.style.display = isLocked ? 'block' : 'none';
    fps.style.display = isLocked ? 'block' : 'none';
  });

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('wheel', handleWheel, { passive: false });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}

function handleKeyDown(e) {
  if (!isLocked) return;

  switch (e.code) {
    case 'KeyW':
      setMoveState({ forward: true });
      break;
    case 'KeyS':
      setMoveState({ backward: true });
      break;
    case 'KeyA':
      setMoveState({ left: true });
      break;
    case 'KeyD':
      setMoveState({ right: true });
      break;
    case 'Space':
      if (getCanJump()) {
        getVelocity().y = JUMP_FORCE;
        setCanJump(false);
      }
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      setIsCrouching(true);
      break;
    case 'Digit1':
    case 'Digit2':
    case 'Digit3':
    case 'Digit4':
    case 'Digit5':
    case 'Digit6':
      selectedIndex = parseInt(e.code.slice(-1)) - 1;
      selectedBlockType = BLOCK_LIST[selectedIndex];
      updateHotbarSelection();
      break;
    case 'KeyE':
      toggleInventory();
      break;
  }
}

function handleKeyUp(e) {
  switch (e.code) {
    case 'KeyW':
      setMoveState({ forward: false });
      break;
    case 'KeyS':
      setMoveState({ backward: false });
      break;
    case 'KeyA':
      setMoveState({ left: false });
      break;
    case 'KeyD':
      setMoveState({ right: false });
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      setIsCrouching(false);
      break;
  }
}

function handleMouseMove(e) {
  if (!isLocked) return;

  const movementX = e.movementX || 0;
  const movementY = e.movementY || 0;

  camera.rotation.order = 'YXZ';
  camera.rotation.y -= movementX * SENSITIVITY;
  camera.rotation.x -= movementY * SENSITIVITY;
  camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
}

function handleMouseDown(e) {
  if (!isLocked) return;

  raycaster.setFromCamera(pointer, camera);
  const meshes = Object.values(getInstancedMeshes());
  const intersects = raycaster.intersectObjects(meshes);

  if (intersects.length > 0) {
    const intersect = intersects[0];
    const mesh = intersect.object;
    const instanceId = intersect.instanceId;

    for (const [key, idx] of mesh.userData.blockIndices) {
      if (idx === instanceId) {
        const { x, y, z } = decodeKey(key);
        if (e.button === 0) {
          removeBlock(x, y, z);
        } else if (e.button === 2) {
          const normal = intersect.face.normal;
          const newX = x + Math.round(normal.x);
          const newY = y + Math.round(normal.y);
          const newZ = z + Math.round(normal.z);

          if (
            !wouldCollide(newX, newY, newZ, camera.position.x, camera.position.y, camera.position.z)
          ) {
            addBlock(newX, newY, newZ, selectedBlockType);
          }
        }
        break;
      }
    }
  }
}

function handleWheel(e) {
  if (!isLocked) return;
  e.preventDefault();

  const delta = Math.sign(e.deltaY);
  selectedIndex = (selectedIndex + delta + BLOCK_LIST.length) % BLOCK_LIST.length;
  selectedBlockType = BLOCK_LIST[selectedIndex];
  updateHotbarSelection();
}

function updateHotbarSelection() {
  document.querySelectorAll('.hotbar-slot').forEach((slot) => {
    slot.classList.toggle('selected', parseInt(slot.dataset.type) === selectedBlockType);
  });
}

function toggleInventory() {
  const inventory = document.getElementById('inventory');
  if (inventory.style.display === 'flex') {
    inventory.style.display = 'none';
  } else {
    inventory.style.display = 'flex';
  }
}

export function createHotbar() {
  const hotbar = document.getElementById('hotbar');
  const blocks = [
    BLOCK_TYPES.GRASS,
    BLOCK_TYPES.DIRT,
    BLOCK_TYPES.STONE,
    BLOCK_TYPES.WOOD,
    BLOCK_TYPES.LEAVES,
    BLOCK_TYPES.SAND,
  ];

  blocks.forEach((type, index) => {
    const slot = document.createElement('div');
    slot.className = 'hotbar-slot' + (index === 0 ? ' selected' : '');
    slot.dataset.type = type;
    slot.dataset.index = index;

    const slotNumber = document.createElement('span');
    slotNumber.className = 'slot-number';
    slotNumber.textContent = index + 1;
    slot.appendChild(slotNumber);

    const canvas = createBlockIcon(type);
    slot.appendChild(canvas);
    hotbar.appendChild(slot);
  });
}

export function createInventory() {
  const inventory = document.getElementById('inventory');
  const blocks = [
    BLOCK_TYPES.GRASS,
    BLOCK_TYPES.DIRT,
    BLOCK_TYPES.STONE,
    BLOCK_TYPES.WOOD,
    BLOCK_TYPES.LEAVES,
    BLOCK_TYPES.SAND,
  ];

  for (let i = 0; i < 27; i++) {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';

    if (i < blocks.length) {
      const canvas = createBlockIcon(blocks[i]);
      slot.appendChild(canvas);
      slot.dataset.type = blocks[i];

      slot.addEventListener('click', () => {
        selectedBlockType = blocks[i];
        selectedIndex = i;
        updateHotbarSelection();
        inventory.style.display = 'none';
      });
    }

    inventory.appendChild(slot);
  }
}

function createBlockIcon(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#' + BLOCK_COLORS[type].toString(16).padStart(6, '0');
  ctx.fillRect(2, 2, 28, 28);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, 28, 28);
  return canvas;
}
