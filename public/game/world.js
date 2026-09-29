import { BLOCK_TYPES, WORLD_SIZE } from './config.js';

const world = new Map();
const blockData = {};

export function getWorld() {
  return world;
}

export function getBlockData() {
  return blockData;
}

export function getBlockKey(x, y, z) {
  return (Math.floor(x) << 20) | (Math.floor(y) << 10) | Math.floor(z);
}

export function decodeKey(key) {
  return {
    x: (key >> 20) & 0x3ff,
    y: (key >> 10) & 0x3ff,
    z: key & 0x3ff,
  };
}

export function getBlock(x, y, z) {
  return world.get(getBlockKey(x, y, z)) || BLOCK_TYPES.AIR;
}

export function setBlock(x, y, z, type) {
  const key = getBlockKey(x, y, z);
  if (type === BLOCK_TYPES.AIR) {
    world.delete(key);
  } else {
    world.set(key, type);
  }
}

function noise2D(x, z, scale, octaves) {
  let value = 0;
  let amplitude = 1;
  let frequency = scale;

  for (let i = 0; i < octaves; i++) {
    value +=
      amplitude *
      (Math.sin(x * frequency) * Math.cos(z * frequency) +
        Math.sin((x + z) * frequency * 0.7) * 0.5);
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value;
}

function noise3D(x, y, z, scale) {
  return (
    Math.sin(x * scale) * Math.cos(y * scale) * Math.sin(z * scale) +
    Math.sin((x + y) * scale * 0.7) * Math.cos((y + z) * scale * 0.7) * 0.5 +
    Math.cos((x + z) * scale * 0.5) * Math.sin(y * scale * 0.5) * 0.3
  );
}

export function generateWorld() {
  for (let x = 0; x < WORLD_SIZE; x++) {
    for (let z = 0; z < WORLD_SIZE; z++) {
      const heightNoise = noise2D(x, z, 0.08, 3);
      const height = Math.floor(12 + heightNoise * 5);

      for (let y = 0; y <= height; y++) {
        const caveNoise = noise3D(x, y, z, 0.15);
        const isCave = y > 2 && y < height - 2 && caveNoise > 0.6;

        if (isCave) continue;

        let blockType;
        if (y === height) blockType = BLOCK_TYPES.GRASS;
        else if (y >= height - 2) blockType = BLOCK_TYPES.DIRT;
        else blockType = BLOCK_TYPES.STONE;
        setBlock(x, y, z, blockType);
      }
    }
  }

  generateCaveEntrances();

  for (let i = 0; i < 12; i++) {
    const tx = Math.floor(Math.random() * (WORLD_SIZE - 8)) + 4;
    const tz = Math.floor(Math.random() * (WORLD_SIZE - 8)) + 4;
    let groundHeight = 0;
    for (let y = 30; y >= 0; y--) {
      if (getBlock(tx, y, tz) !== BLOCK_TYPES.AIR) {
        groundHeight = y + 1;
        break;
      }
    }
    generateTree(tx, groundHeight, tz);
  }
}

function generateCaveEntrances() {
  const entranceCount = 3;

  for (let i = 0; i < entranceCount; i++) {
    const ex = Math.floor(Math.random() * (WORLD_SIZE - 10)) + 5;
    const ez = Math.floor(Math.random() * (WORLD_SIZE - 10)) + 5;

    let surfaceY = 0;
    for (let y = 30; y >= 0; y--) {
      if (getBlock(ex, y, ez) !== BLOCK_TYPES.AIR) {
        surfaceY = y;
        break;
      }
    }

    const entranceRadius = 2;
    for (let dx = -entranceRadius; dx <= entranceRadius; dx++) {
      for (let dz = -entranceRadius; dz <= entranceRadius; dz++) {
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist <= entranceRadius) {
          for (let y = surfaceY; y >= surfaceY - 8; y--) {
            const currentDist = dist * (1 - (surfaceY - y) / 10);
            if (currentDist < entranceRadius) {
              setBlock(ex + dx, y, ez + dz, BLOCK_TYPES.AIR);
            }
          }
        }
      }
    }

    for (let y = surfaceY - 8; y >= 3; y--) {
      setBlock(ex, y, ez, BLOCK_TYPES.AIR);
      if (Math.random() < 0.3) {
        setBlock(ex + 1, y, ez, BLOCK_TYPES.AIR);
        setBlock(ex - 1, y, ez, BLOCK_TYPES.AIR);
      }
    }
  }
}

function generateTree(x, y, z) {
  const trunkHeight = 4 + Math.floor(Math.random() * 2);

  for (let i = 0; i < trunkHeight; i++) {
    setBlock(x, y + i, z, BLOCK_TYPES.WOOD);
  }

  const leafStart = y + trunkHeight - 2;
  const leafHeight = 3;

  for (let dy = 0; dy < leafHeight; dy++) {
    const radius = dy === 0 ? 2 : dy === leafHeight - 1 ? 1 : 2;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (dx === 0 && dz === 0 && dy < leafHeight - 1) continue;

        const dist = Math.abs(dx) + Math.abs(dz);
        if (dist <= radius + 1) {
          setBlock(x + dx, leafStart + dy, z + dz, BLOCK_TYPES.LEAVES);
        }
      }
    }
  }

  setBlock(x, leafStart + leafHeight, z, BLOCK_TYPES.LEAVES);
}
