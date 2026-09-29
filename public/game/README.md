# MiniCraft 小游戏

Minecraft 风格的 3D 方块游戏，作为 Astra 3D Engine 的内置彩蛋小游戏。

## 目录结构

```
public/game/
├── main.js       # 游戏入口，初始化场景、相机、渲染器
├── world.js      # 世界生成，地形、树木、山洞
├── blocks.js     # 方块定义，类型、颜色、纹理
├── player.js     # 玩家控制，移动、跳跃、碰撞
├── controls.js   # 输入控制，鼠标、键盘
├── physics.js    # 物理系统，重力、碰撞检测
├── render.js     # 渲染系统，InstancedMesh 批量渲染
├── ui.js         # UI 系统，快捷栏、背包、暂停界面
├── config.js     # 配置参数，世界大小、物理参数
└── style.css     # 游戏样式
```

## 游戏特性

### 方块类型

| 方块 | ID  | 描述           |
| ---- | --- | -------------- |
| 空气 | 0   | 空方块         |
| 草地 | 1   | 地表草地       |
| 泥土 | 2   | 草地下方的泥土 |
| 石头 | 3   | 地下石头       |
| 木头 | 4   | 树干           |
| 树叶 | 5   | 树冠           |
| 沙子 | 6   | 沙漠/水域边缘  |

### 地形生成

- **基础地形**：2D 噪声函数生成高度变化
- **树木**：随机位置生成，4-5 格高树干，多层树冠
- **山洞**：3D 噪声函数生成地下山洞系统
- **山洞入口**：地表圆形坑洞，向下延伸连接山洞

### 物理系统

- **重力**：模拟下落加速度
- **碰撞检测**：AABB 碰撞检测
- **跳跃**：空格键跳跃，高度约 1.2 格
- **潜行**：Shift 键潜行，防止从边缘掉落

### 渲染优化

- **InstancedMesh**：批量渲染相同类型方块
- **按类型分组**：每种方块一个 InstancedMesh
- **动态更新**：方块变化时更新实例矩阵

### UI 系统

- **暂停界面**：MC 风格暂停菜单
- **快捷栏**：6 格快捷栏，数字键切换
- **背包**：27 格背包（9×3），E 键打开
- **准星**：屏幕中心准星
- **调试信息**：FPS、坐标、方块数

## 控制方式

| 按键     | 功能          |
| -------- | ------------- |
| W/A/S/D  | 移动          |
| 空格     | 跳跃          |
| Shift    | 潜行          |
| E        | 打开/关闭背包 |
| ESC      | 暂停          |
| 1-6      | 切换快捷栏    |
| 鼠标移动 | 视角旋转      |
| 左键     | 破坏方块      |
| 右键     | 放置方块      |
| 滚轮     | 切换方块类型  |

## 配置参数 (config.js)

```javascript
export const CONFIG = {
  // 世界
  WORLD_SIZE: 48, // 世界大小 48×48
  CHUNK_SIZE: 16, // 区块大小

  // 物理
  GRAVITY: 25, // 重力加速度
  JUMP_FORCE: 7.75, // 跳跃力度
  PLAYER_SPEED: 5, // 移动速度
  PLAYER_HEIGHT: 1.8, // 玩家高度

  // 渲染
  FOV: 75, // 视野角度
  NEAR: 0.1, // 近裁剪面
  FAR: 1000, // 远裁剪面

  // UI
  HOTBAR_SIZE: 6, // 快捷栏格数
  INVENTORY_SIZE: 27, // 背包格数
};
```

## 核心算法

### 地形高度生成

```javascript
function getTerrainHeight(x, z) {
  const noise1 = noise2D(x * 0.05, z * 0.05);
  const noise2 = noise2D(x * 0.1, z * 0.1) * 0.5;
  const baseHeight = 12;
  const variation = 5;
  return Math.floor(baseHeight + (noise1 + noise2) * variation);
}
```

### 山洞生成

```javascript
function isCave(x, y, z) {
  const noise = noise3D(x * 0.1, y * 0.1, z * 0.1);
  return noise > 0.5 && y < surfaceY - 5;
}
```

### 碰撞检测

```javascript
function checkCollision(position, velocity) {
  const nextPos = position.clone().add(velocity);
  const blockPos = nextPos.floor();

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        const checkPos = blockPos.clone().add({ x: dx, y: dy, z: dz });
        if (getBlock(checkPos) !== AIR) {
          // 检测碰撞并修正位置
        }
      }
    }
  }
}
```

## 启动方式

### 直接访问

访问 `/game.html` 路径。

## 扩展方向

1. **更多方块类型**：水、岩浆、玻璃等
2. **更多地形特征**：河流、湖泊、峡谷
3. **昼夜循环**：天空颜色变化、光照变化
4. **生物系统**：动物、怪物
5. **物品系统**：工具、武器、食物
6. **合成系统**：合成台、配方
7. **存档系统**：保存/加载世界
