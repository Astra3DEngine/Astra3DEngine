export const BLOCK_SIZE = 1;
export const WORLD_SIZE = 48;
export const GRAVITY = 25;
export const JUMP_FORCE = 7.75;
export const MOVE_SPEED = 5;
export const PLAYER_HEIGHT = 1.7;
export const PLAYER_RADIUS = 0.3;

export const BLOCK_TYPES = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  WOOD: 4,
  LEAVES: 5,
  SAND: 6,
};

export const BLOCK_COLORS = {
  [BLOCK_TYPES.GRASS]: 0x4a9c2d,
  [BLOCK_TYPES.DIRT]: 0x8b5a2b,
  [BLOCK_TYPES.STONE]: 0x808080,
  [BLOCK_TYPES.WOOD]: 0x8b4513,
  [BLOCK_TYPES.LEAVES]: 0x228b22,
  [BLOCK_TYPES.SAND]: 0xf4d03f,
};

export const BLOCK_TOP_COLORS = {
  [BLOCK_TYPES.GRASS]: 0x5cb33b,
  [BLOCK_TYPES.DIRT]: 0x8b5a2b,
  [BLOCK_TYPES.STONE]: 0x808080,
  [BLOCK_TYPES.WOOD]: 0x8b4513,
  [BLOCK_TYPES.LEAVES]: 0x228b22,
  [BLOCK_TYPES.SAND]: 0xf4d03f,
};
