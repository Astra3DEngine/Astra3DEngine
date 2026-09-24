/**
 * @file engine/ViewCube.js
 * @description 视图立方体（ViewCube）引擎类：负责场景/材质/射线拾取与相机动画。
 * 从 Viewport.jsx 提取，修复了此前动画 rAF 未取消与 GPU 资源未释放的泄漏。
 * @module engine/ViewCube
 */

import * as THREE from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';

const SIZE = 80;
const HOVER_COLOR = 0x66ccff;
const ACTIVE_COLOR = 0x0099ff;

/**
 * 生成手搓截角立方体几何体。
 * @returns {THREE.ConvexGeometry}
 */
function createTruncatedCubeGeometry() {
  const scale = 0.7;
  const t = 1 / 3;
  const a = (1 - t) * scale;
  const b = scale;
  const vertices = [];

  const addVertex = (x, y, z) => vertices.push(new THREE.Vector3(x, y, z));

  for (let sx = -1; sx <= 1; sx += 2) {
    for (let sy = -1; sy <= 1; sy += 2) {
      for (let sz = -1; sz <= 1; sz += 2) {
        addVertex(sx * a, sy * a, sz * b);
        addVertex(sx * a, sy * b, sz * a);
        addVertex(sx * b, sy * a, sz * a);
      }
    }
  }

  return new ConvexGeometry(vertices);
}

/** 26 个面的法线方向（6 面 + 12 边 + 8 角） */
function buildFaceNormals() {
  const sqrt2 = Math.sqrt(2);
  const sqrt3 = Math.sqrt(3);
  return [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(1 / sqrt2, 1 / sqrt2, 0),
    new THREE.Vector3(1 / sqrt2, -1 / sqrt2, 0),
    new THREE.Vector3(-1 / sqrt2, 1 / sqrt2, 0),
    new THREE.Vector3(-1 / sqrt2, -1 / sqrt2, 0),
    new THREE.Vector3(1 / sqrt2, 0, 1 / sqrt2),
    new THREE.Vector3(1 / sqrt2, 0, -1 / sqrt2),
    new THREE.Vector3(-1 / sqrt2, 0, 1 / sqrt2),
    new THREE.Vector3(-1 / sqrt2, 0, -1 / sqrt2),
    new THREE.Vector3(0, 1 / sqrt2, 1 / sqrt2),
    new THREE.Vector3(0, 1 / sqrt2, -1 / sqrt2),
    new THREE.Vector3(0, -1 / sqrt2, 1 / sqrt2),
    new THREE.Vector3(0, -1 / sqrt2, -1 / sqrt2),
    new THREE.Vector3(1 / sqrt3, 1 / sqrt3, 1 / sqrt3),
    new THREE.Vector3(1 / sqrt3, 1 / sqrt3, -1 / sqrt3),
    new THREE.Vector3(1 / sqrt3, -1 / sqrt3, 1 / sqrt3),
    new THREE.Vector3(1 / sqrt3, -1 / sqrt3, -1 / sqrt3),
    new THREE.Vector3(-1 / sqrt3, 1 / sqrt3, 1 / sqrt3),
    new THREE.Vector3(-1 / sqrt3, 1 / sqrt3, -1 / sqrt3),
    new THREE.Vector3(-1 / sqrt3, -1 / sqrt3, 1 / sqrt3),
    new THREE.Vector3(-1 / sqrt3, -1 / sqrt3, -1 / sqrt3),
  ];
}

/**
 * ViewCube 引擎
 * @param {HTMLElement} container - 容器元素（父容器 must 保持常驻）
 * @param {Object} cameraApi - 与主相机交互的桥接：
 * @param {() => THREE.Camera} cameraApi.getActiveCamera - 获取主激活相机
 * @param {() => boolean} cameraApi.isOrthographic - 是否正交模式
 * @param {() => THREE.Vector3} cameraApi.getOrbitTarget - 获取 orbit 目标点
 * @param {(direction: THREE.Vector3) => void} cameraApi.onFaceClick - 点击面的回调（由外部触发相机动画）
 */
