# Astra 3D Engine - 脚本系统设计文档

## 概述

本文档详细描述了 Astra 3D Engine 的脚本系统设计，采用分层架构，让不同水平的用户都能轻松上手。

---

## 一、分层架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    Level 1: 预设组件                      │
│         拖拽即用，配置参数（零代码）                        │
│   [移动] [跳跃] [旋转] [碰撞检测] [播放音效] ...           │
├─────────────────────────────────────────────────────────┤
│                    Level 2: 积木编程                      │
│         可视化逻辑连接（简单逻辑）                          │
│   [当按键按下] → [播放动画] → [移动到位置]                 │
├─────────────────────────────────────────────────────────┤
│                    Level 3: 简化脚本                      │
│         类似 GDScript 的轻量脚本（高级逻辑）               │
│   func _update(): move_forward(speed)                   │
├─────────────────────────────────────────────────────────┤
│                    Level 4: JavaScript                   │
│         完整 JS 能力（专业开发者）                         │
│   class Player extends GameObject { ... }               │
└─────────────────────────────────────────────────────────┘
```

---

## 二、Level 1: 预设组件系统

### 2.1 组件基础结构

```javascript
// 组件基类
class Component {
  constructor(gameObject, config = {}) {
    this.gameObject = gameObject;
    this.enabled = true;
    this.uuid = generateUUID();
    
    // 从配置初始化属性
    Object.assign(this, this.getDefaultConfig(), config);
  }
  
  // 子类实现
  getDefaultConfig() { return {}; }
  start() {}           // 组件启动时调用
  update(deltaTime) {} // 每帧调用
  onDestroy() {}       // 销毁时调用
}
```

### 2.2 预设组件列表

#### 移动类组件

```javascript
// 直线移动组件
class MoveForward extends Component {
  static displayName = "直线移动";
  static icon = "➡️";
  static category = "移动";
  
  getDefaultConfig() {
    return {
      speed: 5,           // 移动速度
      direction: [0, 0, 1], // 移动方向
      localSpace: true    // 是否使用本地坐标系
    };
  }
  
  static properties = [
    { name: "speed", type: "number", label: "速度", min: 0, max: 100, step: 0.1 },
    { name: "direction", type: "vector3", label: "方向" },
    { name: "localSpace", type: "boolean", label: "本地坐标系" }
  ];
  
  update(deltaTime) {
    const moveVector = new THREE.Vector3(...this.direction)
      .normalize()
      .multiplyScalar(this.speed * deltaTime);
    
    if (this.localSpace) {
      moveVector.applyQuaternion(this.gameObject.quaternion);
    }
    
    this.gameObject.position.add(moveVector);
  }
}

// 键盘控制移动组件
class KeyboardMovement extends Component {
  static displayName = "键盘移动";
  static icon = "🎮";
  static category = "移动";
  
  getDefaultConfig() {
    return {
      forwardKey: "W",
      backwardKey: "S",
      leftKey: "A",
      rightKey: "D",
      speed: 5,
      sprintKey: "Shift",
      sprintMultiplier: 2
    };
  }
  
  static properties = [
    { name: "forwardKey", type: "key", label: "前进键" },
    { name: "backwardKey", type: "key", label: "后退键" },
    { name: "leftKey", type: "key", label: "左移键" },
    { name: "rightKey", type: "key", label: "右移键" },
    { name: "speed", type: "number", label: "速度", min: 0, max: 50 },
    { name: "sprintKey", type: "key", label: "冲刺键" },
    { name: "sprintMultiplier", type: "number", label: "冲刺倍率", min: 1, max: 5 }
  ];
  
  update(deltaTime) {
    const input = this.gameObject.engine.input;
    let speed = this.speed;
    
    if (input.isKeyDown(this.sprintKey)) {
      speed *= this.sprintMultiplier;
    }
    
    const velocity = new THREE.Vector3();
    
    if (input.isKeyDown(this.forwardKey)) velocity.z -= 1;
    if (input.isKeyDown(this.backwardKey)) velocity.z += 1;
    if (input.isKeyDown(this.leftKey)) velocity.x -= 1;
    if (input.isKeyDown(this.rightKey)) velocity.x += 1;
    
    if (velocity.length() > 0) {
      velocity.normalize().multiplyScalar(speed * deltaTime);
      this.gameObject.position.add(velocity);
    }
  }
}

// 跟随目标组件
class FollowTarget extends Component {
  static displayName = "跟随目标";
  static icon = "🎯";
  static category = "移动";
  
  getDefaultConfig() {
    return {
      target: null,        // 目标对象引用
      offset: [0, 0, 0],   // 偏移量
      smoothSpeed: 5,      // 平滑速度
      followX: true,
      followY: true,
      followZ: true
    };
  }
  
  static properties = [
    { name: "target", type: "gameObject", label: "目标对象" },
    { name: "offset", type: "vector3", label: "偏移量" },
    { name: "smoothSpeed", type: "number", label: "平滑速度", min: 0, max: 20 },
    { name: "followX", type: "boolean", label: "跟随X轴" },
    { name: "followY", type: "boolean", label: "跟随Y轴" },
    { name: "followZ", type: "boolean", label: "跟随Z轴" }
  ];
  
