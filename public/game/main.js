import * as THREE from 'three';
import { WORLD_SIZE, GRAVITY, JUMP_FORCE, MOVE_SPEED, BLOCK_TYPES } from './config.js';
import { getWorld, generateWorld } from './world.js';
import { initRenderer, buildInstancedMeshes } from './blocks.js';
import { updatePlayer, getVelocity } from './player.js';
import { initControls, createHotbar, createInventory, getIsLocked } from './controls.js';

let scene, camera, renderer;
let lastTime = 0;
let frameCount = 0;
let fpsTime = 0;
let currentFps = 0;

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 30, 80);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(WORLD_SIZE / 2, 20, WORLD_SIZE / 2);

  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(1);
  document.body.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(50, 100, 50);
  scene.add(directionalLight);

  initRenderer(scene);
  generateWorld();
  buildInstancedMeshes();
  createHotbar();
  createInventory();
  initControls(camera, renderer);

  window.addEventListener('resize', onWindowResize);
  animate();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(time = 0) {
  requestAnimationFrame(animate);

  const delta = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;

  frameCount++;
  fpsTime += delta;
  if (fpsTime >= 0.5) {
    currentFps = Math.round(frameCount / fpsTime);
    frameCount = 0;
    fpsTime = 0;
  }

  if (getIsLocked()) {
    updatePlayer(camera, delta, GRAVITY, JUMP_FORCE, MOVE_SPEED);

    if (camera.position.y < -10) {
      camera.position.set(WORLD_SIZE / 2, 20, WORLD_SIZE / 2);
      getVelocity().set(0, 0, 0);
    }

    document.getElementById('debug').innerHTML =
      `X: ${camera.position.x.toFixed(1)} Y: ${camera.position.y.toFixed(1)} Z: ${camera.position.z.toFixed(1)}<br>方块: ${getWorld().size}`;

    document.getElementById('fps').textContent = `${currentFps} FPS`;
  }

  renderer.render(scene, camera);
}

init();
