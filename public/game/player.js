import * as THREE from 'three';
import { PLAYER_HEIGHT, PLAYER_RADIUS, BLOCK_TYPES } from './config.js';
import { getBlock } from './world.js';

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = true;
let isCrouching = false;

export function getVelocity() {
  return velocity;
}

export function getCanJump() {
  return canJump;
}

export function setCanJump(value) {
  canJump = value;
}

export function getMoveState() {
  return { moveForward, moveBackward, moveLeft, moveRight };
}

export function setMoveState(state) {
  if (state.forward !== undefined) moveForward = state.forward;
  if (state.backward !== undefined) moveBackward = state.backward;
  if (state.left !== undefined) moveLeft = state.left;
  if (state.right !== undefined) moveRight = state.right;
}

export function getIsCrouching() {
  return isCrouching;
}

export function setIsCrouching(value) {
  isCrouching = value;
}

export function checkCollision(newX, newY, newZ) {
  const checks = [
    [newX - PLAYER_RADIUS, newY, newZ - PLAYER_RADIUS],
    [newX + PLAYER_RADIUS, newY, newZ - PLAYER_RADIUS],
    [newX - PLAYER_RADIUS, newY, newZ + PLAYER_RADIUS],
    [newX + PLAYER_RADIUS, newY, newZ + PLAYER_RADIUS],
    [newX - PLAYER_RADIUS, newY - PLAYER_HEIGHT, newZ - PLAYER_RADIUS],
    [newX + PLAYER_RADIUS, newY - PLAYER_HEIGHT, newZ - PLAYER_RADIUS],
    [newX - PLAYER_RADIUS, newY - PLAYER_HEIGHT, newZ + PLAYER_RADIUS],
    [newX + PLAYER_RADIUS, newY - PLAYER_HEIGHT, newZ + PLAYER_RADIUS],
    [newX, newY - PLAYER_HEIGHT / 2, newZ],
  ];
  for (const [cx, cy, cz] of checks) {
    if (getBlock(cx, cy, cz) !== BLOCK_TYPES.AIR) return true;
  }
  return false;
}

export function checkGrounded(px, py, pz) {
  const checks = [
    [px - PLAYER_RADIUS, py - PLAYER_HEIGHT - 0.1, pz - PLAYER_RADIUS],
    [px + PLAYER_RADIUS, py - PLAYER_HEIGHT - 0.1, pz - PLAYER_RADIUS],
    [px - PLAYER_RADIUS, py - PLAYER_HEIGHT - 0.1, pz + PLAYER_RADIUS],
    [px + PLAYER_RADIUS, py - PLAYER_HEIGHT - 0.1, pz + PLAYER_RADIUS],
    [px, py - PLAYER_HEIGHT - 0.1, pz],
  ];
  for (const [cx, cy, cz] of checks) {
    if (getBlock(cx, cy, cz) !== BLOCK_TYPES.AIR) return true;
  }
  return false;
}

export function wouldCollide(x, y, z, px, py, pz) {
  return (
    px - PLAYER_RADIUS < x + 1 &&
    px + PLAYER_RADIUS > x &&
    py - PLAYER_HEIGHT < y + 1 &&
    py > y &&
    pz - PLAYER_RADIUS < z + 1 &&
    pz + PLAYER_RADIUS > z
  );
}

function checkSneakGround(px, py, pz) {
  const footY = py - PLAYER_HEIGHT - 0.5;
  const checks = [
    [px - PLAYER_RADIUS * 0.8, footY, pz - PLAYER_RADIUS * 0.8],
    [px + PLAYER_RADIUS * 0.8, footY, pz - PLAYER_RADIUS * 0.8],
    [px - PLAYER_RADIUS * 0.8, footY, pz + PLAYER_RADIUS * 0.8],
    [px + PLAYER_RADIUS * 0.8, footY, pz + PLAYER_RADIUS * 0.8],
    [px, footY, pz],
  ];
  for (const [cx, cy, cz] of checks) {
    if (getBlock(cx, cy, cz) !== BLOCK_TYPES.AIR) return true;
  }
  return false;
}

export function updatePlayer(camera, delta, GRAVITY, JUMP_FORCE, MOVE_SPEED) {
  velocity.y -= GRAVITY * delta;

  direction.z = Number(moveForward) - Number(moveBackward);
  direction.x = Number(moveRight) - Number(moveLeft);
  direction.normalize();

  const speed = isCrouching ? MOVE_SPEED * 0.3 : MOVE_SPEED;

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3();
  right.crossVectors(forward, new THREE.Vector3(0, 1, 0));

  const moveX = (forward.x * direction.z + right.x * direction.x) * speed * delta;
  const moveZ = (forward.z * direction.z + right.z * direction.x) * speed * delta;

  const newX = camera.position.x + moveX;
  const newY = camera.position.y + velocity.y * delta;
  const newZ = camera.position.z + moveZ;

  const canMoveX = !checkCollision(newX, camera.position.y, camera.position.z);
  const canMoveZ = !checkCollision(camera.position.x, camera.position.y, newZ);

  if (isCrouching) {
    if (canMoveX && !checkSneakGround(newX, camera.position.y, camera.position.z)) {
      // 阻止移动到没有地面的位置
    } else if (canMoveX) {
      camera.position.x = newX;
    }

    if (canMoveZ && !checkSneakGround(camera.position.x, camera.position.y, newZ)) {
      // 阻止移动到没有地面的位置
    } else if (canMoveZ) {
      camera.position.z = newZ;
    }
  } else {
    if (canMoveX) camera.position.x = newX;
    if (canMoveZ) camera.position.z = newZ;
  }

  if (!checkCollision(camera.position.x, newY, camera.position.z)) {
    camera.position.y = newY;
  } else {
    if (velocity.y < 0) canJump = true;
    velocity.y = 0;
  }

  if (checkGrounded(camera.position.x, camera.position.y, camera.position.z)) {
    canJump = true;
  }

  return { velocity };
}