  update(deltaTime) {
    if (!this.target) return;
    
    const targetPos = this.target.position.clone().add(new THREE.Vector3(...this.offset));
    const currentPos = this.gameObject.position;
    
    const lerpFactor = 1 - Math.exp(-this.smoothSpeed * deltaTime);
    
    if (this.followX) currentPos.x = THREE.MathUtils.lerp(currentPos.x, targetPos.x, lerpFactor);
    if (this.followY) currentPos.y = THREE.MathUtils.lerp(currentPos.y, targetPos.y, lerpFactor);
    if (this.followZ) currentPos.z = THREE.MathUtils.lerp(currentPos.z, targetPos.z, lerpFactor);
  }
}
```

#### 旋转类组件

```javascript
// 持续旋转组件
class RotateContinuous extends Component {
  static displayName = "持续旋转";
  static icon = "🔄";
  static category = "旋转";
  
  getDefaultConfig() {
    return {
      rotationSpeed: [0, 45, 0], // 每秒旋转角度 (x, y, z)
      localSpace: true
    };
  }
  
  static properties = [
    { name: "rotationSpeed", type: "vector3", label: "旋转速度(度/秒)" },
    { name: "localSpace", type: "boolean", label: "本地坐标系" }
  ];
  
  update(deltaTime) {
    const rotation = new THREE.Euler(
      THREE.MathUtils.degToRad(this.rotationSpeed[0] * deltaTime),
      THREE.MathUtils.degToRad(this.rotationSpeed[1] * deltaTime),
      THREE.MathUtils.degToRad(this.rotationSpeed[2] * deltaTime)
    );
    
    if (this.localSpace) {
      this.gameObject.rotation.x += rotation.x;
      this.gameObject.rotation.y += rotation.y;
      this.gameObject.rotation.z += rotation.z;
    } else {
      // 世界空间旋转
      const quaternion = new THREE.Quaternion().setFromEuler(rotation);
      this.gameObject.quaternion.premultiply(quaternion);
    }
  }
}

// 面向目标组件
class LookAtTarget extends Component {
  static displayName = "面向目标";
  static icon = "👁️";
  static category = "旋转";
  
  getDefaultConfig() {
    return {
      target: null,
      smoothSpeed: 5,
      lockX: false,
      lockY: false,
      lockZ: false
    };
  }
  
  static properties = [
    { name: "target", type: "gameObject", label: "目标对象" },
    { name: "smoothSpeed", type: "number", label: "平滑速度", min: 0, max: 20 },
    { name: "lockX", type: "boolean", label: "锁定X轴" },
    { name: "lockY", type: "boolean", label: "锁定Y轴" },
    { name: "lockZ", type: "boolean", label: "锁定Z轴" }
  ];
  
  update(deltaTime) {
    if (!this.target) return;
    
    const direction = new THREE.Vector3()
      .subVectors(this.target.position, this.gameObject.position);
    
    if (direction.length() < 0.001) return;
    
    const targetQuaternion = new THREE.Quaternion()
      .setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize());
    
    this.gameObject.quaternion.slerp(targetQuaternion, 1 - Math.exp(-this.smoothSpeed * deltaTime));
  }
}
```

#### 物理类组件

```javascript
// 简单重力组件
class SimpleGravity extends Component {
  static displayName = "简单重力";
  static icon = "⬇️";
  static category = "物理";
  
  getDefaultConfig() {
    return {
      gravity: -9.8,
      groundLevel: 0,
      bounceFactor: 0.5
    };
  }
  
  static properties = [
    { name: "gravity", type: "number", label: "重力加速度", min: -50, max: 0 },
    { name: "groundLevel", type: "number", label: "地面高度" },
    { name: "bounceFactor", type: "number", label: "弹跳系数", min: 0, max: 1 }
  ];
  
  start() {
    this.velocity = 0;
  }
  
  update(deltaTime) {
    this.velocity += this.gravity * deltaTime;
    this.gameObject.position.y += this.velocity * deltaTime;
    
    // 地面碰撞检测
    if (this.gameObject.position.y <= this.groundLevel) {
      this.gameObject.position.y = this.groundLevel;
      this.velocity = -this.velocity * this.bounceFactor;
      
      if (Math.abs(this.velocity) < 0.1) {
        this.velocity = 0;
      }
    }
  }
}

// 跳跃组件
class JumpOnKey extends Component {
  static displayName = "按键跳跃";
  static icon = "🦘";
  static category = "物理";
  
  getDefaultConfig() {
    return {
      jumpKey: "Space",
      jumpForce: 10,
      groundLevel: 0,
      doubleJump: false
    };
  }
  
  static properties = [
    { name: "jumpKey", type: "key", label: "跳跃键" },
    { name: "jumpForce", type: "number", label: "跳跃力度", min: 0, max: 30 },
    { name: "groundLevel", type: "number", label: "地面高度" },
    { name: "doubleJump", type: "boolean", label: "允许二段跳" }
  ];
  
  start() {
    this.velocity = 0;
    this.jumpCount = 0;
    this.maxJumps = this.doubleJump ? 2 : 1;
  }
  
  update(deltaTime) {
    const input = this.gameObject.engine.input;
    
    // 检测跳跃输入
    if (input.isKeyJustPressed(this.jumpKey) && this.jumpCount < this.maxJumps) {
      this.velocity = this.jumpForce;
      this.jumpCount++;
    }
    
    // 应用重力
    this.velocity -= 20 * deltaTime;
    this.gameObject.position.y += this.velocity * deltaTime;
    
    // 地面检测
    if (this.gameObject.position.y <= this.groundLevel) {
      this.gameObject.position.y = this.groundLevel;
      this.velocity = 0;
      this.jumpCount = 0;
    }
  }
}
```

#### 触发器类组件

```javascript
// 区域触发器
class TriggerZone extends Component {
  static displayName = "区域触发器";
  static icon = "⚡";
  static category = "触发";
  
