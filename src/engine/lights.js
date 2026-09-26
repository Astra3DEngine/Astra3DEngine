/**
 * @file engine/lights.js
 * @description 光源对象构建：统一点/平行/聚光灯的创建、可视化与阴影配置。
 * @module engine/lights
 */

import * as THREE from 'three';

/** 光源默认强度（此前散落在 App.jsx 与 Viewport.jsx） */

/**
 * 根据旋转角（度）计算方向光的照射方向（默认向下）。
 * @param {number[]} rotation - [x, y, z] 角度
 * @returns {THREE.Vector3}
 */
export function getLightDirectionFromRotation(rotation = [0, 0, 0]) {
  const direction = new THREE.Vector3(0, -1, 0);
  direction.applyEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(rotation[0] || 0),
      THREE.MathUtils.degToRad(rotation[1] || 0),
      THREE.MathUtils.degToRad(rotation[2] || 0)
    )
  );
  return direction;
}

/** 创建默认预览方向光（场景无用户光源时使用） */
export function createDefaultDirectionalLight(intensity = 1.5) {
  const light = new THREE.DirectionalLight(0xffffff, intensity);
  light.position.set(5, 10, 5);
  light.castShadow = true;
  light.shadow.mapSize.width = 2048;
  light.shadow.mapSize.height = 2048;
  light.shadow.camera.near = 0.1;
  light.shadow.camera.far = 100;
  light.shadow.camera.left = -50;
  light.shadow.camera.right = 50;
  light.shadow.camera.top = 50;
  light.shadow.camera.bottom = -50;
  light.shadow.bias = -0.0001;
  light.userData.originalIntensity = light.intensity;
  return light;
}

/** 点光源可视化（球体 + 光晕） */
function createPointLightVisual(color) {
  const visualMat = new THREE.MeshBasicMaterial({ color });
  const visual = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), visualMat);
  for (let i = 1; i <= 3; i++) {
    const haloMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3 - i * 0.08,
    });
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.15 + i * 0.05, 16, 16), haloMat);
    visual.add(halo);
  }
  return visual;
}

/** 方向光可视化（球体 + 光芒 + 方向箭头） */
function createDirectionalLightVisual(color) {
  const visualMat = new THREE.MeshBasicMaterial({ color });
  const visual = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), visualMat);

  const raysGeo = new THREE.BufferGeometry();
  const rayPositions = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const x1 = Math.cos(angle) * 0.3;
    const y1 = Math.sin(angle) * 0.3;
    const x2 = Math.cos(angle) * 0.45;
    const y2 = Math.sin(angle) * 0.45;
    rayPositions.push(x1, y1, 0, x2, y2, 0);
  }
  raysGeo.setAttribute('position', new THREE.Float32BufferAttribute(rayPositions, 3));
  visual.add(new THREE.LineSegments(raysGeo, new THREE.LineBasicMaterial({ color })));

  const arrowLength = 0.8;
  const arrowGeo = new THREE.BufferGeometry();
  arrowGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 0, 0, 0, -arrowLength, 0], 3)
  );
  visual.add(new THREE.Line(arrowGeo, new THREE.LineBasicMaterial({ color, linewidth: 2 })));

  const arrowHeadMat = new THREE.MeshBasicMaterial({ color });
  const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.15, 8), arrowHeadMat);
  arrowHead.position.y = -arrowLength - 0.075;
  arrowHead.rotation.x = Math.PI;
  visual.add(arrowHead);
  return visual;
}

/** 聚光灯可视化（光源球体 + 锥形 + 边缘） */
function createSpotLightVisual(color, angle) {
  const visualMat = new THREE.MeshBasicMaterial({ color });
  const visual = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), visualMat);

  const coneLength = 0.6;
  const coneRadius = coneLength * Math.tan(angle || Math.PI / 4);
  const coneGeo = new THREE.ConeGeometry(coneRadius, coneLength, 16, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.y = -coneLength / 2 - 0.05;
  visual.add(cone);

  const coneEdgeGeo = new THREE.EdgesGeometry(coneGeo);
  visual.add(new THREE.LineSegments(coneEdgeGeo, new THREE.LineBasicMaterial({ color })));
  return visual;
}

/**
 * 根据对象数据创建完整光源（含可视化与 target）。
 * @param {Object} obj - 场景对象数据
 * @returns {THREE.Light} 带 userData.visualMesh 的光源
 */
export function createLightFromObject(obj) {
  const color = new THREE.Color(obj.color || '#ffffff');
  let light;
  let visualMesh = null;

  if (obj.lightType === 'point') {
    light = new THREE.PointLight(color, obj.intensity || 2, obj.distance || 10, obj.decay || 1);
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = obj.distance || 10;
    light.shadow.bias = -0.001;
    visualMesh = createPointLightVisual(color);
  } else if (obj.lightType === 'directional') {
    light = new THREE.DirectionalLight(color, obj.intensity || 1.5);
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 100;
    light.shadow.camera.left = -50;
    light.shadow.camera.right = 50;
    light.shadow.camera.top = 50;
    light.shadow.camera.bottom = -50;
    light.shadow.bias = -0.0001;
    visualMesh = createDirectionalLightVisual(color);
  } else if (obj.lightType === 'spot') {
    light = new THREE.SpotLight(
      color,
      obj.intensity || 3,
      obj.distance || 10,
      obj.angle || Math.PI / 4,
      obj.penumbra || 0.3,
      obj.decay || 1
    );
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = obj.distance || 10;
    light.shadow.bias = -0.001;
    visualMesh = createSpotLightVisual(color, obj.angle);
  }

  if (!light) return null;

  light.position.set(obj.position[0], obj.position[1], obj.position[2]);
  light.rotation.set(
    THREE.MathUtils.degToRad(obj.rotation[0]),
    THREE.MathUtils.degToRad(obj.rotation[1]),
    THREE.MathUtils.degToRad(obj.rotation[2])
  );
  light.userData = { id: obj.id, isLight: true, lightType: obj.lightType };

  if (obj.lightType === 'directional' || obj.lightType === 'spot') {
    const direction = getLightDirectionFromRotation(obj.rotation);
    light.target.position.set(
      obj.position[0] + direction.x * 5,
      obj.position[1] + direction.y * 5,
      obj.position[2] + direction.z * 5
    );
  }

  if (visualMesh) {
    light.add(visualMesh);
    light.userData.visualMesh = visualMesh;
  }
  return light;
}

/**
 * 根据对象旋转角更新方向/聚光灯 target 位置。
 * @param {THREE.Light} light - 光源
 * @param {Object} obj - 场景对象数据
 */
export function updateLightTargetFromObject(light, obj) {
  if (!light || !obj) return;
  const direction = getLightDirectionFromRotation(obj.rotation);
  light.target.position.set(
    obj.position[0] + direction.x * 5,
    obj.position[1] + direction.y * 5,
    obj.position[2] + direction.z * 5
  );
}