export class ViewCube {
  constructor(container, cameraApi) {
    this.container = container;
    this.cameraApi = cameraApi;
    this.scene = new THREE.Scene();
    this.faceNormals = buildFaceNormals();
    this.faceToMaterial = new Map();
    this.currentFaceIndex = -1;
    this.animationFrameId = null;

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.set(2, 2, 2);
    this.camera.lookAt(0, 0, 0);

    this.orthoCamera = new THREE.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0.1, 100);
    this.orthoCamera.position.set(0, 0, 3);
    this.orthoCamera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(SIZE, SIZE);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    this._buildCube();
    this._bindEvents();
  }

  /** 构建立方体、材质分组、拾取层、边缘线与标签 */
  _buildCube() {
    const geometry = createTruncatedCubeGeometry();

    this.faceMaterials = [];
    for (let i = 0; i < 26; i++) {
      this.faceMaterials.push(
        new THREE.MeshStandardMaterial({
          color: HOVER_COLOR,
          metalness: 0.3,
          roughness: 0.7,
          flatShading: true,
        })
      );
    }

    const positionAttr = geometry.getAttribute('position');
    const triangleCount = positionAttr.count / 3;
    const faceTriangleMap = new Map();
    for (let i = 0; i < 26; i++) faceTriangleMap.set(i, []);

    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const vC = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const edge1 = new THREE.Vector3();
    const edge2 = new THREE.Vector3();

    for (let triIdx = 0; triIdx < triangleCount; triIdx++) {
      const iA = triIdx * 3;
      const iB = triIdx * 3 + 1;
      const iC = triIdx * 3 + 2;
      vA.fromBufferAttribute(positionAttr, iA);
      vB.fromBufferAttribute(positionAttr, iB);
      vC.fromBufferAttribute(positionAttr, iC);
      edge1.subVectors(vB, vA);
      edge2.subVectors(vC, vA);
      normal.crossVectors(edge1, edge2).normalize();

      let bestFaceIdx = 0;
      let bestDot = normal.dot(this.faceNormals[0]);
      for (let i = 1; i < 26; i++) {
        const dot = normal.dot(this.faceNormals[i]);
        if (dot > bestDot) {
          bestDot = dot;
          bestFaceIdx = i;
        }
      }
      faceTriangleMap.get(bestFaceIdx).push(triIdx);
    }

    geometry.clearGroups();
    let materialIndex = 0;
    for (let faceIdx = 0; faceIdx < 26; faceIdx++) {
      const triangles = faceTriangleMap.get(faceIdx);
      if (triangles.length === 0) continue;
      triangles.sort((a, b) => a - b);
      let start = triangles[0];
      let count = 1;
      for (let i = 1; i <= triangles.length; i++) {
        if (i < triangles.length && triangles[i] === triangles[i - 1] + 1) {
          count++;
        } else {
          geometry.addGroup(start * 3, count * 3, materialIndex);
          start = i < triangles.length ? triangles[i] : -1;
          count = 1;
        }
      }
      this.faceToMaterial.set(faceIdx, materialIndex);
      materialIndex++;
    }

    this.cubeMesh = new THREE.Mesh(geometry, this.faceMaterials);
    this.scene.add(this.cubeMesh);

    this.hitGeometry = geometry.clone();
    this.hitGeometry.scale(1.15, 1.15, 1.15);
    this.hitMesh = new THREE.Mesh(
      this.hitGeometry,
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.cubeMesh.add(this.hitMesh);

    this.edgesGeometry = new THREE.EdgesGeometry(geometry);
    this.edgesMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 1 });
    const edges = new THREE.LineSegments(this.edgesGeometry, this.edgesMaterial);
    this.cubeMesh.add(edges);

    const faceLabels = [
      { position: new THREE.Vector3(1.15, 0, 0), label: 'R', color: 0xff0000 },
      { position: new THREE.Vector3(-1.15, 0, 0), label: 'L', color: 0xff0000 },
      { position: new THREE.Vector3(0, 1.15, 0), label: 'T', color: 0x00ff00 },
      { position: new THREE.Vector3(0, -1.15, 0), label: 'B', color: 0x00ff00 },
      { position: new THREE.Vector3(0, 0, 1.15), label: 'F', color: 0x0000ff },
      { position: new THREE.Vector3(0, 0, -1.15), label: 'K', color: 0x0000ff },
    ];
    this.labelTextures = [];
    faceLabels.forEach(({ position, label, color }) => {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 16, 16);

      const texture = new THREE.CanvasTexture(canvas);
      this.labelTextures.push(texture);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.copy(position);
      sprite.scale.set(0.35, 0.35, 1);
      this.cubeMesh.add(sprite);
    });
  }

  _bindEvents() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this._isDragging = false;
    this._prevMouse = { x: 0, y: 0 };

    this._handleClick = (e) => this._onClick(e);
    this._handleMouseDown = (e) => {
      this._isDragging = true;
      this._prevMouse = { x: e.clientX, y: e.clientY };
    };
    this._handleMouseMove = (e) => {
      if (!this._isDragging) return;
      const cameraApi = this.cameraApi;
      const activeCamera = cameraApi.getActiveCamera();
      const target = cameraApi.getOrbitTarget();
      if (!activeCamera || !target) return;

      const deltaX = e.clientX - this._prevMouse.x;
      const deltaY = e.clientY - this._prevMouse.y;

      const offset = activeCamera.position.clone().sub(target);
      const spherical = new THREE.Spherical();
      spherical.setFromVector3(offset);
      spherical.theta -= deltaX * 0.01;
      spherical.phi -= deltaY * 0.01;
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

      const newOffset = new THREE.Vector3().setFromSpherical(spherical);
      activeCamera.position.copy(target).add(newOffset);
      activeCamera.lookAt(target);
      this._prevMouse = { x: e.clientX, y: e.clientY };
    };
    this._handleMouseUp = () => {
      this._isDragging = false;
    };

    const el = this.renderer.domElement;
    el.addEventListener('click', this._handleClick);
    el.addEventListener('mousedown', this._handleMouseDown);
    window.addEventListener('mousemove', this._handleMouseMove);
    window.addEventListener('mouseup', this._handleMouseUp);
  }

  /**
   * 每帧从主相机同步朝向并渲染。
   * @param {boolean} isOrthographic - 当前是否正交相机
   */
  render(isOrthographic) {
    const mainCamera = this.cameraApi.getActiveCamera();
    if (!mainCamera) return;

    const activeCubeCamera = isOrthographic ? this.orthoCamera : this.camera;
    activeCubeCamera.quaternion.copy(mainCamera.quaternion);

    const direction = new THREE.Vector3();
    mainCamera.getWorldDirection(direction);
    activeCubeCamera.position.copy(direction).negate().multiplyScalar(3);

    if (isOrthographic) {
      this.orthoCamera.position.copy(activeCubeCamera.position);
      this.orthoCamera.quaternion.copy(activeCubeCamera.quaternion);
    }

    this.renderer.render(this.scene, activeCubeCamera);
  }

  _onClick(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const activeCubeCamera = this.cameraApi.isOrthographic() ? this.orthoCamera : this.camera;
    this.raycaster.setFromCamera(this.mouse, activeCubeCamera);
    const intersects = this.raycaster.intersectObject(this.hitMesh);
    if (intersects.length === 0) return;

    const intersection = intersects[0];
    const intersectPoint = intersection.point.clone().normalize();

    let bestMatch = this.faceNormals[0];
    let bestDot = intersectPoint.dot(this.faceNormals[0]);
    let bestIndex = 0;
    for (let i = 1; i < this.faceNormals.length; i++) {
      const dot = intersectPoint.dot(this.faceNormals[i]);
      if (dot > bestDot) {
        bestDot = dot;
        bestMatch = this.faceNormals[i];
        bestIndex = i;
      }
    }

    this._setFaceColor(bestIndex);
    this.cameraApi.onFaceClick(bestMatch);
  }

  _setFaceColor(faceIndex) {
    if (this.currentFaceIndex >= 0 && this.faceToMaterial.has(this.currentFaceIndex)) {
      this.faceMaterials[this.faceToMaterial.get(this.currentFaceIndex)].color.setHex(HOVER_COLOR);
    }
    if (faceIndex >= 0 && this.faceToMaterial.has(faceIndex)) {
      this.faceMaterials[this.faceToMaterial.get(faceIndex)].color.setHex(ACTIVE_COLOR);
      this.currentFaceIndex = faceIndex;
    }
  }

  /** 释放所有 GPU 资源与事件监听 */
  dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      this.cubeMesh.userData._animating = false;
    }

    const el = this.renderer.domElement;
    el.removeEventListener('click', this._handleClick);
    el.removeEventListener('mousedown', this._handleMouseDown);
    window.removeEventListener('mousemove', this._handleMouseMove);
    window.removeEventListener('mouseup', this._handleMouseUp);

    if (this.hitGeometry) this.hitGeometry.dispose();
    if (this.edgesGeometry) this.edgesGeometry.dispose();
    if (this.edgesMaterial) this.edgesMaterial.dispose();
    if (this.cubeMesh) {
      const geometry = this.cubeMesh.geometry;
      if (geometry) geometry.dispose();
    }
    if (this.faceMaterials) this.faceMaterials.forEach((m) => m.dispose());
    (this.labelTextures || []).forEach((t) => t.dispose());

    this.renderer.dispose();
  }
}

/**
 * 主相机朝着指定方向线性缓动（由 ViewCube 点击面触发）。
 * @param {THREE.Camera} camera - 主激活相机
 * @param {THREE.Vector3} target - orbit 目标点
 * @param {THREE.Vector3} direction - 目标朝向（单位向量）
 * @param {() => void} [onComplete] - 完成回调（例如调用 orbitControls.update）
 */
export function animateCameraToDirection(camera, target, direction, onComplete) {
  if (!camera) return;

  const distance = camera.position.distanceTo(target);
  const startPos = camera.position.clone();
  const targetPos = target.clone().add(direction.clone().multiplyScalar(distance));

  const startTime = Date.now();
  const duration = 300;

  const animate = () => {
    const elapsed = Date.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    const easeT = t * (2 - t);
    camera.position.lerpVectors(startPos, targetPos, easeT);
    camera.lookAt(target);
    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      onComplete?.();
    }
  };
  animate();
}