  getDefaultConfig() {
    return {
      size: [2, 2, 2],
      onEnter: null,  // 事件：进入时
      onExit: null,   // 事件：离开时
      targetTag: ""   // 检测特定标签的对象
    };
  }
  
  static properties = [
    { name: "size", type: "vector3", label: "区域大小" },
    { name: "onEnter", type: "event", label: "进入事件" },
    { name: "onExit", type: "event", label: "离开事件" },
    { name: "targetTag", type: "string", label: "目标标签" }
  ];
  
  start() {
    this.objectsInside = new Set();
  }
  
  update(deltaTime) {
    const allObjects = this.gameObject.engine.sceneManager.getAllGameObjects();
    
    for (const obj of allObjects) {
      if (obj === this.gameObject) continue;
      if (this.targetTag && !obj.tags.includes(this.targetTag)) continue;
      
      const isInside = this.checkInside(obj);
      const wasInside = this.objectsInside.has(obj.id);
      
      if (isInside && !wasInside) {
        this.objectsInside.add(obj.id);
        this.triggerEvent("onEnter", obj);
      } else if (!isInside && wasInside) {
        this.objectsInside.delete(obj.id);
        this.triggerEvent("onExit", obj);
      }
    }
  }
  
  checkInside(other) {
    const halfSize = new THREE.Vector3(...this.size).multiplyScalar(0.5);
    const pos = this.gameObject.position;
    const otherPos = other.position;
    
    return Math.abs(otherPos.x - pos.x) <= halfSize.x &&
           Math.abs(otherPos.y - pos.y) <= halfSize.y &&
           Math.abs(otherPos.z - pos.z) <= halfSize.z;
  }
  
  triggerEvent(eventName, otherObject) {
    const event = this[eventName];
    if (event && typeof event === "function") {
      event(otherObject);
    }
  }
}
```

#### 动画类组件

```javascript
// 简单动画播放
class PlayAnimation extends Component {
  static displayName = "播放动画";
  static icon = "🎬";
  static category = "动画";
  
  getDefaultConfig() {
    return {
      animationName: "",
      loop: true,
      speed: 1,
      autoPlay: true
    };
  }
  
  static properties = [
    { name: "animationName", type: "animation", label: "动画" },
    { name: "loop", type: "boolean", label: "循环" },
    { name: "speed", type: "number", label: "速度", min: 0.1, max: 5 },
    { name: "autoPlay", type: "boolean", label: "自动播放" }
  ];
  
  start() {
    if (this.autoPlay) {
      this.play();
    }
  }
  
  play() {
    const mixer = this.gameObject.animationMixer;
    if (mixer && this.animationName) {
      const action = mixer.clipAction(this.animationName);
      action.setLoop(this.loop ? THREE.LoopRepeat : THREE.LoopOnce);
      action.timeScale = this.speed;
      action.play();
    }
  }
}

// 颜色渐变
class ColorPulse extends Component {
  static displayName = "颜色脉冲";
  static icon = "🌈";
  static category = "动画";
  
  getDefaultConfig() {
    return {
      color1: "#ff0000",
      color2: "#0000ff",
      speed: 1
    };
  }
  
  static properties = [
    { name: "color1", type: "color", label: "颜色1" },
    { name: "color2", type: "color", label: "颜色2" },
    { name: "speed", type: "number", label: "速度", min: 0.1, max: 10 }
  ];
  
  update(deltaTime) {
    const time = this.gameObject.engine.time * this.speed;
    const t = (Math.sin(time) + 1) / 2;
    
    const color1 = new THREE.Color(this.color1);
    const color2 = new THREE.Color(this.color2);
    
    const material = this.gameObject.getComponent("MeshRenderer")?.material;
    if (material) {
      material.color.lerpColors(color1, color2, t);
    }
  }
}
```

### 2.3 组件注册系统

```javascript
// 组件注册表
const ComponentRegistry = {
  components: new Map(),
  categories: new Map(),
  
  register(componentClass) {
    const name = componentClass.name;
    this.components.set(name, componentClass);
    
    // 按分类组织
    const category = componentClass.category || "其他";
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category).push(componentClass);
  },
  
  get(name) {
    return this.components.get(name);
  },
  
  getByCategory(category) {
    return this.categories.get(category) || [];
  },
  
  getAllCategories() {
    return Array.from(this.categories.keys());
  }
};

// 注册所有预设组件
ComponentRegistry.register(MoveForward);
ComponentRegistry.register(KeyboardMovement);
ComponentRegistry.register(FollowTarget);
ComponentRegistry.register(RotateContinuous);
ComponentRegistry.register(LookAtTarget);
ComponentRegistry.register(SimpleGravity);
ComponentRegistry.register(JumpOnKey);
ComponentRegistry.register(TriggerZone);
ComponentRegistry.register(PlayAnimation);
ComponentRegistry.register(ColorPulse);
```

---

## 三、Level 2: 积木编程系统

### 3.1 积木块类型

```javascript
// 积木块基类
class Block {
  constructor(config = {}) {
    this.id = generateUUID();
    this.type = this.constructor.type;
    this.next = null;      // 下一个积木
    this.inputs = {};      // 输入连接
    this.config = config;  // 配置参数
  }
  
  // 执行积木逻辑
  execute(context) {
    throw new Error("子类必须实现 execute 方法");
  }
}

// 事件积木（触发器）
class EventBlock extends Block {
  static type = "event";
  static category = "事件";
}

// 条件积木
class ConditionBlock extends Block {
  static type = "condition";
  static category = "条件";
}

// 动作积木
class ActionBlock extends Block {
  static type = "action";
  static category = "动作";
}

// 值积木
class ValueBlock extends Block {
  static type = "value";
  static category = "值";
}
```

### 3.2 预设积木块

```javascript
// 事件：游戏开始
class OnGameStart extends EventBlock {
  static displayName = "当游戏开始时";
  static icon = "▶️";
  
  execute(context) {
    // 触发后续积木链
    if (this.next) {
      this.next.execute(context);
    }
  }
}

// 事件：按键按下
class OnKeyPress extends EventBlock {
  static displayName = "当按键按下时";
  static icon = "⌨️";
  
  constructor(config) {
    super(config);
    this.key = config.key || "Space";
  }
  
  static properties = [
    { name: "key", type: "key", label: "按键" }
  ];
  
  execute(context) {
    const input = context.engine.input;
    if (input.isKeyJustPressed(this.key)) {
      if (this.next) {
        this.next.execute(context);
      }
    }
  }
}

// 事件：碰撞发生
class OnCollision extends EventBlock {
  static displayName = "当碰撞发生时";
  static icon = "💥";
  
  constructor(config) {
    super(config);
    this.targetTag = config.targetTag || "";
  }
  
  static properties = [
    { name: "targetTag", type: "string", label: "目标标签" }
  ];
  
  execute(context) {
    // 由物理系统触发
  }
}

// 条件：如果
class IfCondition extends ConditionBlock {
  static displayName = "如果";
  static icon = "❓";
  
  constructor(config) {
    super(config);
    this.condition = config.condition; // 连接到值积木
    this.trueBranch = null;  // true 分支
    this.falseBranch = null; // false 分支
  }
  
  execute(context) {
    const result = this.condition ? this.condition.execute(context) : false;
    
    if (result && this.trueBranch) {
      this.trueBranch.execute(context);
    } else if (!result && this.falseBranch) {
      this.falseBranch.execute(context);
    }
    
    if (this.next) {
      this.next.execute(context);
    }
  }
}

// 动作：移动对象
class MoveObject extends ActionBlock {
  static displayName = "移动对象";
  static icon = "➡️";
  
  constructor(config) {
    super(config);
    this.target = config.target;
    this.direction = config.direction;
    this.distance = config.distance;
  }
  
  static properties = [
    { name: "target", type: "gameObject", label: "目标对象" },
    { name: "direction", type: "vector3", label: "方向" },
    { name: "distance", type: "number", label: "距离" }
  ];
  
  execute(context) {
    const target = this.target || context.gameObject;
    const direction = new THREE.Vector3(...this.direction).normalize();
    target.position.add(direction.multiplyScalar(this.distance));
    
    if (this.next) {
      this.next.execute(context);
    }
  }
}

// 动作：设置位置
class SetPosition extends ActionBlock {
  static displayName = "设置位置";
  static icon = "📍";
  
  constructor(config) {
    super(config);
    this.target = config.target;
    this.position = config.position;
  }
  
  static properties = [
    { name: "target", type: "gameObject", label: "目标对象" },
    { name: "position", type: "vector3", label: "位置" }
  ];
  
  execute(context) {
    const target = this.target || context.gameObject;
    target.position.set(...this.position);
    
    if (this.next) {
      this.next.execute(context);
    }
  }
}

// 动作：播放音效
class PlaySound extends ActionBlock {
  static displayName = "播放音效";
  static icon = "🔊";
  
  constructor(config) {
    super(config);
    this.sound = config.sound;
    this.volume = config.volume || 1;
  }
  
  static properties = [
    { name: "sound", type: "audio", label: "音效" },
    { name: "volume", type: "number", label: "音量", min: 0, max: 1 }
  ];
  
  execute(context) {
    context.engine.audio.play(this.sound, this.volume);
    
    if (this.next) {
      this.next.execute(context);
    }
  }
}

// 动作：销毁对象
class DestroyObject extends ActionBlock {
  static displayName = "销毁对象";
  static icon = "🗑️";
  
  constructor(config) {
    super(config);
    this.target = config.target;
  }
  
  static properties = [
    { name: "target", type: "gameObject", label: "目标对象" }
  ];
  
  execute(context) {
    const target = this.target || context.gameObject;
    context.engine.sceneManager.destroy(target);
    
    if (this.next) {
      this.next.execute(context);
    }
  }
}

// 动作：生成对象
class SpawnObject extends ActionBlock {
  static displayName = "生成对象";
  static icon = "✨";
  
  constructor(config) {
    super(config);
    this.prefab = config.prefab;
    this.position = config.position;
  }
  
  static properties = [
    { name: "prefab", type: "prefab", label: "预制件" },
    { name: "position", type: "vector3", label: "位置" }
  ];
  
  execute(context) {
    const instance = context.engine.sceneManager.instantiate(this.prefab);
    instance.position.set(...this.position);
    
    if (this.next) {
      this.next.execute(context);
    }
  }
}

// 值：获取位置
class GetPosition extends ValueBlock {
  static displayName = "获取位置";
  static icon = "📍";
  
  constructor(config) {
    super(config);
    this.target = config.target;
  }
  
  static properties = [
    { name: "target", type: "gameObject", label: "目标对象" }
  ];
  
  execute(context) {
    const target = this.target || context.gameObject;
    return [target.position.x, target.position.y, target.position.z];
  }
}

// 值：数学运算
class MathOperation extends ValueBlock {
  static displayName = "数学运算";
  static icon = "🔢";
  
  constructor(config) {
    super(config);
    this.operation = config.operation; // "add", "subtract", "multiply", "divide"
    this.value1 = config.value1;
    this.value2 = config.value2;
  }
  
  static properties = [
    { name: "operation", type: "select", label: "运算", options: ["加", "减", "乘", "除"] },
    { name: "value1", type: "number", label: "值1" },
    { name: "value2", type: "number", label: "值2" }
  ];
  
  execute(context) {
    const v1 = typeof this.value1 === "object" ? this.value1.execute(context) : this.value1;
    const v2 = typeof this.value2 === "object" ? this.value2.execute(context) : this.value2;
    
    switch (this.operation) {
      case "add": return v1 + v2;
      case "subtract": return v1 - v2;
      case "multiply": return v1 * v2;
      case "divide": return v2 !== 0 ? v1 / v2 : 0;
    }
  }
}
```

### 3.3 积木编程可视化数据结构

```javascript
// 积木程序结构
const blockProgram = {
  id: "program-1",
  name: "玩家控制",
  gameObjectId: "player-uuid",
  blocks: [
    {
      id: "block-1",
      type: "OnKeyPress",
      config: { key: "W" },
      next: "block-2"
    },
    {
      id: "block-2",
      type: "MoveObject",
      config: { 
        target: null, // null 表示当前对象
        direction: [0, 0, -1],
        distance: 0.5
      },
      next: null
    },
    {
      id: "block-3",
      type: "OnKeyPress",
      config: { key: "Space" },
      next: "block-4"
    },
    {
      id: "block-4",
      type: "PlaySound",
      config: { 
        sound: "jump.mp3",
        volume: 0.8
      },
      next: "block-5"
    },
    {
      id: "block-5",
      type: "MoveObject",
      config: { 
        target: null,
        direction: [0, 1, 0],
        distance: 2
      },
      next: null
    }
  ]
};
```

---

## 四、Level 3: 简化脚本系统

### 4.1 脚本语法设计

```javascript
// 简化脚本语法示例
const scriptExample = `
// 玩家控制器脚本
extends GameObject

// 属性定义（可在 Inspector 中编辑）
property speed = 5
property jumpForce = 10
property groundTag = "Ground"

// 内部变量
var velocity = Vector3(0, 0, 0)
var isGrounded = false

// 生命周期函数
func start():
    print("玩家初始化")
    position = Vector3(0, 5, 0)

func update(delta):
    # 移动控制
    if Input.is_key_pressed("W"):
        move_forward(speed * delta)
    if Input.is_key_pressed("S"):
        move_backward(speed * delta)
    if Input.is_key_pressed("A"):
        move_left(speed * delta)
    if Input.is_key_pressed("D"):
        move_right(speed * delta)
    
    # 跳跃
    if Input.is_key_just_pressed("Space") and isGrounded:
        velocity.y = jumpForce
        isGrounded = false
    
    # 应用重力
    velocity.y -= 20 * delta
    position += velocity * delta
    
    # 地面检测
    if position.y <= 0:
        position.y = 0
        velocity.y = 0
        isGrounded = true

func on_collision_enter(other):
    if other.has_tag("Coin"):
        other.destroy()
        print("收集金币！")
`;
```

### 4.2 脚本解析器

```javascript
class ScriptParser {
  constructor() {
    this.keywords = ['extends', 'property', 'var', 'func', 'if', 'else', 'for', 'while', 'return', 'and', 'or', 'not'];
  }
  
  parse(source) {
    const lines = source.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const ast = {
      extends: null,
      properties: [],
      variables: [],
      functions: []
    };
    
    let currentFunction = null;
    
    for (const line of lines) {
      // 解析 extends
      if (line.startsWith('extends ')) {
        ast.extends = line.substring(8).trim();
      }
      // 解析 property
      else if (line.startsWith('property ')) {
        const match = line.match(/property\s+(\w+)\s*=\s*(.+)/);
        if (match) {
          ast.properties.push({
            name: match[1],
            value: this.parseValue(match[2])
          });
        }
      }
      // 解析 var
      else if (line.startsWith('var ')) {
        const match = line.match(/var\s+(\w+)\s*=\s*(.+)/);
        if (match) {
          ast.variables.push({
            name: match[1],
            value: this.parseValue(match[2])
          });
        }
      }
      // 解析 func
      else if (line.startsWith('func ')) {
        const match = line.match(/func\s+(\w+)\s*\(([^)]*)\)\s*:?/);
        if (match) {
          currentFunction = {
            name: match[1],
            params: match[2].split(',').map(p => p.trim()).filter(p => p),
            body: []
          };
          ast.functions.push(currentFunction);
        }
      }
      // 解析函数体
      else if (currentFunction) {
        currentFunction.body.push(this.parseStatement(line));
      }
    }
    
    return ast;
  }
  
  parseValue(valueStr) {
    valueStr = valueStr.trim();
    
    // 数字
    if (/^-?\d+(\.\d+)?$/.test(valueStr)) {
      return parseFloat(valueStr);
    }
    // 字符串
    if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
      return valueStr.slice(1, -1);
    }
    // Vector3
    if (valueStr.startsWith('Vector3(')) {
      const match = valueStr.match(/Vector3\(([^)]+)\)/);
      if (match) {
        const values = match[1].split(',').map(v => parseFloat(v.trim()));
        return { type: 'Vector3', values };
      }
    }
    // 布尔值
    if (valueStr === 'true') return true;
    if (valueStr === 'false') return false;
    
    return valueStr; // 变量名或其他
  }
  
  parseStatement(line) {
    // 简化的语句解析
    return { raw: line };
  }
}
```

### 4.3 脚本运行时

```javascript
class ScriptRuntime {
  constructor(gameObject, ast) {
    this.gameObject = gameObject;
    this.ast = ast;
    this.variables = {};
    
    // 初始化变量
    for (const prop of ast.properties) {
      this.variables[prop.name] = this.evaluateValue(prop.value);
    }
    for (const variable of ast.variables) {
      this.variables[variable.name] = this.evaluateValue(variable.value);
    }
  }
  
  evaluateValue(value) {
    if (typeof value === 'object' && value.type === 'Vector3') {
      return new THREE.Vector3(...value.values);
    }
    return value;
  }
  
  callFunction(name, ...args) {
    const func = this.ast.functions.find(f => f.name === name);
    if (!func) return;
    
    // 创建局部作用域
    const localScope = { ...this.variables };
    
    // 绑定参数
    func.params.forEach((param, i) => {
      localScope[param] = args[i];
    });
    
    // 执行函数体
    for (const statement of func.body) {
      this.executeStatement(statement, localScope);
    }
  }
  
  executeStatement(statement, scope) {
    const line = statement.raw;
    
    // 解析并执行语句
    // 这里需要更完整的解释器实现
    // 简化版本只处理基本语句
    
    // position = Vector3(...)
    if (line.includes('position =')) {
      const match = line.match(/position\s*=\s*Vector3\(([^)]+)\)/);
      if (match) {
        const values = match[1].split(',').map(v => this.evaluateExpression(v.trim(), scope));
        this.gameObject.position.set(...values);
      }
    }
    
    // move_forward(...)
    if (line.includes('move_forward(')) {
      const match = line.match(/move_forward\(([^)]+)\)/);
      if (match) {
        const distance = this.evaluateExpression(match[1], scope);
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.gameObject.quaternion);
        this.gameObject.position.add(forward.multiplyScalar(distance));
      }
    }
    
    // print(...)
    if (line.includes('print(')) {
      const match = line.match(/print\(([^)]+)\)/);
      if (match) {
        console.log(this.evaluateExpression(match[1], scope));
      }
    }
  }
  
  evaluateExpression(expr, scope) {
    expr = expr.trim();
    
    // 数字
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
      return parseFloat(expr);
    }
    
    // 变量
    if (scope[expr] !== undefined) {
      return scope[expr];
    }
    
    // 简单乘法 (speed * delta)
    if (expr.includes('*')) {
      const parts = expr.split('*').map(p => this.evaluateExpression(p.trim(), scope));
      return parts.reduce((a, b) => a * b, 1);
    }
    
    return expr;
  }
}
```

---

## 五、Level 4: JavaScript 脚本系统

### 5.1 脚本组件结构

```javascript
// 用户编写的 JavaScript 脚本
class PlayerController extends ScriptComponent {
  // 在 Inspector 中显示的属性
  static properties = {
    speed: { type: 'number', default: 5, min: 0, max: 20 },
    jumpForce: { type: 'number', default: 10 },
    mouseSensitivity: { type: 'number', default: 0.1 }
  };
  
  // 初始化
  start() {
    this.velocity = new THREE.Vector3();
    this.isGrounded = false;
    
    // 获取其他组件引用
    this.rigidbody = this.getComponent('Rigidbody');
    this.camera = this.findObjectByName('MainCamera');
  }
  
  // 每帧更新
  update(deltaTime) {
    this.handleMovement(deltaTime);
    this.handleJump();
    this.handleMouseLook();
  }
  
  handleMovement(deltaTime) {
    const input = this.engine.input;
    const moveDir = new THREE.Vector3();
    
    if (input.isKeyDown('W')) moveDir.z -= 1;
    if (input.isKeyDown('S')) moveDir.z += 1;
    if (input.isKeyDown('A')) moveDir.x -= 1;
    if (input.isKeyDown('D')) moveDir.x += 1;
    
    if (moveDir.length() > 0) {
      moveDir.normalize();
      moveDir.applyQuaternion(this.gameObject.quaternion);
      this.gameObject.position.add(moveDir.multiplyScalar(this.speed * deltaTime));
    }
  }
  
  handleJump() {
    const input = this.engine.input;
    
    if (input.isKeyJustPressed('Space') && this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
    }
  }
  
  handleMouseLook() {
    const input = this.engine.input;
    const mouseDelta = input.getMouseDelta();
    
    this.gameObject.rotation.y -= mouseDelta.x * this.mouseSensitivity;
  }
  
  // 碰撞回调
  onCollisionEnter(other) {
    if (other.hasTag('Ground')) {
      this.isGrounded = true;
    }
  }
  
  // 触发器回调
  onTriggerEnter(other) {
    if (other.hasTag('Coin')) {
      other.destroy();
      this.engine.emit('coinCollected');
    }
  }
}
```

### 5.2 脚本加载系统

```javascript
class ScriptLoader {
  constructor(engine) {
    this.engine = engine;
    this.loadedScripts = new Map();
  }
  
  // 从文本加载脚本
  loadFromSource(source, className) {
    try {
      // 创建安全的执行环境
      const sandbox = this.createSandbox();
      
      // 执行脚本
      const script = new Function(
        'THREE', 'GameObject', 'Component', 'Vector3', 'Input', 'Time',
        `${source}\n return ${className};`
      )(
        sandbox.THREE,
        sandbox.GameObject,
        sandbox.Component,
        sandbox.Vector3,
        sandbox.Input,
        sandbox.Time
      );
      
      this.loadedScripts.set(className, script);
      return script;
    } catch (error) {
      console.error(`脚本加载失败: ${error.message}`);
      return null;
    }
  }
  
  // 创建沙箱环境
  createSandbox() {
    return {
      THREE: THREE,
      GameObject: GameObject,
      Component: Component,
      Vector3: THREE.Vector3,
      Input: this.engine.input.createProxy(),
      Time: {
        deltaTime: () => this.engine.deltaTime,
        time: () => this.engine.time
      }
    };
  }
  
  // 实例化脚本组件
  instantiate(className, gameObject, config = {}) {
    const ScriptClass = this.loadedScripts.get(className);
    if (!ScriptClass) {
      console.error(`脚本未找到: ${className}`);
      return null;
    }
    
    const instance = new ScriptClass(gameObject, config);
    return instance;
  }
}
```

---

## 六、事件系统设计

### 6.1 事件管理器

```javascript
class EventManager {
  constructor() {
    this.listeners = new Map();
  }
  
  // 订阅事件
  on(eventName, callback, context = null) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    
    this.listeners.get(eventName).push({
      callback,
      context,
      once: false
    });
  }
  
  // 订阅一次性事件
  once(eventName, callback, context = null) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    
    this.listeners.get(eventName).push({
      callback,
      context,
      once: true
    });
  }
  
  // 取消订阅
  off(eventName, callback) {
    if (!this.listeners.has(eventName)) return;
    
    const listeners = this.listeners.get(eventName);
    const index = listeners.findIndex(l => l.callback === callback);
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }
  
  // 触发事件
  emit(eventName, ...args) {
    if (!this.listeners.has(eventName)) return;
    
    const listeners = this.listeners.get(eventName);
    const toRemove = [];
    
    for (const listener of listeners) {
      if (listener.context) {
        listener.callback.call(listener.context, ...args);
      } else {
        listener.callback(...args);
      }
      
      if (listener.once) {
        toRemove.push(listener);
      }
    }
    
    // 移除一次性监听器
    for (const listener of toRemove) {
      listeners.splice(listeners.indexOf(listener), 1);
    }
  }
}
```

### 6.2 预定义事件

```javascript
// 引擎内置事件
const EngineEvents = {
  // 生命周期事件
  GAME_START: 'game:start',
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',
  GAME_STOP: 'game:stop',
  
  // 场景事件
  SCENE_LOADED: 'scene:loaded',
  SCENE_UNLOADED: 'scene:unloaded',
  OBJECT_CREATED: 'object:created',
  OBJECT_DESTROYED: 'object:destroyed',
  
  // 物理事件
  COLLISION_ENTER: 'physics:collisionEnter',
  COLLISION_EXIT: 'physics:collisionExit',
  TRIGGER_ENTER: 'physics:triggerEnter',
  TRIGGER_EXIT: 'physics:triggerExit',
  
  // 输入事件
  KEY_DOWN: 'input:keyDown',
  KEY_UP: 'input:keyUp',
  MOUSE_DOWN: 'input:mouseDown',
  MOUSE_UP: 'input:mouseUp',
  MOUSE_MOVE: 'input:mouseMove',
  
  // 自定义事件
  CUSTOM: 'custom'
};
```

---

## 七、Inspector 面板集成

### 7.1 属性编辑器组件

```jsx
// InspectorPanel.jsx 中的组件编辑部分
function ComponentEditor({ component, onUpdate }) {
  const properties = component.constructor.properties || [];
  
  return (
    <div className="component-editor">
      <div className="component-header">
        <span className="component-icon">{component.constructor.icon}</span>
        <span className="component-name">{component.constructor.displayName}</span>
        <button className="remove-btn" onClick={() => onRemove(component)}>×</button>
      </div>
      
      <div className="component-properties">
        {properties.map(prop => (
          <PropertyField
            key={prop.name}
            property={prop}
            value={component[prop.name]}
            onChange={(value) => onUpdate(component, prop.name, value)}
          />
        ))}
      </div>
    </div>
  );
}

function PropertyField({ property, value, onChange }) {
  switch (property.type) {
    case 'number':
      return (
        <div className="property-row">
          <label>{property.label}</label>
          <input
            type="number"
            value={value}
            min={property.min}
            max={property.max}
            step={property.step || 1}
            onChange={(e) => onChange(parseFloat(e.target.value))}
          />
        </div>
      );
      
    case 'vector3':
      return (
        <div className="property-row">
          <label>{property.label}</label>
          <div className="vector-inputs">
            <input type="number" value={value[0]} step="0.1"
              onChange={(e) => onChange([parseFloat(e.target.value), value[1], value[2]])} />
            <input type="number" value={value[1]} step="0.1"
              onChange={(e) => onChange([value[0], parseFloat(e.target.value), value[2]])} />
            <input type="number" value={value[2]} step="0.1"
              onChange={(e) => onChange([value[0], value[1], parseFloat(e.target.value)])} />
          </div>
        </div>
      );
      
    case 'boolean':
      return (
        <div className="property-row">
          <label>{property.label}</label>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
          />
        </div>
      );
      
    case 'color':
      return (
        <div className="property-row">
          <label>{property.label}</label>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
      
    case 'key':
      return (
        <div className="property-row">
          <label>{property.label}</label>
          <KeyInput value={value} onChange={onChange} />
        </div>
      );
      
    case 'gameObject':
      return (
        <div className="property-row">
          <label>{property.label}</label>
          <GameObjectSelector value={value} onChange={onChange} />
        </div>
      );
      
    case 'event':
      return (
        <div className="property-row">
          <label>{property.label}</label>
          <EventEditor value={value} onChange={onChange} />
        </div>
      );
      
    default:
      return null;
  }
}
```

### 7.2 添加组件面板

```jsx
function AddComponentPanel({ onAdd, onClose }) {
  const categories = ComponentRegistry.getAllCategories();
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  
  return (
    <div className="add-component-panel">
      <div className="panel-header">
        <h3>添加组件</h3>
        <button onClick={onClose}>×</button>
      </div>
      
      <div className="category-tabs">
        {categories.map(cat => (
          <button
            key={cat}
            className={cat === selectedCategory ? 'active' : ''}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
      
      <div className="component-list">
        {ComponentRegistry.getByCategory(selectedCategory).map(comp => (
          <div
            key={comp.name}
            className="component-item"
            onClick={() => onAdd(comp.name)}
          >
            <span className="icon">{comp.icon}</span>
            <span className="name">{comp.displayName}</span>
            <span className="description">{comp.description || ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 八、数据序列化

### 8.1 场景保存格式

```javascript
// 场景数据结构
const sceneData = {
  version: "1.0",
  name: "MyScene",
  
  // 游戏对象列表
  objects: [
    {
      id: "obj-1",
      name: "Player",
      tags: ["Player"],
      
      // 变换
      transform: {
        position: [0, 1, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1]
      },
      
      // 渲染
      mesh: {
        type: "cube", // 或 "sphere", "plane", "model:uuid"
        material: {
          color: "#4a90d9",
          metalness: 0.3,
          roughness: 0.7
        }
      },
      
      // 组件
      components: [
        {
          type: "KeyboardMovement",
          config: {
            forwardKey: "W",
            backwardKey: "S",
            leftKey: "A",
            rightKey: "D",
            speed: 5
          }
        },
        {
          type: "JumpOnKey",
          config: {
            jumpKey: "Space",
            jumpForce: 10,
            doubleJump: true
          }
        }
      ],
      
      // 积木程序
      blockPrograms: [
        {
          id: "bp-1",
          name: "收集金币",
          blocks: [
            { id: "b1", type: "OnTriggerEnter", config: { targetTag: "Coin" }, next: "b2" },
            { id: "b2", type: "DestroyObject", config: { target: "other" }, next: "b3" },
            { id: "b3", type: "PlaySound", config: { sound: "coin.mp3" }, next: null }
          ]
        }
      ],
      
      // 子对象
      children: []
    }
  ],
  
  // 资源引用
  assets: [
    { id: "asset-1", type: "model", path: "models/character.glb" },
    { id: "asset-2", type: "audio", path: "sounds/jump.mp3" }
  ]
};
```

### 8.2 导出为运行时格式

```javascript
class SceneExporter {
  export(scene) {
    const runtimeScene = {
      objects: []
    };
    
    for (const obj of scene.objects) {
      const runtimeObj = {
        id: obj.id,
        transform: obj.transform,
        mesh: obj.mesh,
        scripts: []
      };
      
      // 将组件转换为运行时脚本
      for (const comp of obj.components) {
        runtimeObj.scripts.push({
          type: 'component',
          name: comp.type,
          config: comp.config
        });
      }
      
      // 将积木程序转换为运行时脚本
      for (const program of obj.blockPrograms) {
        runtimeObj.scripts.push({
          type: 'blocks',
          program: program
        });
      }
      
      runtimeScene.objects.push(runtimeObj);
    }
    
    return JSON.stringify(runtimeScene, null, 2);
  }
}
```

---

## 九、实现优先级

### 第一阶段（MVP）
1. ✅ 组件基类和注册系统
2. ✅ 基础预设组件（移动、旋转、跳跃）
3. ✅ Inspector 面板组件编辑
4. ✅ 事件系统基础

### 第二阶段
1. 积木编程可视化编辑器
2. 积木块执行引擎
3. 更多预设组件

### 第三阶段
1. 简化脚本解析器
2. 脚本运行时
3. 脚本编辑器 UI

### 第四阶段
1. JavaScript 脚本支持
2. 脚本热重载
3. 调试工具

---

## 十、总结

本脚本系统采用分层设计，从零代码的预设组件到完整的 JavaScript 支持，满足不同水平用户的需求：

| 层级 | 目标用户 | 学习成本 | 灵活性 |
|------|----------|----------|--------|
| Level 1 | 完全新手 | 无 | 低 |
| Level 2 | 初学者 | 低 | 中 |
| Level 3 | 进阶用户 | 中 | 高 |
| Level 4 | 专业开发者 | 高 | 完全 |

建议从 Level 1 开始实现，逐步向上扩展，让用户能够随着技能提升自然过渡到更高层级。
