/**
 * @file components/Viewport.jsx
 * @description 3D 视口组件，负责渲染场景、处理用户交互和变换控制
 * @module components/Viewport
 * 
 * 主要职责：
 * - Three.js 场景初始化和管理
 * - 相机控制（轨道控制、FPS 模式）
 * - 变换控制（移动、旋转、缩放）
 * - 对象选择和拾取
 * - 多选和批量变换
 * - 视口工具栏和视图立方体
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { msg } from '../i18n/index.js';
import DropdownMenu from './DropdownMenu.jsx';

import IconSelect from '../icons/select.svg?react';
import IconMove from '../icons/move.svg?react';
import IconRotate from '../icons/rotate.svg?react';
import IconScale from '../icons/scale.svg?react';
import IconUniformScale from '../icons/uniform-scale.svg?react';
import IconChevronDown from '../icons/chevron-down.svg?react';

import IconMouseLeft from '../icons/mouse-left.svg?react';
import IconMouseRight from '../icons/mouse-right.svg?react';
import IconKeyShift from '../icons/key-shift.svg?react';
import IconKeyW from '../icons/key-w.svg?react';
import IconKeyA from '../icons/key-a.svg?react';
import IconKeyS from '../icons/key-s.svg?react';
import IconKeyD from '../icons/key-d.svg?react';
import IconKeyQ from '../icons/key-q.svg?react';
import IconKeyE from '../icons/key-e.svg?react';
import IconSun from '../icons/sun.svg?react';
import IconSunOff from '../icons/sun-off.svg?react';

/**
 * 3D 视口组件
 * @param {Object} props - 组件属性
 * @param {Array} props.objects - 场景对象列表
 * @param {Array} props.assets - 资源列表
 * @param {Object} props.selectedObject - 当前选中的对象
 * @param {Array} props.selectedObjects - 多选对象列表
 * @param {Function} props.onSelectObject - 选择对象回调
 * @param {string} props.currentTool - 当前工具（select/translate/rotate/scale）
 * @param {Function} props.onToolChange - 工具切换回调
 * @param {boolean} props.isPlaying - 是否处于播放模式
 * @param {Function} props.onUpdateObject - 更新对象回调
 * @param {Function} props.onRecordHistory - 记录历史回调
 * @param {string} props.theme - 主题（dark/light）
 * @param {string} props.initialCameraType - 初始相机类型（perspective/orthographic）
 * @param {Array} props.initialCameraPosition - 初始相机位置
 * @param {Array} props.initialCameraLookAt - 初始相机看向点
 * @param {boolean} props.showToolbar - 是否显示工具栏
 * @param {boolean} props.showDock - 是否显示停靠栏
 * @param {boolean} props.showViewCube - 是否显示视图立方体
 * @param {string} props.viewLabel - 视图标签
 * @param {Function} props.onCameraTypeChange - 相机类型变化回调
 * @param {boolean} props.lightRenderingEnabled - 是否启用光渲染（阴影）
 * @param {Function} props.onLightRenderingChange - 光渲染开关变化回调
 * @returns {JSX.Element} 视口组件
 */
function Viewport({ 
  objects, 
  assets, 
  selectedObject, 
  selectedObjects = [],
  onSelectObject, 
  currentTool, 
  onToolChange, 
  isPlaying, 
  onUpdateObject, 
  onRecordHistory, 
  theme = 'dark',
  initialCameraType,
  initialCameraPosition,
  initialCameraLookAt,
  showToolbar = true,
  showDock = true,
  showViewCube = true,
  viewLabel,
  onCameraTypeChange,
  lightRenderingEnabled = true,
  onLightRenderingChange
}) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const transformControlsRef = useRef(null);
  const orbitControlsRef = useRef(null);
  const meshesRef = useRef({});
  const animationRef = useRef(null);
  const objectsRef = useRef(objects);
  const selectedObjectRef = useRef(selectedObject);
  const selectedObjectsRef = useRef(selectedObjects);
  const assetsRef = useRef(assets || []);
  const onRecordHistoryRef = useRef(onRecordHistory);
  const [uniformScale, setUniformScale] = useState(false);
  const uniformScaleRef = useRef(false);
  const viewCubeRef = useRef(null);
  const viewCubeSceneRef = useRef(null);
  const viewCubeCameraRef = useRef(null);
  const viewCubeRendererRef = useRef(null);
  const ambientLightRef = useRef(null);
  const defaultLightRef = useRef(null); // 默认方向光的 ref 喵
  const viewCubeMeshRef = useRef(null);
  const viewCubeOrthoCameraRef = useRef(null);
  const orthographicCameraRef = useRef(null);
  const [cameraType, setCameraType] = useState(() => initialCameraType || 'perspective');
  const cameraTypeRef = useRef(initialCameraType || 'perspective');
  const [isFPSMode, setIsFPSMode] = useState(false);
  const initialTransformsRef = useRef({});
  const hasDraggedRef = useRef(false);
  const lightRenderingEnabledRef = useRef(lightRenderingEnabled);
  const sceneLightsRef = useRef([]); // 存储场景中的光源对象（用于光渲染开关）

  /**
   * 获取 mesh 的几何中心（世界坐标）
   * 
   * 对于 model 类型（Group），使用 Box3.setFromObject 计算边界盒中心。
   * 对于普通 mesh，使用 geometry.boundingBox 计算中心。
   * 这样才能正确处理多选时的相对位置计算，不然 model 类型的 geoCenterOffset 会是 (0,0,0)，
   * 导致缩放时相对位置计算错误，模型会乱飞。
   * 
   * 这个函数定义在组件顶层，以便在多个 useEffect 中使用喵~
   */
  const getMeshGeometryCenterWorld = useCallback((mesh) => {
    if (mesh.userData.isModel) {
      // model 类型是 Group，用 Box3.setFromObject 计算边界盒
      const box = new THREE.Box3().setFromObject(mesh);
      const center = new THREE.Vector3();
      // 空 Group 会导致 Box3 为空，getCenter 返回 (0,0,0)，这会导致缩放时模型乱飞喵
      if (box.isEmpty()) {
        // 模型还没加载完成，用 mesh.position 作为临时中心
        center.copy(mesh.position);
      } else {
        box.getCenter(center);
      }
      return center;
    }
    
    if (mesh.userData.isLight) {
      // 光源没有 geometry，直接使用 position 作为中心喵
      return mesh.position.clone();
    }
    
    if (!mesh.geometry) return mesh.position.clone();
    
    mesh.geometry.computeBoundingBox();
    const geoCenter = new THREE.Vector3();
    mesh.geometry.boundingBox.getCenter(geoCenter);
    
    const worldCenter = geoCenter.clone();
    worldCenter.applyMatrix4(mesh.matrixWorld);
    
    return worldCenter;
  }, []);

  /**
   * 计算多个 mesh 的几何中心（世界坐标）
   * 
   * 这个函数定义在组件顶层，以便在多个 useEffect 中使用喵~
   */
  const calculateSelectionsCenter = useCallback((meshes) => {
    const center = new THREE.Vector3();
    if (meshes.length === 0) {
      // meshes 为空时，返回 (0, 0, 0)，避免 NaN 喵
      return center;
    }
    meshes.forEach(m => {
      const geoCenter = getMeshGeometryCenterWorld(m);
      center.add(geoCenter);
    });
    center.divideScalar(meshes.length);
    return center;
  }, [getMeshGeometryCenterWorld]);

  useEffect(() => {
    lightRenderingEnabledRef.current = lightRenderingEnabled;
  }, [lightRenderingEnabled]);

  useEffect(() => {
    cameraTypeRef.current = cameraType;
  }, [cameraType]);

  useEffect(() => {
    uniformScaleRef.current = uniformScale;
  }, [uniformScale]);

  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);

  useEffect(() => {
    assetsRef.current = assets || [];
  }, [assets]);

  useEffect(() => {
    selectedObjectRef.current = selectedObject;
  }, [selectedObject]);

  useEffect(() => {
    selectedObjectsRef.current = selectedObjects;
  }, [selectedObjects]);

  useEffect(() => {
    onRecordHistoryRef.current = onRecordHistory;
  }, [onRecordHistory]);

  // 光渲染开关效果：当关闭时，禁用所有光源，实现均匀亮度喵
  useEffect(() => {
    if (!sceneRef.current || !ambientLightRef.current) return;
    
    // 检查是否有用户创建的光源喵
    const hasUserLights = objectsRef.current.some(obj => obj.isLight);
    
    if (lightRenderingEnabled) {
      // 开启光渲染：环境光适中，光源工作，有阴影
      ambientLightRef.current.intensity = 0.3;
      sceneRef.current.traverse((child) => {
        // AmbientLight 不支持阴影，要排除掉喵
        if (child.isLight && child.type !== 'AmbientLight') {
          // 恢复光源的原始强度（存储在 userData 中）
          if (child.userData.originalIntensity !== undefined) {
            child.intensity = child.userData.originalIntensity;
          }
          if (child.castShadow !== undefined) {
            child.castShadow = true;
          }
        }
      });
      // 处理默认光源喵：如果有用户光源，禁用默认光源
      if (defaultLightRef.current) {
        if (hasUserLights) {
          defaultLightRef.current.intensity = 0;
          defaultLightRef.current.castShadow = false;
        } else {
          // 恢复默认光源的原始强度喵
          defaultLightRef.current.intensity = defaultLightRef.current.userData.originalIntensity || 1.5;
          defaultLightRef.current.castShadow = true;
        }
      }
      if (rendererRef.current) {
        rendererRef.current.shadowMap.enabled = true;
      }
    } else {
      // 关闭光渲染：环境光高强度，所有光源不工作，像贴图世界一样喵
      ambientLightRef.current.intensity = 1.5;
      sceneRef.current.traverse((child) => {
        // AmbientLight 不支持阴影，要排除掉喵
        if (child.isLight && child.type !== 'AmbientLight') {
          // 保存原始强度，然后设置为 0
          if (child.userData.originalIntensity === undefined) {
            child.userData.originalIntensity = child.intensity;
          }
          child.intensity = 0;
          if (child.castShadow !== undefined) {
            child.castShadow = false;
          }
        }
      });
      // 默认光源也要禁用喵
      if (defaultLightRef.current) {
        defaultLightRef.current.intensity = 0;
        defaultLightRef.current.castShadow = false;
      }
      if (rendererRef.current) {
        rendererRef.current.shadowMap.enabled = false;
      }
    }
  }, [lightRenderingEnabled]);

  useEffect(() => {
    if (!containerRef.current) return;

    let width = containerRef.current.clientWidth;
    let height = containerRef.current.clientHeight;
    
    if (width === 0 || height === 0) {
      width = 800;
      height = 600;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme === 'light' ? 0xf0f0f0 : 0x1a1a2e);
    sceneRef.current = scene;

    const camPos = initialCameraPosition || [5, 5, 5];
    const camLookAt = initialCameraLookAt || [0, 0, 0];

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(camPos[0], camPos[1], camPos[2]);
    camera.lookAt(camLookAt[0], camLookAt[1], camLookAt[2]);
    cameraRef.current = camera;

    const orthographicCamera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 1000);
    orthographicCamera.position.set(camPos[0], camPos[1], camPos[2]);
    orthographicCamera.lookAt(camLookAt[0], camLookAt[1], camLookAt[2]);
    orthographicCameraRef.current = orthographicCamera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    // 启用阴影映射，光渲染的基石喵
    renderer.shadowMap.enabled = lightRenderingEnabled;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0x666666);
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);

    // 环境光，用于在没有光渲染时提供均匀亮度
    // 光渲染开启时环境光强度稍微提高一点，不然模型太黑了喵
    const ambientLight = new THREE.AmbientLight(0xffffff, lightRenderingEnabled ? 0.3 : 1.5);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    // 默认的方向光，用于预览场景（没有用户光源时使用）
    // 强度提高到 1.5，不然模型太黑了喵
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 10, 5);
    // 默认光源也投射阴影，不然场景太暗了喵
    directionalLight.castShadow = lightRenderingEnabled;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    // 阴影相机范围要足够大才能覆盖整个场景喵
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    // 阴影偏移，防止阴影条纹和多重阴影喵
    directionalLight.shadow.bias = -0.0001;
    // 如果光渲染关闭，保存原始强度并设置为 0 喵
    // 同时保存原始强度，以便光渲染切换时恢复喵
    directionalLight.userData.originalIntensity = directionalLight.intensity;
    if (!lightRenderingEnabled) {
      directionalLight.intensity = 0;
    }
    scene.add(directionalLight);
    defaultLightRef.current = directionalLight; // 保存默认光源的 ref 喵

    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = false;
    orbitControls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: null
    };
    orbitControlsRef.current = orbitControls;

    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.setSpace('world');
    scene.add(transformControls);
    transformControlsRef.current = transformControls;

    const pivotObject = new THREE.Object3D();
    pivotObject.name = 'multiSelectPivot';
    scene.add(pivotObject);

    // 给我一个pivot，我可以转动整个世界
    const singleSelectPivot = new THREE.Object3D();
    singleSelectPivot.name = 'singleSelectPivot';
    scene.add(singleSelectPivot);

    let isTransformDragging = false;
    let hasDragged = false;
    let lastScale = new THREE.Vector3();
    let currentScaleAxis = null;
    
    let isShiftPressed = false;
    let isRightMouseDown = false;
    let isLeftMouseDown = false;
    let isPanning = false;
    const keysPressed = { w: false, a: false, s: false, d: false, q: false, e: false };
    const fpsMoveSpeed = 0.1;
    const fpsLookSpeed = 0.002;
    const panSpeed = 0.01;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let isPointerLocked = false;
    let fpsInitialTargetDistance = 5;

    const handleKeyDown = (e) => {
      // F1 快捷键切换光渲染喵
      if (e.key === 'F1' && onLightRenderingChange) {
        onLightRenderingChange(!lightRenderingEnabledRef.current);
        e.preventDefault();
        return;
      }
      
      if (e.key === 'Shift' && !isRightMouseDown) {
        isShiftPressed = true;
      }
      if (isRightMouseDown) {
        const key = e.key.toLowerCase();
        if (key in keysPressed) {
          keysPressed[key] = true;
        }
        e.stopPropagation();
        e.preventDefault();
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Shift') {
        isShiftPressed = false;
        if (isPanning) {
          isPanning = false;
          isLeftMouseDown = false;
          orbitControls.enabled = !isTransformDragging;
          renderer.domElement.style.cursor = 'default';
        }
      }
      const key = e.key.toLowerCase();
      if (key in keysPressed) {
        keysPressed[key] = false;
      }
    };

    const handleMouseDown = (e) => {
      if (e.button === 0 && isShiftPressed && !isRightMouseDown) {
        isLeftMouseDown = true;
        isPanning = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        orbitControls.enabled = false;
        renderer.domElement.style.cursor = 'grabbing';
      }
      if (e.button === 2) {
        e.preventDefault();
        isRightMouseDown = true;
        setIsFPSMode(true);
        fpsInitialTargetDistance = camera.position.distanceTo(orbitControls.target);
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        renderer.domElement.style.cursor = 'none';
        orbitControls.enabled = false;
        
        if (renderer.domElement.requestPointerLock) {
          renderer.domElement.requestPointerLock();
        }
      }
    };

    const handleMouseUp = (e) => {
      if (e.button === 0 && isPanning) {
        isLeftMouseDown = false;
        isPanning = false;
        orbitControls.enabled = !isTransformDragging;
        renderer.domElement.style.cursor = 'default';
      }
      if (e.button === 2) {
        isRightMouseDown = false;
        setIsFPSMode(false);
        Object.keys(keysPressed).forEach(k => keysPressed[k] = false);
        renderer.domElement.style.cursor = 'default';
        
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        orbitControls.target.copy(camera.position).add(forward.multiplyScalar(fpsInitialTargetDistance));
        
        orbitControls.enabled = !isTransformDragging;
        
        if (document.exitPointerLock) {
          document.exitPointerLock();
        }
      }
    };

    /**
     * 鼠标移动事件处理
     * 
     * 这里实现了两种特殊的相机控制模式。Shift + 左键拖拽是平移模式，
     * 计算相机右方向和上方向，根据鼠标移动量平移相机和轨道控制目标点。
     * OrbitControls 默认不支持左键平移，搞半天还得自己做。
     * 
     * 右键按住是超级控制模式，使用 Pointer Lock API 锁定鼠标，
     * WASDQE 控制移动，鼠标控制视角。这个模式灵感来自游戏引擎，适合快速浏览场景。
     * 
     * 技术细节：使用 YXZ 顺序的欧拉角避免万向节锁（虽然看起来没有卵用），
     * 限制 X 轴旋转范围防止相机翻转，
     * 同步更新 orbitControls.target 保持一致性。
     */
    const handleMouseMove = (e) => {
      if (isPanning) {
        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        
        const right = new THREE.Vector3(1, 0, 0);
        const up = new THREE.Vector3(0, 1, 0);
        right.applyQuaternion(camera.quaternion);
        up.applyQuaternion(camera.quaternion);
        
        const panOffset = new THREE.Vector3();
        panOffset.addScaledVector(right, -deltaX * panSpeed);
        panOffset.addScaledVector(up, deltaY * panSpeed);
        
        camera.position.add(panOffset);
        orbitControls.target.add(panOffset);
      }
      
      if (isRightMouseDown) {
        let deltaX, deltaY;
        
        if (isPointerLocked) {
          deltaX = e.movementX || 0;
          deltaY = e.movementY || 0;
        } else {
          deltaX = e.clientX - lastMouseX;
          deltaY = e.clientY - lastMouseY;
          lastMouseX = e.clientX;
          lastMouseY = e.clientY;
        }
        
        const yawQuat = new THREE.Quaternion();
        yawQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -deltaX * fpsLookSpeed);
        camera.quaternion.premultiply(yawQuat);
        
        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(camera.quaternion);
        const pitchQuat = new THREE.Quaternion();
        pitchQuat.setFromAxisAngle(right, -deltaY * fpsLookSpeed);
        
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        const currentPitch = Math.atan2(forward.y, Math.sqrt(forward.x * forward.x + forward.z * forward.z));
        const newPitch = currentPitch - deltaY * fpsLookSpeed;
        
        if (newPitch > -Math.PI / 2 + 0.01 && newPitch < Math.PI / 2 - 0.01) {
          camera.quaternion.premultiply(pitchQuat);
        }
        
        const finalForward = new THREE.Vector3(0, 0, -1);
        finalForward.applyQuaternion(camera.quaternion);
        orbitControls.target.copy(camera.position).add(finalForward.multiplyScalar(fpsInitialTargetDistance));
      }
    };

    const handlePointerLockChange = () => {
      isPointerLocked = document.pointerLockElement === renderer.domElement;
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp);
    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    /**
     * 递归获取所有后代对象
     * 
     * 这里的递归逻辑看起来很简单，但实际上处理的是一棵可能很深的树。
     * 每次拖拽变换时都要重新计算，如果层级很深可能会有性能问题。
     * 可是关我卵事，你自己塞这么多层。
     * 
     * 反正我也不会优化。
     * 
     * @param {number} parentId - 父对象 ID
     * @returns {Array} 所有后代对象列表
     */
    const getAllDescendants = (parentId) => {
      const descendants = [];
      const children = objectsRef.current.filter(o => o.parentId === parentId);
      children.forEach(child => {
        descendants.push(child);
        descendants.push(...getAllDescendants(child.id));
      });
      return descendants;
    };

    /**
     * 计算子对象相对于父对象的相对变换
     * 
     * 父子变换的核心逻辑：子对象的世界变换 = 父对象的世界变换 * 子对象的相对变换
     * 所以相对变换 = 父对象世界变换的逆 * 子对象的世界变换
     * 
     * 这个函数返回一个包含相对位置、相对旋转、相对缩放的对象，
     * 用于在父对象变换时重新计算子对象的世界坐标。
     * 
     * @param {THREE.Object3D} parentMesh - 父对象的 mesh
     * @param {THREE.Object3D} childMesh - 子对象的 mesh
     * @returns {Object} 相对变换 { position, quaternion, scale }
     */
    const computeRelativeTransform = (parentMesh, childMesh) => {
      const parentWorldQuat = new THREE.Quaternion();
      const parentWorldScale = new THREE.Vector3();
      parentMesh.matrixWorld.decompose(new THREE.Vector3(), parentWorldQuat, parentWorldScale);
      
      const childWorldPos = childMesh.position.clone();
      const childWorldQuat = new THREE.Quaternion();
      const childWorldScale = new THREE.Vector3();
      childMesh.matrixWorld.decompose(new THREE.Vector3(), childWorldQuat, childWorldScale);
      
      const relativePos = childWorldPos.clone().sub(parentMesh.position);
      relativePos.applyQuaternion(parentWorldQuat.clone().invert());
      relativePos.divide(parentWorldScale);
      
      const relativeQuat = parentWorldQuat.clone().invert().multiply(childWorldQuat);
      
      const relativeScale = new THREE.Vector3(
        childWorldScale.x / parentWorldScale.x,
        childWorldScale.y / parentWorldScale.y,
        childWorldScale.z / parentWorldScale.z
      );
      
      return { position: relativePos, quaternion: relativeQuat, scale: relativeScale };
    };

    /**
     * 根据父对象的新变换计算子对象的世界变换
     * 
     * 这是 computeRelativeTransform 的逆运算：
     * 子对象世界变换 = 父对象新变换 * 子对象相对变换
     * 
     * @param {THREE.Object3D} parentMesh - 父对象的 mesh（已变换）
     * @param {Object} relativeTransform - 子对象的相对变换
     * @returns {Object} 世界变换 { position, quaternion, scale }
     */
    const computeWorldTransformFromRelative = (parentMesh, relativeTransform) => {
      const parentWorldQuat = new THREE.Quaternion();
      const parentWorldScale = new THREE.Vector3();
      parentMesh.matrixWorld.decompose(new THREE.Vector3(), parentWorldQuat, parentWorldScale);
      
      const worldPos = relativeTransform.position.clone();
      worldPos.multiply(parentWorldScale);
      worldPos.applyQuaternion(parentWorldQuat);
      worldPos.add(parentMesh.position);
      
      const worldQuat = parentWorldQuat.multiply(relativeTransform.quaternion);
      
      const worldScale = new THREE.Vector3(
        relativeTransform.scale.x * parentWorldScale.x,
        relativeTransform.scale.y * parentWorldScale.y,
        relativeTransform.scale.z * parentWorldScale.z
      );
      
      return { position: worldPos, quaternion: worldQuat, scale: worldScale };
    };

    /**
     * 收集所有后代对象的相对变换
     * 
     * 递归遍历所有后代对象，计算每个后代相对于其直接父对象的相对变换。
     * 这样在父对象变换时，可以逐层计算后代的世界变换，保持层级关系正确。
     * 
     * @param {number} parentId - 父对象 ID
     * @returns {Map<number, Object>} 后代 ID -> 相对变换的映射
     */
    const collectDescendantRelativeTransforms = (parentId) => {
      const transforms = new Map();
      const children = objectsRef.current.filter(o => o.parentId === parentId);
      
      children.forEach(child => {
        const childMesh = meshesRef.current[child.id];
        const parentMesh = meshesRef.current[parentId];
        
        if (childMesh && parentMesh) {
          transforms.set(child.id, computeRelativeTransform(parentMesh, childMesh));
          
          const childDescendants = collectDescendantRelativeTransforms(child.id);
          childDescendants.forEach((transform, id) => transforms.set(id, transform));
        }
      });
      
      return transforms;
    };

    /**
     * 应用父对象变换到所有后代对象
     * 
     * 根据之前收集的相对变换，重新计算每个后代的世界变换。
     * 注意：必须按照层级顺序处理，从顶层到底层，
     * 因为子对象的计算依赖于父对象的新变换。
     * 我说了，孩子应该跟着父亲走！
     * 
     * @param {number} parentId - 父对象 ID
     * @param {Map<number, Object>} relativeTransforms - 后代 ID -> 相对变换的映射
     */
    const applyTransformToDescendants = (parentId, relativeTransforms) => {
      const children = objectsRef.current.filter(o => o.parentId === parentId);
      
      children.forEach(child => {
        const childMesh = meshesRef.current[child.id];
        const parentMesh = meshesRef.current[parentId];
        const relative = relativeTransforms.get(child.id);
        
        if (childMesh && parentMesh && relative) {
          const worldTransform = computeWorldTransformFromRelative(parentMesh, relative);
          
          childMesh.position.copy(worldTransform.position);
          childMesh.quaternion.copy(worldTransform.quaternion);
          childMesh.scale.copy(worldTransform.scale);
          
          applyTransformToDescendants(child.id, relativeTransforms);
        }
      });
    };

    /**
     * 变换控制拖拽事件处理
     * 
     * 这是最复杂的部分！多选变换需要记录初始变换状态，
     * 计算所有选中对象的中心点作为变换轴心，应用变换时同步更新所有对象，
     * 还要考虑后代对象的跟随变换，好神经啊。
     * 
     * 说真的，这个逻辑写得乱的很，主要是因为 Three.js 的 TransformControls 不直接支持多选，
     * 我们用一个隐藏的 pivot 对象作为变换轴心，变换时要手动计算每个对象的相对变换。
     * 如果 Three.js 官方支持多选变换，那我就舒服了，可惜啥也没有。
     */
    transformControls.addEventListener('dragging-changed', (event) => {
      isTransformDragging = event.value;
      if (!isRightMouseDown) {
        orbitControls.enabled = !event.value;
      }
      
      if (event.value) {
        hasDragged = true;
        hasDraggedRef.current = true;
        if (onRecordHistoryRef.current) {
          onRecordHistoryRef.current();
        }
        
        const attached = transformControls.object;
        const isPivotMode = attached && (attached.name === 'multiSelectPivot' || attached.name === 'singleSelectPivot');
        const isSinglePivotMode = attached && attached.name === 'singleSelectPivot';
        
        if (isPivotMode) {
          // 使用 pivot 的位置作为 center，而不是重新计算喵
          // 这样可以确保 initial.center 和 pivot 的位置一致
          const center = attached.position.clone();
          
          initialTransformsRef.current = {
            center: center.clone(),
            pivotPosition: attached.position.clone(),
            pivotRotation: attached.rotation.clone(),
            pivotScale: attached.scale.clone(),
            isSinglePivot: isSinglePivotMode,
            primaryId: isSinglePivotMode ? selectedObjectsRef.current[0]?.id : null,
            others: {}
          };
          
          selectedObjectsRef.current.filter(o => o).forEach(obj => {
            const mesh = meshesRef.current[obj.id];
            if (mesh) {
              // geoCenterOffset 需要在 mesh 的局部坐标系中计算，而不是世界坐标系喵
              // 这样旋转时才能正确保持几何中心相对于 mesh 的偏移
              const worldGeoCenter = getMeshGeometryCenterWorld(mesh);
              const localGeoCenter = mesh.worldToLocal(worldGeoCenter.clone());
              initialTransformsRef.current.others[obj.id] = {
                position: mesh.position.clone(),
                rotation: mesh.rotation.clone(),
                scale: mesh.scale.clone(),
                geoCenterOffset: localGeoCenter // 局部坐标系中的几何中心偏移
              };
            } else if (obj.isFolder) {
              // 文件夹对象没有 mesh，记录 objects 数组中的位置信息喵
              initialTransformsRef.current.others[obj.id] = {
                position: new THREE.Vector3(obj.position[0], obj.position[1], obj.position[2]),
                rotation: new THREE.Euler(
                  THREE.MathUtils.degToRad(obj.rotation[0]),
                  THREE.MathUtils.degToRad(obj.rotation[1]),
                  THREE.MathUtils.degToRad(obj.rotation[2])
                ),
                scale: new THREE.Vector3(obj.scale[0], obj.scale[1], obj.scale[2]),
                geoCenterOffset: new THREE.Vector3(0, 0, 0), // 文件夹没有几何中心
                isFolder: true
              };
            }
          });
          
          if (isSinglePivotMode && selectedObjectsRef.current[0]) {
            const primaryId = selectedObjectsRef.current[0].id;
            initialTransformsRef.current.descendantRelativeTransforms = collectDescendantRelativeTransforms(primaryId);
          }
        } else if (attached && attached.userData?.id) {
          const allMeshes = [attached];
          const others = selectedObjectsRef.current.filter(o => o && o.id !== attached.userData.id);
          others.forEach(obj => {
            const otherMesh = meshesRef.current[obj.id];
            if (otherMesh) {
              allMeshes.push(otherMesh);
            }
          });
          
          const center = calculateSelectionsCenter(allMeshes);
          
          const descendantRelativeTransforms = collectDescendantRelativeTransforms(attached.userData.id);
          
          initialTransformsRef.current = {
            center: center.clone(),
            primary: {
              id: attached.userData.id,
              position: attached.position.clone(),
              rotation: attached.rotation.clone(),
              scale: attached.scale.clone(),
              // geoCenterOffset 需要在 mesh 的局部坐标系中计算喵
              geoCenterOffset: attached.worldToLocal(getMeshGeometryCenterWorld(attached).clone())
            },
            others: {},
            descendantRelativeTransforms: descendantRelativeTransforms
          };
          
          others.forEach(obj => {
            const otherMesh = meshesRef.current[obj.id];
            if (otherMesh) {
              // geoCenterOffset 需要在 mesh 的局部坐标系中计算喵
              const worldGeoCenter = getMeshGeometryCenterWorld(otherMesh);
              const localGeoCenter = otherMesh.worldToLocal(worldGeoCenter.clone());
              initialTransformsRef.current.others[obj.id] = {
                position: otherMesh.position.clone(),
                rotation: otherMesh.rotation.clone(),
                scale: otherMesh.scale.clone(),
                geoCenterOffset: localGeoCenter
              };
              
              const otherDescendantTransforms = collectDescendantRelativeTransforms(obj.id);
              otherDescendantTransforms.forEach((transform, id) => {
                descendantRelativeTransforms.set(id, transform);
              });
            }
          });
        } else {
          initialTransformsRef.current = {};
        }
        
        if (transformControls.getMode() === 'scale' && attached) {
          lastScale.copy(attached.scale);
        }
      } else {
        const attached = transformControls.object;
        const isPivotMode = attached && (attached.name === 'multiSelectPivot' || attached.name === 'singleSelectPivot');
        
        if (isPivotMode && initialTransformsRef.current.pivotPosition) {
          selectedObjectsRef.current.filter(o => o).forEach(obj => {
            const mesh = meshesRef.current[obj.id];
            if (mesh) {
              onUpdateObject(obj.id, {
                position: [mesh.position.x, mesh.position.y, mesh.position.z],
                rotation: [
                  THREE.MathUtils.radToDeg(mesh.rotation.x),
                  THREE.MathUtils.radToDeg(mesh.rotation.y),
                  THREE.MathUtils.radToDeg(mesh.rotation.z)
                ],
                scale: [mesh.scale.x, mesh.scale.y, mesh.scale.z]
              }, false);
            } else if (obj.isFolder) {
              // 文件夹对象没有 mesh，需要根据 pivot 的变换来更新位置喵
              const initial = initialTransformsRef.current;
              const folderInitial = initial.others[obj.id];
              const mode = transformControls.getMode();
              
              if (!folderInitial) return;
              
              let newPos, newRotation, newScale;
              
              if (mode === 'translate') {
                // 平移：直接加上位移增量喵
                const deltaPos = attached.position.clone().sub(initial.pivotPosition);
                newPos = [
                  folderInitial.position.x + deltaPos.x,
                  folderInitial.position.y + deltaPos.y,
                  folderInitial.position.z + deltaPos.z
                ];
                newRotation = [
                  THREE.MathUtils.radToDeg(folderInitial.rotation.x),
                  THREE.MathUtils.radToDeg(folderInitial.rotation.y),
                  THREE.MathUtils.radToDeg(folderInitial.rotation.z)
                ];
                newScale = [folderInitial.scale.x, folderInitial.scale.y, folderInitial.scale.z];
              } else if (mode === 'rotate' && initial.center) {
                // 旋转：绕着 pivot 的中心旋转喵
                const deltaQuat = new THREE.Quaternion();
                const initialQuat = new THREE.Quaternion().setFromEuler(initial.pivotRotation);
                const currentQuat = new THREE.Quaternion().setFromEuler(attached.rotation);
                deltaQuat.multiplyQuaternions(currentQuat, initialQuat.clone().invert());
                
                // 计算文件夹对象的新位置（绕着 pivot 的中心旋转）
                const folderPos = folderInitial.position.clone();
                const rotatedPos = folderPos.clone().sub(initial.center);
                rotatedPos.applyQuaternion(deltaQuat);
                rotatedPos.add(initial.center);
                
                newPos = [rotatedPos.x, rotatedPos.y, rotatedPos.z];
                
                // 计算文件夹对象的新旋转
                const folderQuat = new THREE.Quaternion().setFromEuler(folderInitial.rotation);
                const newQuat = deltaQuat.clone().multiply(folderQuat);
                const newEuler = new THREE.Euler().setFromQuaternion(newQuat);
                newRotation = [
                  THREE.MathUtils.radToDeg(newEuler.x),
                  THREE.MathUtils.radToDeg(newEuler.y),
                  THREE.MathUtils.radToDeg(newEuler.z)
                ];
                newScale = [folderInitial.scale.x, folderInitial.scale.y, folderInitial.scale.z];
              } else if (mode === 'scale' && initial.center) {
                // 缩放：从 pivot 的中心向外缩放喵
                let scaleRatio;
                if (uniformScaleRef.current) {
                  const avgScale = (attached.scale.x + attached.scale.y + attached.scale.z) / 3;
                  const avgInitial = (initial.pivotScale.x + initial.pivotScale.y + initial.pivotScale.z) / 3;
                  const ratio = avgScale / avgInitial;
                  scaleRatio = new THREE.Vector3(ratio, ratio, ratio);
                } else {
                  scaleRatio = new THREE.Vector3(
                    attached.scale.x / initial.pivotScale.x,
                    attached.scale.y / initial.pivotScale.y,
                    attached.scale.z / initial.pivotScale.z
                  );
                }
                
                // 计算文件夹对象的新位置（从 pivot 的中心向外缩放）
                const folderPos = folderInitial.position.clone();
                const offset = folderPos.clone().sub(initial.center);
                offset.x *= scaleRatio.x;
                offset.y *= scaleRatio.y;
                offset.z *= scaleRatio.z;
                const newFolderPos = initial.center.clone().add(offset);
                
                newPos = [newFolderPos.x, newFolderPos.y, newFolderPos.z];
                newRotation = [
                  THREE.MathUtils.radToDeg(folderInitial.rotation.x),
                  THREE.MathUtils.radToDeg(folderInitial.rotation.y),
                  THREE.MathUtils.radToDeg(folderInitial.rotation.z)
                ];
                newScale = [
                  folderInitial.scale.x * scaleRatio.x,
                  folderInitial.scale.y * scaleRatio.y,
                  folderInitial.scale.z * scaleRatio.z
                ];
              } else {
                // 默认：只更新位置喵
                const deltaPos = attached.position.clone().sub(initial.pivotPosition);
                newPos = [
                  folderInitial.position.x + deltaPos.x,
                  folderInitial.position.y + deltaPos.y,
                  folderInitial.position.z + deltaPos.z
                ];
                newRotation = [
                  THREE.MathUtils.radToDeg(folderInitial.rotation.x),
                  THREE.MathUtils.radToDeg(folderInitial.rotation.y),
                  THREE.MathUtils.radToDeg(folderInitial.rotation.z)
                ];
                newScale = [folderInitial.scale.x, folderInitial.scale.y, folderInitial.scale.z];
              }
              
              onUpdateObject(obj.id, {
                position: newPos,
                rotation: newRotation,
                scale: newScale
              }, false);
            }
          });
          
          if (initialTransformsRef.current.isSinglePivot && initialTransformsRef.current.descendantRelativeTransforms) {
            initialTransformsRef.current.descendantRelativeTransforms.forEach((_, descId) => {
              const descMesh = meshesRef.current[descId];
              if (descMesh) {
                onUpdateObject(descId, {
                  position: [descMesh.position.x, descMesh.position.y, descMesh.position.z],
                  rotation: [
                    THREE.MathUtils.radToDeg(descMesh.rotation.x),
                    THREE.MathUtils.radToDeg(descMesh.rotation.y),
                    THREE.MathUtils.radToDeg(descMesh.rotation.z)
                  ],
                  scale: [descMesh.scale.x, descMesh.scale.y, descMesh.scale.z]
                }, false);
              }
            });
          }
        } else if (attached && attached.userData?.id && initialTransformsRef.current.primary) {
          const currentId = attached.userData.id;
          
          onUpdateObject(currentId, {
            position: [attached.position.x, attached.position.y, attached.position.z],
            rotation: [
              THREE.MathUtils.radToDeg(attached.rotation.x),
              THREE.MathUtils.radToDeg(attached.rotation.y),
              THREE.MathUtils.radToDeg(attached.rotation.z)
            ],
            scale: [attached.scale.x, attached.scale.y, attached.scale.z]
          }, false);
          
          const others = selectedObjectsRef.current.filter(o => o && o.id !== currentId);
          others.forEach(obj => {
            const otherMesh = meshesRef.current[obj.id];
            if (otherMesh) {
              onUpdateObject(obj.id, {
                position: [otherMesh.position.x, otherMesh.position.y, otherMesh.position.z],
                rotation: [
                  THREE.MathUtils.radToDeg(otherMesh.rotation.x),
                  THREE.MathUtils.radToDeg(otherMesh.rotation.y),
                  THREE.MathUtils.radToDeg(otherMesh.rotation.z)
                ],
                scale: [otherMesh.scale.x, otherMesh.scale.y, otherMesh.scale.z]
              }, false);
            }
          });
          
          if (initialTransformsRef.current.descendantRelativeTransforms) {
            initialTransformsRef.current.descendantRelativeTransforms.forEach((_, descId) => {
              const descMesh = meshesRef.current[descId];
              if (descMesh) {
                onUpdateObject(descId, {
                  position: [descMesh.position.x, descMesh.position.y, descMesh.position.z],
                  rotation: [
                    THREE.MathUtils.radToDeg(descMesh.rotation.x),
                    THREE.MathUtils.radToDeg(descMesh.rotation.y),
                    THREE.MathUtils.radToDeg(descMesh.rotation.z)
                  ],
                  scale: [descMesh.scale.x, descMesh.scale.y, descMesh.scale.z]
                }, false);
              }
            });
          }
        }
      }
    });

    /**
     * 变换控制实时更新事件
     * 
     * 这里处理的是拖拽过程中的实时变换同步。移动模式直接应用位移增量到所有对象，
     * 旋转模式使用四元数计算旋转增量，围绕中心点旋转，缩放模式计算缩放比例，
     * 从中心点向外缩放。
     * 
     * 缩放逻辑最复杂，马勒戈壁的得考虑对象相对于中心点的偏移，偏移也要随缩放比例变化，
     * 还要区分等比缩放和自由缩放。缩放代码写得有点丑，但能跑就行，但是感觉过几天就跑不起来了。
     * 我要让扣式咯给我改。
     */
    transformControls.addEventListener('change', () => {
      if (!isTransformDragging) return;
      
      const attached = transformControls.object;
      if (!attached) return;
      
      const isPivotMode = attached.name === 'multiSelectPivot' || attached.name === 'singleSelectPivot';
      const mode = transformControls.getMode();
      const initial = initialTransformsRef.current;

      if (isPivotMode && initial.pivotPosition) {
        if (mode === 'translate') {
          const deltaPos = attached.position.clone().sub(initial.pivotPosition);
          
          Object.keys(initial.others).forEach(objId => {
            const mesh = meshesRef.current[objId];
            const meshInitial = initial.others[objId];
            if (mesh && meshInitial) {
              mesh.position.copy(meshInitial.position).add(deltaPos);
            } else if (meshInitial && meshInitial.isFolder) {
              // 文件夹对象没有 mesh，但需要实时更新位置喵
              // 这里只记录位置变化，实际更新在拖拽结束时进行
              // 因为文件夹对象没有 Three.js mesh，无法直接操作
            }
          });
          
          if (initial.isSinglePivot && initial.descendantRelativeTransforms && initial.primaryId) {
            applyTransformToDescendants(initial.primaryId, initial.descendantRelativeTransforms);
          }
        } else if (mode === 'rotate' && initial.center) {
          const deltaQuat = new THREE.Quaternion();
          const initialQuat = new THREE.Quaternion().setFromEuler(initial.pivotRotation);
          const currentQuat = new THREE.Quaternion().setFromEuler(attached.rotation);
          deltaQuat.multiplyQuaternions(currentQuat, initialQuat.clone().invert());
          
          Object.keys(initial.others).forEach(objId => {
            const mesh = meshesRef.current[objId];
            const meshInitial = initial.others[objId];
            if (mesh && meshInitial) {
              // geoCenterOffset 是局部坐标系中的偏移，需要转换到世界坐标系喵
              // 转换顺序：先乘以 scale，然后应用旋转
              const geoCenterOffset = meshInitial.geoCenterOffset || new THREE.Vector3();
              const worldGeoCenterOffset = geoCenterOffset.clone()
                .multiply(meshInitial.scale)
                .applyEuler(meshInitial.rotation);
              const geoCenter = meshInitial.position.clone().add(worldGeoCenterOffset);
              
              const rotatedGeoCenter = geoCenter.clone().sub(initial.center);
              rotatedGeoCenter.applyQuaternion(deltaQuat);
              rotatedGeoCenter.add(initial.center);
              
              // 计算新的 mesh 位置：新几何中心 - 新的世界坐标系偏移
              // 但是新的世界坐标系偏移需要用新的旋转来计算喵
              // scale 不变，只旋转
              const meshInitialQuat = new THREE.Quaternion().setFromEuler(meshInitial.rotation);
              const newQuat = deltaQuat.clone().multiply(meshInitialQuat);
              const newWorldGeoCenterOffset = geoCenterOffset.clone()
                .multiply(meshInitial.scale)
                .applyQuaternion(newQuat);
              mesh.position.copy(rotatedGeoCenter).sub(newWorldGeoCenterOffset);
              
              mesh.quaternion.copy(newQuat);
            }
          });
          
          if (initial.isSinglePivot && initial.descendantRelativeTransforms && initial.primaryId) {
            applyTransformToDescendants(initial.primaryId, initial.descendantRelativeTransforms);
          }
        } else if (mode === 'scale' && initial.center) {
          // 等比缩放时，取三个轴的平均值
          let scaleRatio;
          if (uniformScaleRef.current) {
            const avgScale = (attached.scale.x + attached.scale.y + attached.scale.z) / 3;
            const avgInitial = (initial.pivotScale.x + initial.pivotScale.y + initial.pivotScale.z) / 3;
            const ratio = avgScale / avgInitial;
            scaleRatio = new THREE.Vector3(ratio, ratio, ratio);
          } else {
            scaleRatio = new THREE.Vector3(
              attached.scale.x / initial.pivotScale.x,
              attached.scale.y / initial.pivotScale.y,
              attached.scale.z / initial.pivotScale.z
            );
          }

          Object.keys(initial.others).forEach(objId => {
            const mesh = meshesRef.current[objId];
            const meshInitial = initial.others[objId];
            if (mesh && meshInitial) {
              // geoCenterOffset 是局部坐标系中的偏移，需要转换到世界坐标系喵
              // 转换顺序：先乘以 scale，然后应用旋转
              const geoCenterOffset = meshInitial.geoCenterOffset || new THREE.Vector3();
              const worldGeoCenterOffset = geoCenterOffset.clone()
                .multiply(meshInitial.scale)
                .applyEuler(meshInitial.rotation);
              const geoCenter = meshInitial.position.clone().add(worldGeoCenterOffset);
              
              const offset = geoCenter.clone().sub(initial.center);
              offset.x *= scaleRatio.x;
              offset.y *= scaleRatio.y;
              offset.z *= scaleRatio.z;
              
              const newGeoCenter = initial.center.clone().add(offset);
              
              // 计算新的 mesh 位置：新几何中心 - 新的世界坐标系偏移
              // 新的 scale 会影响世界坐标系偏移的长度喵
              const newScale = new THREE.Vector3(
                meshInitial.scale.x * scaleRatio.x,
                meshInitial.scale.y * scaleRatio.y,
                meshInitial.scale.z * scaleRatio.z
              );
              const newWorldGeoCenterOffset = geoCenterOffset.clone()
                .multiply(newScale)
                .applyEuler(meshInitial.rotation);
              mesh.position.copy(newGeoCenter).sub(newWorldGeoCenterOffset);

              mesh.scale.copy(newScale);
            }
          });
          
          if (initial.isSinglePivot && initial.descendantRelativeTransforms && initial.primaryId) {
            applyTransformToDescendants(initial.primaryId, initial.descendantRelativeTransforms);
          }
        }
        return;
      }
      
      if (!attached.userData?.id) return;
      
      const currentId = attached.userData.id;
      const current = objectsRef.current.find(obj => obj.id === currentId);
      if (!current) return;

      const mesh = attached;

      if (mode === 'translate' && initial.primary) {
        const deltaPos = mesh.position.clone().sub(initial.primary.position);
        
        Object.keys(initial.others).forEach(objId => {
          const otherMesh = meshesRef.current[objId];
          const otherInitial = initial.others[objId];
          if (otherMesh && otherInitial) {
            otherMesh.position.copy(otherInitial.position).add(deltaPos);
          }
        });
        
        if (initial.descendantRelativeTransforms) {
          applyTransformToDescendants(currentId, initial.descendantRelativeTransforms);
          Object.keys(initial.others).forEach(objId => {
            applyTransformToDescendants(parseInt(objId), initial.descendantRelativeTransforms);
          });
        }
      } else if (mode === 'rotate' && initial.primary && initial.center) {
        const deltaQuat = new THREE.Quaternion();
        const initialQuat = new THREE.Quaternion().setFromEuler(initial.primary.rotation);
        const currentQuat = new THREE.Quaternion().setFromEuler(mesh.rotation);
        deltaQuat.multiplyQuaternions(currentQuat, initialQuat.clone().invert());
        
        // geoCenterOffset 是局部坐标系中的偏移，需要转换到世界坐标系喵
        // 转换顺序：先乘以 scale，然后应用旋转
        const primaryGeoCenterOffset = initial.primary.geoCenterOffset || new THREE.Vector3();
        const primaryWorldGeoCenterOffset = primaryGeoCenterOffset.clone()
          .multiply(initial.primary.scale)
          .applyEuler(initial.primary.rotation);
        const primaryGeoCenter = initial.primary.position.clone().add(primaryWorldGeoCenterOffset);
        
        const rotatedPrimaryGeoCenter = primaryGeoCenter.clone().sub(initial.center);
        rotatedPrimaryGeoCenter.applyQuaternion(deltaQuat);
        rotatedPrimaryGeoCenter.add(initial.center);
        
        // 计算新的 mesh 位置：新几何中心 - 新的世界坐标系偏移
        const newWorldGeoCenterOffset = primaryGeoCenterOffset.clone()
          .multiply(initial.primary.scale)
          .applyQuaternion(currentQuat);
        mesh.position.copy(rotatedPrimaryGeoCenter).sub(newWorldGeoCenterOffset);
        
        Object.keys(initial.others).forEach(objId => {
          const otherMesh = meshesRef.current[objId];
          const otherInitial = initial.others[objId];
          if (otherMesh && otherInitial) {
            // geoCenterOffset 是局部坐标系中的偏移，需要转换到世界坐标系喵
            // 转换顺序：先乘以 scale，然后应用旋转
            const geoCenterOffset = otherInitial.geoCenterOffset || new THREE.Vector3();
            const worldGeoCenterOffset = geoCenterOffset.clone()
              .multiply(otherInitial.scale)
              .applyEuler(otherInitial.rotation);
            const geoCenter = otherInitial.position.clone().add(worldGeoCenterOffset);
            
            const rotatedGeoCenter = geoCenter.clone().sub(initial.center);
            rotatedGeoCenter.applyQuaternion(deltaQuat);
            rotatedGeoCenter.add(initial.center);
            
            // 计算新的 mesh 位置：新几何中心 - 新的世界坐标系偏移
            const otherInitialQuat = new THREE.Quaternion().setFromEuler(otherInitial.rotation);
            const newQuat = deltaQuat.clone().multiply(otherInitialQuat);
            const newOtherWorldGeoCenterOffset = geoCenterOffset.clone()
              .multiply(otherInitial.scale)
              .applyQuaternion(newQuat);
            otherMesh.position.copy(rotatedGeoCenter).sub(newOtherWorldGeoCenterOffset);
            
            otherMesh.quaternion.copy(newQuat);
          }
        });
        
        if (initial.descendantRelativeTransforms) {
          applyTransformToDescendants(currentId, initial.descendantRelativeTransforms);
          Object.keys(initial.others).forEach(objId => {
            applyTransformToDescendants(parseInt(objId), initial.descendantRelativeTransforms);
          });
        }
      } else if (mode === 'scale' && initial.primary && initial.center) {
        // 非 pivot 模式下的多选缩放
        // mesh 是 TransformControls 直接操作的对象（primary mesh）
        
        // 等比缩放时，取三个轴的平均值计算 scaleRatio
        let scaleRatio;
        if (uniformScaleRef.current) {
          const avgScale = (mesh.scale.x + mesh.scale.y + mesh.scale.z) / 3;
          const avgInitial = (initial.primary.scale.x + initial.primary.scale.y + initial.primary.scale.z) / 3;
          const ratio = avgScale / avgInitial;
          scaleRatio = new THREE.Vector3(ratio, ratio, ratio);
          
          // 强制把 mesh.scale 设置为等比缩放后的值
          mesh.scale.set(avgScale, avgScale, avgScale);
        } else {
          scaleRatio = new THREE.Vector3(
            mesh.scale.x / initial.primary.scale.x,
            mesh.scale.y / initial.primary.scale.y,
            mesh.scale.z / initial.primary.scale.z
          );
        }
        
        // 计算 primary mesh 的新位置
        // geoCenterOffset 是局部坐标系中的偏移，需要转换到世界坐标系喵
        // 转换顺序：先乘以 scale，然后应用旋转
        const primaryGeoCenterOffset = initial.primary.geoCenterOffset || new THREE.Vector3();
        const primaryWorldGeoCenterOffset = primaryGeoCenterOffset.clone()
          .multiply(initial.primary.scale)
          .applyEuler(initial.primary.rotation);
        const primaryGeoCenter = initial.primary.position.clone().add(primaryWorldGeoCenterOffset);
        
        const primaryOffset = primaryGeoCenter.clone().sub(initial.center);
        primaryOffset.x *= scaleRatio.x;
        primaryOffset.y *= scaleRatio.y;
        primaryOffset.z *= scaleRatio.z;
        const newPrimaryGeoCenter = initial.center.clone().add(primaryOffset);
        
        // 计算新的 mesh 位置：新几何中心 - 新的世界坐标系偏移
        // 新的 scale 会影响世界坐标系偏移的长度喵
        const newPrimaryScale = new THREE.Vector3(
          initial.primary.scale.x * scaleRatio.x,
          initial.primary.scale.y * scaleRatio.y,
          initial.primary.scale.z * scaleRatio.z
        );
        const newPrimaryWorldGeoCenterOffset = primaryGeoCenterOffset.clone()
          .multiply(newPrimaryScale)
          .applyEuler(initial.primary.rotation);
        mesh.position.copy(newPrimaryGeoCenter).sub(newPrimaryWorldGeoCenterOffset);
        
        // 更新其他 mesh 的位置和 scale
        Object.keys(initial.others).forEach(objId => {
          const otherMesh = meshesRef.current[objId];
          const otherInitial = initial.others[objId];
          if (otherMesh && otherInitial) {
            // geoCenterOffset 是局部坐标系中的偏移，需要转换到世界坐标系喵
            // 转换顺序：先乘以 scale，然后应用旋转
            const geoCenterOffset = otherInitial.geoCenterOffset || new THREE.Vector3();
            const worldGeoCenterOffset = geoCenterOffset.clone()
              .multiply(otherInitial.scale)
              .applyEuler(otherInitial.rotation);
            const geoCenter = otherInitial.position.clone().add(worldGeoCenterOffset);
            
            const offset = geoCenter.clone().sub(initial.center);
            offset.x *= scaleRatio.x;
            offset.y *= scaleRatio.y;
            offset.z *= scaleRatio.z;
            const newGeoCenter = initial.center.clone().add(offset);
            
            // 计算新的 mesh 位置：新几何中心 - 新的世界坐标系偏移
            const newOtherScale = new THREE.Vector3(
              otherInitial.scale.x * scaleRatio.x,
              otherInitial.scale.y * scaleRatio.y,
              otherInitial.scale.z * scaleRatio.z
            );
            const newOtherWorldGeoCenterOffset = geoCenterOffset.clone()
              .multiply(newOtherScale)
              .applyEuler(otherInitial.rotation);
            otherMesh.position.copy(newGeoCenter).sub(newOtherWorldGeoCenterOffset);
            
            otherMesh.scale.copy(newOtherScale);
          }
        });
        
        if (initial.descendantRelativeTransforms) {
          applyTransformToDescendants(currentId, initial.descendantRelativeTransforms);
          Object.keys(initial.others).forEach(objId => {
            applyTransformToDescendants(parseInt(objId), initial.descendantRelativeTransforms);
          });
        }
      }
    });

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      if (transformControlsRef.current) {
        const attached = transformControlsRef.current.object;
        if (attached && attached.parent !== scene) {
          transformControlsRef.current.detach();
        }
      }

      if (isRightMouseDown) {
        const direction = new THREE.Vector3();
        const right = new THREE.Vector3();
        const up = new THREE.Vector3(0, 1, 0);
        
        camera.getWorldDirection(direction);
        right.crossVectors(direction, up).normalize();
        
        if (keysPressed.w) {
          camera.position.addScaledVector(direction, fpsMoveSpeed);
        }
        if (keysPressed.s) {
          camera.position.addScaledVector(direction, -fpsMoveSpeed);
        }
        if (keysPressed.a) {
          camera.position.addScaledVector(right, -fpsMoveSpeed);
        }
        if (keysPressed.d) {
          camera.position.addScaledVector(right, fpsMoveSpeed);
        }
        if (keysPressed.q) {
          camera.position.y -= fpsMoveSpeed;
        }
        if (keysPressed.e) {
          camera.position.y += fpsMoveSpeed;
        }
        
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        orbitControls.target.copy(camera.position).add(forward.multiplyScalar(fpsInitialTargetDistance));
      }

      orbitControls.update();
      
      orthographicCamera.position.copy(camera.position);
      orthographicCamera.quaternion.copy(camera.quaternion);
      
      const distance = camera.position.length();
      const frustumSize = distance * 0.8;
      const aspect = renderer.domElement.width / renderer.domElement.height;
      orthographicCamera.left = -frustumSize * aspect / 2;
      orthographicCamera.right = frustumSize * aspect / 2;
      orthographicCamera.top = frustumSize / 2;
      orthographicCamera.bottom = -frustumSize / 2;
      orthographicCamera.updateProjectionMatrix();
      
      const activeCamera = cameraTypeRef.current === 'orthographic' ? orthographicCamera : camera;
      
      if (transformControlsRef.current) {
        transformControlsRef.current.camera = activeCamera;
      }
      
      renderer.render(scene, activeCamera);
      
      if (viewCubeRendererRef.current && viewCubeSceneRef.current && viewCubeCameraRef.current && viewCubeMeshRef.current) {
        viewCubeCameraRef.current.quaternion.copy(activeCamera.quaternion);
        
        const direction = new THREE.Vector3();
        activeCamera.getWorldDirection(direction);
        viewCubeCameraRef.current.position.copy(direction).negate().multiplyScalar(3);
        
        if (viewCubeOrthoCameraRef.current) {
          viewCubeOrthoCameraRef.current.position.copy(viewCubeCameraRef.current.position);
          viewCubeOrthoCameraRef.current.quaternion.copy(viewCubeCameraRef.current.quaternion);
        }
        
        const viewCubeActiveCamera = cameraTypeRef.current === 'orthographic' ? viewCubeOrthoCameraRef.current : viewCubeCameraRef.current;
        viewCubeRendererRef.current.render(viewCubeSceneRef.current, viewCubeActiveCamera);
      }
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp);
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      if (document.pointerLockElement === renderer.domElement) {
        document.exitPointerLock();
      }
      resizeObserver.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (transformControlsRef.current) {
        transformControlsRef.current.dispose();
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;
    
    sceneRef.current.background = new THREE.Color(theme === 'light' ? 0xf0f0f0 : 0x1a1a2e);
  }, [theme]);

  useEffect(() => {
    if (!viewCubeRef.current) return;
    
    const size = 80;
    
    const viewCubeScene = new THREE.Scene();
    viewCubeSceneRef.current = viewCubeScene;
    
    const viewCubeCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    viewCubeCamera.position.set(2, 2, 2);
    viewCubeCamera.lookAt(0, 0, 0);
    viewCubeCameraRef.current = viewCubeCamera;
    
    const viewCubeOrthoCamera = new THREE.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0.1, 100);
    viewCubeOrthoCamera.position.set(0, 0, 3);
    viewCubeOrthoCamera.lookAt(0, 0, 0);
    viewCubeOrthoCameraRef.current = viewCubeOrthoCamera;
    
    const viewCubeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    viewCubeRenderer.setSize(size, size);
    viewCubeRenderer.setPixelRatio(window.devicePixelRatio);
    viewCubeRenderer.setClearColor(0x000000, 0);
    viewCubeRef.current.appendChild(viewCubeRenderer.domElement);
    viewCubeRendererRef.current = viewCubeRenderer;
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    viewCubeScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    viewCubeScene.add(directionalLight);
    
    // 兄弟兄弟，手搓定向球，是不是很几把牛逼
    const createTruncatedCube = () => {
      const scale = 0.7;
      const t = 1/3;
      const a = (1 - t) * scale;
      const b = 1 * scale;
      const vertices = [];
      
      const addVertex = (x, y, z) => {
        vertices.push(new THREE.Vector3(x, y, z));
      };
      
      for (let sx = -1; sx <= 1; sx += 2) {
        for (let sy = -1; sy <= 1; sy += 2) {
          for (let sz = -1; sz <= 1; sz += 2) {
            addVertex(sx * a, sy * a, sz * b);
            addVertex(sx * a, sy * b, sz * a);
            addVertex(sx * b, sy * a, sz * a);
          }
        }
      }
      
      const geometry = new ConvexGeometry(vertices);
      return geometry;
    };
    
    const geometry = createTruncatedCube();
    
    const sqrt2 = Math.sqrt(2);
    const sqrt3 = Math.sqrt(3);
    
    const faceNormals = [
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
      new THREE.Vector3(-1 / sqrt3, -1 / sqrt3, -1 / sqrt3)
    ];
    
    const faceMaterials = [];
    for (let i = 0; i < 26; i++) {
      faceMaterials.push(new THREE.MeshStandardMaterial({
        color: 0x66ccff,
        metalness: 0.3,
        roughness: 0.7,
        flatShading: true
      }));
    }
    
    const positionAttr = geometry.getAttribute('position');
    const triangleCount = positionAttr.count / 3;
    const faceTriangleMap = new Map();
    
    for (let i = 0; i < 26; i++) {
      faceTriangleMap.set(i, []);
    }
    
    const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const edge1 = new THREE.Vector3(), edge2 = new THREE.Vector3();
    
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
      let bestDot = normal.dot(faceNormals[0]);
      
      for (let i = 1; i < 26; i++) {
        const dot = normal.dot(faceNormals[i]);
        if (dot > bestDot) {
          bestDot = dot;
          bestFaceIdx = i;
        }
      }
      
      faceTriangleMap.get(bestFaceIdx).push(triIdx);
    }
    
    geometry.clearGroups();
    let materialIndex = 0;
    const faceToMaterial = new Map();
    
    for (let faceIdx = 0; faceIdx < 26; faceIdx++) {
      const triangles = faceTriangleMap.get(faceIdx);
      if (triangles.length === 0) continue;
      
      triangles.sort((a, b) => a - b);
      
      let start = triangles[0];
      let count = 1;
      
      for (let i = 1; i <= triangles.length; i++) {
        if (i < triangles.length && triangles[i] === triangles[i-1] + 1) {
          count++;
        } else {
          geometry.addGroup(start * 3, count * 3, materialIndex);
          start = i < triangles.length ? triangles[i] : -1;
          count = 1;
        }
      }
      
      faceToMaterial.set(faceIdx, materialIndex);
      materialIndex++;
    }
    
    const viewCubeMesh = new THREE.Mesh(geometry, faceMaterials);
    viewCubeScene.add(viewCubeMesh);
    viewCubeMeshRef.current = viewCubeMesh;
    
    const hitGeometry = geometry.clone();
    hitGeometry.scale(1.15, 1.15, 1.15);
    const hitMesh = new THREE.Mesh(hitGeometry, new THREE.MeshBasicMaterial({ visible: false }));
    viewCubeMesh.add(hitMesh);
    
    let currentFaceIndex = -1;
    
    const updateFaceColor = (faceIndex) => {
      if (currentFaceIndex >= 0 && faceToMaterial.has(currentFaceIndex)) {
        faceMaterials[faceToMaterial.get(currentFaceIndex)].color.setHex(0x66ccff);
      }
      if (faceIndex >= 0 && faceToMaterial.has(faceIndex)) {
        faceMaterials[faceToMaterial.get(faceIndex)].color.setHex(0x0099ff);
        currentFaceIndex = faceIndex;
      }
    };
    
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 1 });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    viewCubeMesh.add(edges);
    
    const faceLabels = [
      { position: new THREE.Vector3(1.15, 0, 0), label: 'R', color: 0xff0000 },
      { position: new THREE.Vector3(-1.15, 0, 0), label: 'L', color: 0xff0000 },
      { position: new THREE.Vector3(0, 1.15, 0), label: 'T', color: 0x00ff00 },
      { position: new THREE.Vector3(0, -1.15, 0), label: 'B', color: 0x00ff00 },
      { position: new THREE.Vector3(0, 0, 1.15), label: 'F', color: 0x0000ff },
      { position: new THREE.Vector3(0, 0, -1.15), label: 'K', color: 0x0000ff }
    ];
    
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
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.copy(position);
      sprite.scale.set(0.35, 0.35, 1);
      viewCubeMesh.add(sprite);
    });
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    const handleViewCubeClick = (e) => {
      const rect = viewCubeRenderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      
      const activeViewCubeCamera = cameraTypeRef.current === 'orthographic' ? viewCubeOrthoCameraRef.current : viewCubeCamera;
      raycaster.setFromCamera(mouse, activeViewCubeCamera);
      const intersects = raycaster.intersectObject(hitMesh);
      
      if (intersects.length > 0 && cameraRef.current) {
        const intersection = intersects[0];
        const intersectPoint = intersection.point.clone().normalize();
        
        let bestMatch = faceNormals[0];
        let bestDot = intersectPoint.dot(faceNormals[0]);
        let bestIndex = 0;
        
        for (let i = 1; i < faceNormals.length; i++) {
          const dot = intersectPoint.dot(faceNormals[i]);
          if (dot > bestDot) {
            bestDot = dot;
            bestMatch = faceNormals[i];
            bestIndex = i;
          }
        }
        
        updateFaceColor(bestIndex);
        
        const target = orbitControlsRef.current ? orbitControlsRef.current.target.clone() : new THREE.Vector3(0, 0, 0);
        const distance = cameraRef.current.position.distanceTo(target);
        
        const startPos = cameraRef.current.position.clone();
        const targetPos = bestMatch.clone().multiplyScalar(distance).add(target);
        
        const startTime = Date.now();
        const duration = 300;
        
        const animateCamera = () => {
          const elapsed = Date.now() - startTime;
          const t = Math.min(elapsed / duration, 1);
          const easeT = t * (2 - t);
          
          cameraRef.current.position.lerpVectors(startPos, targetPos, easeT);
          cameraRef.current.lookAt(target);
          
          if (t < 1) {
            requestAnimationFrame(animateCamera);
          } else {
            if (orbitControlsRef.current) {
              orbitControlsRef.current.update();
            }
          }
        };
        animateCamera();
      }
    };
    
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    
    const handleMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };
    
    const handleMouseMove = (e) => {
      if (!isDragging || !cameraRef.current || !orbitControlsRef.current) return;
      
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;
      
      const target = orbitControlsRef.current.target.clone();
      const offset = cameraRef.current.position.clone().sub(target);
      
      const spherical = new THREE.Spherical();
      spherical.setFromVector3(offset);
      
      spherical.theta -= deltaX * 0.01;
      spherical.phi -= deltaY * 0.01;
      
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
      
      const newOffset = new THREE.Vector3().setFromSpherical(spherical);
      cameraRef.current.position.copy(target).add(newOffset);
      cameraRef.current.lookAt(target);
      
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };
    
    const handleMouseUp = () => {
      isDragging = false;
    };
    
    viewCubeRenderer.domElement.addEventListener('click', handleViewCubeClick);
    viewCubeRenderer.domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      viewCubeRenderer.domElement.removeEventListener('click', handleViewCubeClick);
      viewCubeRenderer.domElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      viewCubeRenderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!transformControlsRef.current) return;

    switch (currentTool) {
      case 'select':
        transformControlsRef.current.setMode('translate');
        transformControlsRef.current.showX = false;
        transformControlsRef.current.showY = false;
        transformControlsRef.current.showZ = false;
        break;
      case 'move':
        transformControlsRef.current.setMode('translate');
        transformControlsRef.current.showX = true;
        transformControlsRef.current.showY = true;
        transformControlsRef.current.showZ = true;
        break;
      case 'rotate':
        transformControlsRef.current.setMode('rotate');
        transformControlsRef.current.showX = true;
        transformControlsRef.current.showY = true;
        transformControlsRef.current.showZ = true;
        break;
      case 'scale':
        transformControlsRef.current.setMode('scale');
        transformControlsRef.current.showX = true;
        transformControlsRef.current.showY = true;
        transformControlsRef.current.showZ = true;
        break;
      default:
        break;
    }
  }, [currentTool]);

  useEffect(() => {
    if (!sceneRef.current) return;

    // 检查是否有用户创建的光源喵
    const hasUserLights = objects.some(obj => obj.isLight);
    // 如果有用户光源，禁用默认方向光，避免产生多余阴影喵
    if (defaultLightRef.current) {
      defaultLightRef.current.intensity = hasUserLights ? 0 : 0.2;
      defaultLightRef.current.castShadow = hasUserLights ? false : lightRenderingEnabled;
    }

    const existingIds = new Set(Object.keys(meshesRef.current));
    const newIds = new Set(objects.map(obj => obj.id));

    existingIds.forEach(id => {
      if (!newIds.has(parseInt(id))) {
        const mesh = meshesRef.current[id];
        if (mesh) {
          sceneRef.current.remove(mesh);
          // 光源需要删除 target
          if (mesh.userData.isLight && mesh.target) {
            sceneRef.current.remove(mesh.target);
          }
          if (mesh.geometry) {
            mesh.geometry.dispose();
          }
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(m => m.dispose());
            } else {
              mesh.material.dispose();
            }
          }
          delete meshesRef.current[id];
        }
      }
    });

    objects.forEach(obj => {
      if (obj.type === 'cube' && !obj.faceTextures) {
        obj.faceTextures = {
          right: null,
          left: null,
          top: null,
          bottom: null,
          front: null,
          back: null
        };
      }
      
      if (meshesRef.current[obj.id]) {
        const mesh = meshesRef.current[obj.id];
        
        if (obj.isModel && mesh.userData.isModel && mesh.children.length === 0) {
          const asset = assetsRef.current.find(a => a.id === obj.assetId);
          if (asset && asset.gltfScene) {
            sceneRef.current.remove(mesh);
            
            const modelGroup = new THREE.Group();
            const modelContent = asset.gltfScene.clone();
            // OBJ 模型的子 Mesh 已经在加载时偏移过了，不需要再 sub center
            // GLTF 模型需要 sub center 来居化
            const center = asset.center || new THREE.Vector3(0, 0, 0);
            const isObjModel = asset.name && asset.name.toLowerCase().endsWith('.obj');
            if (!isObjModel) {
              modelContent.position.sub(center);
            }
            
            // 处理模型贴图：遍历所有 Mesh 并应用用户选择的贴图
            if (obj.textureId) {
              const textureAsset = assetsRef.current.find(a => a.id === obj.textureId);
              if (textureAsset && textureAsset.texture) {
                const texture = textureAsset.texture.clone();
                texture.needsUpdate = true;
                
                const uvScale = obj.uvScale || [1, 1];
                const uvOffset = obj.uvOffset || [0, 0];
                texture.repeat.set(uvScale[0], uvScale[1]);
                texture.offset.set(uvOffset[0], uvOffset[1]);
                
                modelContent.traverse((child) => {
                  if (child.isMesh && child.material) {
                    // 替换所有 Mesh 的漫反射贴图，保留其他材质属性
                    child.material.map = texture;
                    child.material.needsUpdate = true;
                  }
                });
              }
            }
            
            // 遍历模型中的所有 mesh，设置阴影属性喵
            modelContent.traverse((child) => {
              if (child.isMesh) {
                // 如果材质是 MeshBasicMaterial，转换为 MeshStandardMaterial 以支持阴影喵
                if (child.material && child.material.type === 'MeshBasicMaterial') {
                  const oldMat = child.material;
                  child.material = new THREE.MeshStandardMaterial({
                    color: oldMat.color || 0xffffff,
                    map: oldMat.map,
                    transparent: oldMat.transparent,
                    opacity: oldMat.opacity,
                    side: oldMat.side,
                    metalness: 0.1,
                    roughness: 0.8
                  });
                  oldMat.dispose();
                }
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });
            
            modelGroup.add(modelContent);
            modelGroup.position.set(obj.position[0], obj.position[1], obj.position[2]);
            modelGroup.rotation.set(
              THREE.MathUtils.degToRad(obj.rotation[0]),
              THREE.MathUtils.degToRad(obj.rotation[1]),
              THREE.MathUtils.degToRad(obj.rotation[2])
            );
            modelGroup.scale.set(obj.scale[0], obj.scale[1], obj.scale[2]);
            modelGroup.userData = { id: obj.id, isModel: true, assetSize: asset.size };

            sceneRef.current.add(modelGroup);
            meshesRef.current[obj.id] = modelGroup;
          }
        } else {
          mesh.position.set(obj.position[0], obj.position[1], obj.position[2]);
          mesh.rotation.set(
            THREE.MathUtils.degToRad(obj.rotation[0]),
            THREE.MathUtils.degToRad(obj.rotation[1]),
            THREE.MathUtils.degToRad(obj.rotation[2])
          );
          mesh.scale.set(obj.scale[0], obj.scale[1], obj.scale[2]);
          
          if (obj.type === 'cube' && obj.faceTextures && Array.isArray(mesh.material)) {
            const faceNames = ['right', 'left', 'top', 'bottom', 'front', 'back'];
            faceNames.forEach((faceName, index) => {
              const textureId = obj.faceTextures[faceName];
              const textureAsset = textureId ? assetsRef.current.find(a => a.id === textureId) : null;
              
              mesh.material[index].color.setStyle(obj.color || '#4a90d9');
              
              if (textureAsset && textureAsset.texture) {
                mesh.material[index].map = textureAsset.texture;
                mesh.material[index].needsUpdate = true;
              } else {
                mesh.material[index].map = null;
                mesh.material[index].needsUpdate = true;
              }
            });
          } else if ((obj.type === 'sphere' || obj.type === 'plane') && mesh.material) {
            mesh.material.color.setStyle(obj.color || '#4a90d9');
            
            if (obj.textureId) {
              const textureAsset = assetsRef.current.find(a => a.id === obj.textureId);
              if (textureAsset && textureAsset.texture) {
                const texture = textureAsset.texture.clone();
                texture.needsUpdate = true;
                
                const uvScale = obj.uvScale || [1, 1];
                const uvOffset = obj.uvOffset || [0, 0];
                texture.repeat.set(uvScale[0], uvScale[1]);
                texture.offset.set(uvOffset[0], uvOffset[1]);
                
                mesh.material.map = texture;
                mesh.material.needsUpdate = true;
              } else {
                mesh.material.map = null;
                mesh.material.needsUpdate = true;
              }
            } else if (mesh.material.map) {
              mesh.material.map = null;
              mesh.material.needsUpdate = true;
            }
          } else if (obj.isModel && mesh.userData.isModel) {
            // model 类型贴图更新：遍历 Group 中所有 Mesh
            if (obj.textureId) {
              const textureAsset = assetsRef.current.find(a => a.id === obj.textureId);
              if (textureAsset && textureAsset.texture) {
                const texture = textureAsset.texture.clone();
                texture.needsUpdate = true;
                // 确保贴图的 colorSpace 正确喵
                texture.colorSpace = THREE.SRGBColorSpace;
                
                const uvScale = obj.uvScale || [1, 1];
                const uvOffset = obj.uvOffset || [0, 0];
                texture.repeat.set(uvScale[0], uvScale[1]);
                texture.offset.set(uvOffset[0], uvOffset[1]);
                
                mesh.traverse((child) => {
                  if (child.isMesh && child.material) {
                    // 材质类型检查和转换。无论什么材质类型，都转换为 MeshStandardMaterial
                    const ensureStandardMaterial = (mat) => {
                      // MeshStandardMaterial 已经是正确的类型，只需要更新贴图喵
                      if (mat.type === 'MeshStandardMaterial') {
                        mat.map = texture;
                        mat.needsUpdate = true;
                        return mat;
                      }
                      
                      // 其他材质类型都需要转换为 MeshStandardMaterial 喵
                      const oldMat = mat;
                      
                      // specular 值影响 metalness
                      let specularIntensity = 0;
                      if (oldMat.specular) {
                        specularIntensity = (oldMat.specular.r + oldMat.specular.g + oldMat.specular.b) / 3;
                      }
                      
                      const metalness = specularIntensity < 0.1 ? 0.0 : Math.min(specularIntensity, 0.5);
                      const roughness = oldMat.shininess ? Math.max(1 - oldMat.shininess / 100, 0.5) : 0.8;
                      
                      const newMat = new THREE.MeshStandardMaterial({
                        color: oldMat.color || 0xffffff,
                        map: texture,
                        transparent: oldMat.transparent,
                        opacity: oldMat.opacity,
                        side: THREE.FrontSide,
                        metalness: metalness,
                        roughness: roughness,
                        emissive: oldMat.emissive || 0x000000
                      });
                      newMat.needsUpdate = true;
                      oldMat.dispose();
                      return newMat;
                    };
                    
                    if (Array.isArray(child.material)) {
                      child.material = child.material.map(ensureStandardMaterial);
                    } else {
                      child.material = ensureStandardMaterial(child.material);
                    }
                  }
                });
              }
            } else {
              // 清除贴图，恢复原始材质
              mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                  child.material.map = null;
                  child.material.needsUpdate = true;
                }
              });
            }
          } else if (obj.type === 'mesh' && mesh.userData.isMeshPart) {
            // mesh 部件类型贴图更新喵
            if (obj.textureId) {
              const textureAsset = assetsRef.current.find(a => a.id === obj.textureId);
              if (textureAsset && textureAsset.texture) {
                const texture = textureAsset.texture.clone();
                texture.needsUpdate = true;
                // 确保贴图的 colorSpace 正确喵
                texture.colorSpace = THREE.SRGBColorSpace;
                
                const uvScale = obj.uvScale || [1, 1];
                const uvOffset = obj.uvOffset || [0, 0];
                texture.repeat.set(uvScale[0], uvScale[1]);
                texture.offset.set(uvOffset[0], uvOffset[1]);
                
                // 材质转换函数，无论什么材质类型，都转换为 MeshStandardMaterial 喵
                const convertToStandardMaterial = (mat) => {
                  // MeshStandardMaterial 已经是正确的类型，只需要更新贴图喵
                  if (mat.type === 'MeshStandardMaterial') {
                    mat.map = texture;
                    mat.needsUpdate = true;
                    return mat;
                  }
                  
                  // 其他材质类型都需要转换为 MeshStandardMaterial 喵
                  const oldMat = mat;
                  const newMat = new THREE.MeshStandardMaterial({
                    color: oldMat.color || 0xffffff,
                    map: texture,
                    transparent: oldMat.transparent,
                    opacity: oldMat.opacity,
                    side: THREE.FrontSide,
                    metalness: 0.1,
                    roughness: 0.8,
                    emissive: oldMat.emissive || 0x000000
                  });
                  newMat.needsUpdate = true;
                  oldMat.dispose();
                  return newMat;
                };
                
                // 处理多材质的情况
                if (Array.isArray(mesh.material)) {
                  mesh.material = mesh.material.map(convertToStandardMaterial);
                } else {
                  mesh.material = convertToStandardMaterial(mesh.material);
                }
              }
            } else {
              // 清除贴图，恢复原始材质
              // 需要从原始 asset 中获取材质
              const asset = assetsRef.current.find(a => a.id === obj.assetId);
              if (asset && asset.gltfScene) {
                const pathParts = obj.meshPath.split('/');
                let targetMesh = null;
                
                if (pathParts.length === 1) {
                  asset.gltfScene.traverse((child) => {
                    if (child.isMesh && child.name === obj.meshPath) {
                      targetMesh = child;
                    }
                  });
                } else {
                  let currentObj = asset.gltfScene;
                  for (let i = 0; i < pathParts.length; i++) {
                    const part = pathParts[i];
                    currentObj = currentObj.children.find(c => c.name === part);
                    if (!currentObj) break;
                  }
                  if (currentObj && currentObj.isMesh) {
                    targetMesh = currentObj;
                  }
                }
                
                if (targetMesh) {
                  // 恢复原始材质贴图
                  if (Array.isArray(mesh.material)) {
                    mesh.material.forEach((mat, i) => {
                      if (targetMesh.material[i]) {
                        mat.map = targetMesh.material[i].map;
                        mat.needsUpdate = true;
                      }
                    });
                  } else {
                    mesh.material.map = targetMesh.material.map;
                    mesh.material.needsUpdate = true;
                  }
                }
              }
            }
          } else if (mesh.material && mesh.material.color) {
            mesh.material.color.setStyle(obj.color || '#4a90d9');
          }
          
          // 光源属性更新
          if (obj.isLight && mesh.userData.isLight) {
            mesh.color.setStyle(obj.color || '#ffffff');
            mesh.intensity = obj.intensity || 2;
            
            if (obj.lightType === 'point' || obj.lightType === 'spot') {
              mesh.distance = obj.distance || 10;
              mesh.decay = obj.decay || 1;
            }
            
            if (obj.lightType === 'spot') {
              mesh.angle = obj.angle || Math.PI / 4;
              mesh.penumbra = obj.penumbra || 0.3;
            }
            
            // 方向光和聚光灯需要更新 target
            if (obj.lightType === 'directional' || obj.lightType === 'spot') {
              const direction = new THREE.Vector3(0, -1, 0); // 默认向下
              direction.applyEuler(new THREE.Euler(
                THREE.MathUtils.degToRad(obj.rotation[0] || 0),
                THREE.MathUtils.degToRad(obj.rotation[1] || 0),
                THREE.MathUtils.degToRad(obj.rotation[2] || 0)
              ));
              mesh.target.position.set(
                obj.position[0] + direction.x * 5,
                obj.position[1] + direction.y * 5,
                obj.position[2] + direction.z * 5
              );
            }
            
            // 更新可视化 Mesh 的颜色
            if (mesh.userData.visualMesh) {
              mesh.userData.visualMesh.traverse((child) => {
                if (child.material) {
                  if (Array.isArray(child.material)) {
                    child.material.forEach(m => {
                      if (m.color) m.color.setStyle(obj.color || '#ffffff');
                    });
                  } else {
                    if (child.material.color) child.material.color.setStyle(obj.color || '#ffffff');
                  }
                }
              });
              
              // 聚光灯需要更新锥形大小
              if (obj.lightType === 'spot') {
                const coneLength = 0.6;
                const coneRadius = coneLength * Math.tan(obj.angle || Math.PI / 4);
                // 找到锥形 Mesh 和锥形边缘 LineSegments
                mesh.userData.visualMesh.children.forEach(child => {
                  if (child.geometry) {
                    if (child.geometry.type === 'ConeGeometry') {
                      child.geometry.dispose();
                      child.geometry = new THREE.ConeGeometry(coneRadius, coneLength, 16, 1, true);
                    } else if (child.geometry.type === 'EdgesGeometry') {
                      const newConeGeo = new THREE.ConeGeometry(coneRadius, coneLength, 16, 1, true);
                      child.geometry.dispose();
                      child.geometry = new THREE.EdgesGeometry(newConeGeo);
                      newConeGeo.dispose();
                    }
                  }
                });
              }
            }
          }
        }
      } else {
        if (obj.isFolder) {
          return;
        }
        
        if (obj.type === 'mesh' && obj.assetId && obj.meshPath) {
          console.log('Rendering mesh part:', obj);
          console.log('meshPath:', obj.meshPath);
          
          const asset = assetsRef.current.find(a => a.id === obj.assetId);
          console.log('Found asset for mesh:', asset);
          console.log('asset.gltfScene:', asset?.gltfScene);
          console.log('asset.gltfScene.name:', asset?.gltfScene?.name);
          console.log('asset.gltfScene.children:', asset?.gltfScene?.children?.map(c => c.name));
          
          if (asset && asset.gltfScene) {
            /**
             * 根据 meshPath 查找 mesh（简化版）
             * 
             * meshPath 不包含 asset.gltfScene.name，直接从子对象开始。
             * 
             * meshPath 格式：
             * - 空字符串 ''：asset.gltfScene 本身是 mesh
             * - 'MeshName'：asset.gltfScene.children 中名为 MeshName 的 mesh
             * - 'Group1/MeshName'：asset.gltfScene.children 中名为 Group1 的子对象，其 children 中名为 MeshName 的 mesh
             */
            let targetMesh = null;
            
            if (obj.meshPath === '') {
              // meshPath 是空字符串，说明 asset.gltfScene 本身是 mesh 。
              if (asset.gltfScene.isMesh) {
                targetMesh = asset.gltfScene;
                console.log('Found mesh at root (meshPath is empty):', targetMesh);
              } else {
                console.log('meshPath is empty but gltfScene is not a mesh!');
              }
            } else {
              // meshPath 不是空字符串，从 asset.gltfScene.children 开始查找。
              const pathParts = obj.meshPath.split('/');
              console.log('pathParts:', pathParts);
              
              // 从 asset.gltfScene.children 开始查找。
              let currentObj = asset.gltfScene;
              for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                console.log('Looking for part:', part, 'in currentObj:', currentObj?.name, 'children:', currentObj?.children?.map(c => c.name));
                
                // 在 currentObj.children 中查找名为 part 的子对象。
                currentObj = currentObj.children.find(c => c.name === part);
                
                if (!currentObj) {
                  console.log('Failed to find part:', part);
                  break;
                }
                
                console.log('Found currentObj:', currentObj?.name, 'isMesh:', currentObj?.isMesh);
              }
              
              if (currentObj && currentObj.isMesh) {
                targetMesh = currentObj;
                console.log('Found targetMesh:', targetMesh?.name);
              } else {
                console.log('currentObj is not a mesh:', currentObj);
              }
            }
            
            if (targetMesh) {
              console.log('Creating mesh from targetMesh:', targetMesh?.name);
              
              const geometry = targetMesh.geometry.clone();
              // 确保法线存在。clone() 后法线应该还在，但以防万一
              if (!geometry.attributes.normal) {
                geometry.computeVertexNormals();
              }
              
              // 克隆材质，这样每个 mesh 部件可以单独应用贴图喵
              let material;
              if (Array.isArray(targetMesh.material)) {
                material = targetMesh.material.map(m => m.clone());
              } else {
                material = targetMesh.material.clone();
              }
              
                // 材质类型检查和转换。无论什么材质类型，都转换为 MeshStandardMaterial
                // OBJ 模型可能使用 MeshBasicMaterial 或其他类型，不支持光照
                const ensureStandardMaterial = (mat) => {
                  // MeshStandardMaterial 已经是正确的类型，不需要转换喵
                  if (mat.type === 'MeshStandardMaterial') {
                    return mat;
                  }
                  
                  // 其他材质类型都需要转换为 MeshStandardMaterial 喵
                  const oldMat = mat;
                  
                  // specular 值影响 metalness 喵
                  let specularIntensity = 0;
                  if (oldMat.specular) {
                    specularIntensity = (oldMat.specular.r + oldMat.specular.g + oldMat.specular.b) / 3;
                  }
                  
                  const metalness = specularIntensity < 0.1 ? 0.0 : Math.min(specularIntensity, 0.5);
                  const roughness = oldMat.shininess ? Math.max(1 - oldMat.shininess / 100, 0.5) : 0.8;
                  
                  const newMat = new THREE.MeshStandardMaterial({
                    color: oldMat.color || 0xffffff,
                    map: oldMat.map,
                    transparent: oldMat.transparent,
                    opacity: oldMat.opacity,
                    side: THREE.FrontSide,
                    metalness: metalness,
                    roughness: roughness,
                    emissive: oldMat.emissive || 0x000000
                  });
                  newMat.needsUpdate = true;
                  oldMat.dispose();
                  return newMat;
                };
              
              if (Array.isArray(material)) {
                material = material.map(ensureStandardMaterial);
              } else {
                material = ensureStandardMaterial(material);
              }
              
              const mesh = new THREE.Mesh(geometry, material);
              mesh.position.set(obj.position[0], obj.position[1], obj.position[2]);
              mesh.rotation.set(
                THREE.MathUtils.degToRad(obj.rotation[0]),
                THREE.MathUtils.degToRad(obj.rotation[1]),
                THREE.MathUtils.degToRad(obj.rotation[2])
              );
              mesh.scale.set(obj.scale[0], obj.scale[1], obj.scale[2]);
              mesh.userData = { id: obj.id, isMeshPart: true };
              
              // 设置阴影属性。这是关键！
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              
              console.log('Created mesh:', mesh);
              
              // 应用贴图。如果用户给这个 mesh 部件指定了贴图
              if (obj.textureId) {
                const textureAsset = assetsRef.current.find(a => a.id === obj.textureId);
                if (textureAsset && textureAsset.texture) {
                  const texture = textureAsset.texture.clone();
                  texture.needsUpdate = true;
                  // 确保贴图的 colorSpace 正确，不然颜色会不对喵
                  texture.colorSpace = THREE.SRGBColorSpace;
                  // UV 变换喵
                  const uvScale = obj.uvScale || [1, 1];
                  const uvOffset = obj.uvOffset || [0, 0];
                  texture.repeat.set(uvScale[0], uvScale[1]);
                  texture.offset.set(uvOffset[0], uvOffset[1]);
                  
                  // 给材质应用贴图，处理多材质的情况
                  // 无论什么材质类型，都确保是 MeshStandardMaterial 以支持光照喵
                  const applyTextureToMaterial = (mat) => {
                    // MeshStandardMaterial 已经是正确的类型，只需要更新贴图喵
                    if (mat.type === 'MeshStandardMaterial') {
                      mat.map = texture;
                      mat.needsUpdate = true;
                      return mat;
                    }
                    
                    // 其他材质类型都需要转换为 MeshStandardMaterial 喵
                    const oldMat = mat;
                    const newMat = new THREE.MeshStandardMaterial({
                      color: oldMat.color || 0xffffff,
                      map: texture,
                      transparent: oldMat.transparent,
                      opacity: oldMat.opacity,
                      side: THREE.FrontSide,
                      metalness: 0.1,
                      roughness: 0.8,
                      emissive: oldMat.emissive || 0x000000
                    });
                    newMat.needsUpdate = true;
                    oldMat.dispose();
                    return newMat;
                  };
                  
                  if (Array.isArray(mesh.material)) {
                    mesh.material = mesh.material.map(applyTextureToMaterial);
                  } else {
                    mesh.material = applyTextureToMaterial(mesh.material);
                  }
                }
              }
              
              sceneRef.current.add(mesh);
              meshesRef.current[obj.id] = mesh;
              console.log('Added mesh to scene:', mesh);
            } else {
              console.log('Failed to find targetMesh for meshPath:', obj.meshPath);
            }
          } else {
            console.log('Asset or gltfScene not found for mesh:', obj);
          }
          return;
        }
        
        if (obj.isModel && obj.assetId) {
          const asset = assetsRef.current.find(a => a.id === obj.assetId);
          if (asset && asset.gltfScene) {
            const modelGroup = new THREE.Group();
            
            const modelContent = asset.gltfScene.clone();
            // OBJ 模型的子 Mesh 已经在加载时偏移过了，不需要再 sub center
            // GLTF 模型需要 sub center 来居化
            const center = asset.center || new THREE.Vector3(0, 0, 0);
            // 检查是否是 OBJ 模型（通过文件名判断）
            const isObjModel = asset.name && asset.name.toLowerCase().endsWith('.obj');
            if (!isObjModel) {
              modelContent.position.sub(center);
            }
            
            // 遍历模型中的所有 mesh，设置阴影属性喵
            // 同时检查材质类型，确保是 MeshStandardMaterial 以支持光照
            // clone() 后材质类型保持不变，需要再次检查和转换喵
            modelContent.traverse((child) => {
              if (child.isMesh) {
                // 确保法线存在。clone() 后法线应该还在，但以防万一
                if (!child.geometry.attributes.normal) {
                  child.geometry.computeVertexNormals();
                }
                
                child.castShadow = true;
                child.receiveShadow = true;
                
                // 材质类型检查和转换。无论什么材质类型，都转换为 MeshStandardMaterial
                // OBJ 模型 clone() 后可能仍然是 MeshBasicMaterial 或其他类型
                const ensureStandardMaterial = (mat) => {
                  // MeshStandardMaterial 已经是正确的类型，不需要转换喵
                  if (mat.type === 'MeshStandardMaterial') {
                    return mat;
                  }
                  
                  // 其他材质类型都需要转换为 MeshStandardMaterial 喵
                  const oldMat = mat;
                  
                  // specular 值影响 metalness 喵
                  let specularIntensity = 0;
                  if (oldMat.specular) {
                    specularIntensity = (oldMat.specular.r + oldMat.specular.g + oldMat.specular.b) / 3;
                  }
                  
                  const metalness = specularIntensity < 0.1 ? 0.0 : Math.min(specularIntensity, 0.5);
                  const roughness = oldMat.shininess ? Math.max(1 - oldMat.shininess / 100, 0.5) : 0.8;
                  
                  const newMat = new THREE.MeshStandardMaterial({
                    color: oldMat.color || 0xffffff,
                    map: oldMat.map,
                    transparent: oldMat.transparent,
                    opacity: oldMat.opacity,
                    side: THREE.FrontSide,
                    metalness: metalness,
                    roughness: roughness,
                    emissive: oldMat.emissive || 0x000000
                  });
                  newMat.needsUpdate = true;
                  oldMat.dispose();
                  return newMat;
                };
                
                if (Array.isArray(child.material)) {
                  child.material = child.material.map(ensureStandardMaterial);
                } else {
                  child.material = ensureStandardMaterial(child.material);
                }
              }
            });
            
            modelGroup.add(modelContent);
            modelGroup.position.set(obj.position[0], obj.position[1], obj.position[2]);
            modelGroup.rotation.set(
              THREE.MathUtils.degToRad(obj.rotation[0]),
              THREE.MathUtils.degToRad(obj.rotation[1]),
              THREE.MathUtils.degToRad(obj.rotation[2])
            );
            modelGroup.scale.set(obj.scale[0], obj.scale[1], obj.scale[2]);
            modelGroup.userData = { id: obj.id, isModel: true, assetSize: asset.size };

            sceneRef.current.add(modelGroup);
            meshesRef.current[obj.id] = modelGroup;
          }
          return;
        }

        // 光源类型处理
        if (obj.isLight) {
          let light;
          let visualMesh; // 可视化的 Mesh，不受光照影响

          if (obj.lightType === 'point') {
            light = new THREE.PointLight(
              new THREE.Color(obj.color || '#ffffff'),
              obj.intensity || 2,
              obj.distance || 10,
              obj.decay || 1
            );
            // 点光源投射阴影喵
            light.castShadow = true;
            light.shadow.mapSize.width = 1024;
            light.shadow.mapSize.height = 1024;
            light.shadow.camera.near = 0.1;
            light.shadow.camera.far = obj.distance || 10;
            // 阴影偏移，防止阴影条纹和多重阴影喵
            light.shadow.bias = -0.001;
            // 点光源可视化：发光球体 + 光晕
            const visualGeo = new THREE.SphereGeometry(0.15, 16, 16);
            const visualMat = new THREE.MeshBasicMaterial({
              color: new THREE.Color(obj.color || '#ffffff')
            });
            visualMesh = new THREE.Mesh(visualGeo, visualMat);
            
            // 添加光晕（多层透明球体）
            for (let i = 1; i <= 3; i++) {
              const haloGeo = new THREE.SphereGeometry(0.15 + i * 0.05, 16, 16);
              const haloMat = new THREE.MeshBasicMaterial({
                color: new THREE.Color(obj.color || '#ffffff'),
                transparent: true,
                opacity: 0.3 - i * 0.08
              });
              const halo = new THREE.Mesh(haloGeo, haloMat);
              visualMesh.add(halo);
            }
          } else if (obj.lightType === 'directional') {
            light = new THREE.DirectionalLight(
              new THREE.Color(obj.color || '#ffffff'),
              obj.intensity || 1.5
            );
            // 方向光投射阴影喵
            light.castShadow = true;
            light.shadow.mapSize.width = 2048;
            light.shadow.mapSize.height = 2048;
            light.shadow.camera.near = 0.1;
            light.shadow.camera.far = 100;
            light.shadow.camera.left = -50;
            light.shadow.camera.right = 50;
            light.shadow.camera.top = 50;
            light.shadow.camera.bottom = -50;
            // 阴影偏移，防止阴影条纹和多重阴影喵
            light.shadow.bias = -0.0001;
            // 方向光需要设置 target，否则会照射到原点
            // 根据旋转计算照射方向
            const direction = new THREE.Vector3(0, -1, 0); // 默认向下
            direction.applyEuler(new THREE.Euler(
              THREE.MathUtils.degToRad(obj.rotation[0] || 0),
              THREE.MathUtils.degToRad(obj.rotation[1] || 0),
              THREE.MathUtils.degToRad(obj.rotation[2] || 0)
            ));
            light.target.position.set(
              obj.position[0] + direction.x * 5,
              obj.position[1] + direction.y * 5,
              obj.position[2] + direction.z * 5
            );
            sceneRef.current.add(light.target);
            
            // 方向光可视化：太阳图标 + 方向箭头
            const visualGeo = new THREE.SphereGeometry(0.2, 16, 16);
            const visualMat = new THREE.MeshBasicMaterial({
              color: new THREE.Color(obj.color || '#ffffff')
            });
            visualMesh = new THREE.Mesh(visualGeo, visualMat);
            
            // 添加光芒线条（8条）
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
            const raysMat = new THREE.LineBasicMaterial({ color: new THREE.Color(obj.color || '#ffffff') });
            const rays = new THREE.LineSegments(raysGeo, raysMat);
            visualMesh.add(rays);
            
            // 添加方向箭头（指向照射方向）
            const arrowLength = 0.8;
            const arrowGeo = new THREE.BufferGeometry();
            const arrowPos = [0, 0, 0, 0, -arrowLength, 0];
            arrowGeo.setAttribute('position', new THREE.Float32BufferAttribute(arrowPos, 3));
            const arrowMat = new THREE.LineBasicMaterial({ color: new THREE.Color(obj.color || '#ffffff'), linewidth: 2 });
            const arrowLine = new THREE.Line(arrowGeo, arrowMat);
            visualMesh.add(arrowLine);
            
            // 箭头头部（小三角形）
            const arrowHeadGeo = new THREE.ConeGeometry(0.08, 0.15, 8);
            const arrowHeadMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(obj.color || '#ffffff') });
            const arrowHead = new THREE.Mesh(arrowHeadGeo, arrowHeadMat);
            arrowHead.position.y = -arrowLength - 0.075; // 箭头头部中心位置
            arrowHead.rotation.x = Math.PI; // ConeGeometry 默认尖端在上，旋转180度让尖端朝下
            visualMesh.add(arrowHead);
          } else if (obj.lightType === 'spot') {
            light = new THREE.SpotLight(
              new THREE.Color(obj.color || '#ffffff'),
              obj.intensity || 3,
              obj.distance || 10,
              obj.angle || Math.PI / 4,
              obj.penumbra || 0.3,
              obj.decay || 1
            );
            // 聚光灯投射阴影喵
            light.castShadow = true;
            light.shadow.mapSize.width = 1024;
            light.shadow.mapSize.height = 1024;
            light.shadow.camera.near = 0.1;
            light.shadow.camera.far = obj.distance || 10;
            // 阴影偏移，防止阴影条纹和多重阴影喵
            light.shadow.bias = -0.001;
            // 聚光灯需要设置 target，否则会照射到原点
            // 根据旋转计算照射方向
            const direction = new THREE.Vector3(0, -1, 0); // 默认向下
            direction.applyEuler(new THREE.Euler(
              THREE.MathUtils.degToRad(obj.rotation[0] || 0),
              THREE.MathUtils.degToRad(obj.rotation[1] || 0),
              THREE.MathUtils.degToRad(obj.rotation[2] || 0)
            ));
            light.target.position.set(
              obj.position[0] + direction.x * 5,
              obj.position[1] + direction.y * 5,
              obj.position[2] + direction.z * 5
            );
            sceneRef.current.add(light.target);
            
            // 聚光灯可视化：光源球体 + 锥形
            const bulbGeo = new THREE.SphereGeometry(0.12, 16, 16);
            const bulbMat = new THREE.MeshBasicMaterial({
              color: new THREE.Color(obj.color || '#ffffff')
            });
            visualMesh = new THREE.Mesh(bulbGeo, bulbMat);
            
            // 添加锥形（表示光照范围，尖端在光源位置，底部朝下）
            const coneLength = 0.6;
            const coneRadius = coneLength * Math.tan(obj.angle || Math.PI / 4);
            const coneGeo = new THREE.ConeGeometry(coneRadius, coneLength, 16, 1, true);
            const coneMat = new THREE.MeshBasicMaterial({
              color: new THREE.Color(obj.color || '#ffffff'),
              transparent: true,
              opacity: 0.3,
              side: THREE.DoubleSide
            });
            const cone = new THREE.Mesh(coneGeo, coneMat);
            // ConeGeometry 默认尖端在上，底部在下
            // 不旋转，让尖端在光源位置，底部朝下
            cone.position.y = -coneLength / 2 - 0.05; // 锥形中心偏移，让尖端在光源附近
            visualMesh.add(cone);
            
            // 添加锥形边缘线条
            const coneEdgeGeo = new THREE.EdgesGeometry(coneGeo);
            const coneEdgeMat = new THREE.LineBasicMaterial({ color: new THREE.Color(obj.color || '#ffffff') });
            const coneEdge = new THREE.LineSegments(coneEdgeGeo, coneEdgeMat);
            coneEdge.position.y = -coneLength / 2 - 0.05;
            visualMesh.add(coneEdge);
          }

          if (light) {
            light.position.set(obj.position[0], obj.position[1], obj.position[2]);
            light.rotation.set(
              THREE.MathUtils.degToRad(obj.rotation[0]),
              THREE.MathUtils.degToRad(obj.rotation[1]),
              THREE.MathUtils.degToRad(obj.rotation[2])
            );
            light.userData = { id: obj.id, isLight: true, lightType: obj.lightType };
            
            // 如果光渲染关闭，保存原始强度并设置为 0 喵
            if (!lightRenderingEnabledRef.current) {
              light.userData.originalIntensity = light.intensity;
              light.intensity = 0;
              light.castShadow = false;
            }

            sceneRef.current.add(light);
            if (visualMesh) {
              light.add(visualMesh);
              light.userData.visualMesh = visualMesh;
            }
            meshesRef.current[obj.id] = light;
          }
          return;
        }

        let geometry;
        switch (obj.type) {
          case 'cube':
            geometry = new THREE.BoxGeometry(1, 1, 1);
            break;
          case 'sphere':
            geometry = new THREE.SphereGeometry(0.5, 32, 32);
            break;
          case 'plane':
            geometry = new THREE.PlaneGeometry(2, 2);
            break;
          default:
            geometry = new THREE.BoxGeometry(1, 1, 1);
        }

        let material;
        if (obj.type === 'cube' && obj.faceTextures) {
          const faceNames = ['right', 'left', 'top', 'bottom', 'front', 'back'];
          const materials = faceNames.map(faceName => {
            const textureId = obj.faceTextures[faceName];
            const textureAsset = textureId ? assetsRef.current.find(a => a.id === textureId) : null;
            
            if (textureAsset && textureAsset.texture) {
              return new THREE.MeshStandardMaterial({
                map: textureAsset.texture,
                metalness: 0.3,
                roughness: 0.7
              });
            } else {
              return new THREE.MeshStandardMaterial({
                color: obj.color || 0x4a90d9,
                metalness: 0.3,
                roughness: 0.7
              });
            }
          });
          material = materials;
        } else if ((obj.type === 'sphere' || obj.type === 'plane') && obj.textureId) {
          const textureAsset = assetsRef.current.find(a => a.id === obj.textureId);
          if (textureAsset && textureAsset.texture) {
            const texture = textureAsset.texture.clone();
            texture.needsUpdate = true;
            
            const uvScale = obj.uvScale || [1, 1];
            const uvOffset = obj.uvOffset || [0, 0];
            texture.repeat.set(uvScale[0], uvScale[1]);
            texture.offset.set(uvOffset[0], uvOffset[1]);
            
            material = new THREE.MeshStandardMaterial({
              map: texture,
              color: obj.color || 0x4a90d9,
              metalness: 0.3,
              roughness: 0.7
            });
          } else {
            material = new THREE.MeshStandardMaterial({
              color: obj.color || 0x4a90d9,
              metalness: 0.3,
              roughness: 0.7
            });
          }
        } else {
          material = new THREE.MeshStandardMaterial({
            color: obj.color || 0x4a90d9,
            metalness: 0.3,
            roughness: 0.7
          });
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(obj.position[0], obj.position[1], obj.position[2]);
        mesh.rotation.set(
          THREE.MathUtils.degToRad(obj.rotation[0]),
          THREE.MathUtils.degToRad(obj.rotation[1]),
          THREE.MathUtils.degToRad(obj.rotation[2])
        );
        mesh.scale.set(obj.scale[0], obj.scale[1], obj.scale[2]);
        mesh.userData = { id: obj.id };
        // 阴影设置，让物体能投射和接收阴影喵
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        sceneRef.current.add(mesh);
        meshesRef.current[obj.id] = mesh;
      }
    });
  }, [objects, assets]);

  useEffect(() => {
    if (!transformControlsRef.current || !sceneRef.current) return;

    Object.values(meshesRef.current).forEach(mesh => {
      if (mesh.userData.outline) {
        mesh.remove(mesh.userData.outline);
        mesh.userData.outline.geometry.dispose();
        mesh.userData.outline.material.dispose();
        mesh.userData.outline = null;
      }
    });

    const objectsToHighlight = selectedObjects.length > 1 
      ? selectedObjects.filter(o => o) 
      : (selectedObject ? [selectedObject] : []);

    objectsToHighlight.forEach((obj, index) => {
      const mesh = meshesRef.current[obj.id];
      if (!mesh) return;

      const isPrimary = index === 0;
      
      if (mesh.userData.isModel) {
        // model 类型是 Group，outline 需要放在 modelContent 上
        // modelContent.position = -center（相对于 Group），所以几何中心在 Group 的局部原点
        // 但在 modelContent 的局部坐标系中，几何中心仍然是 center
        const modelContent = mesh.children[0];
        if (modelContent) {
          // 用 Box3.setFromObject 计算实际边界盒（世界坐标）
          const box = new THREE.Box3().setFromObject(modelContent);
          const size = new THREE.Vector3();
          box.getSize(size);
          
          // 边界盒中心（世界坐标）
          const boxCenter = new THREE.Vector3();
          box.getCenter(boxCenter);
          
          // 转换到 modelContent 的局部坐标系
          const localCenter = modelContent.worldToLocal(boxCenter.clone());
          
          // 创建边界盒几何体，稍微放大一点避免贴得太紧
          const outlineGeo = new THREE.BoxGeometry(size.x * 1.02, size.y * 1.02, size.z * 1.02);
          const outline = new THREE.LineSegments(
            new THREE.EdgesGeometry(outlineGeo),
            new THREE.LineBasicMaterial({ 
              color: isPrimary ? 0x4a90d9 : 0x66aaff, 
              linewidth: 2 
            })
          );
          
          // outline 放在 modelContent 上，位置是边界盒中心在局部坐标系中的位置
          outline.position.copy(localCenter);
          modelContent.add(outline);
          mesh.userData.outline = outline;
        }
      } else if (mesh.userData.isLight) {
        // 光源没有 geometry，使用一个简单的球体表示选中状态
        const outline = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.SphereGeometry(0.6, 8, 8)),
          new THREE.LineBasicMaterial({ 
            color: isPrimary ? 0x4a90d9 : 0x66aaff, 
            linewidth: 2 
          })
        );
        mesh.add(outline);
        mesh.userData.outline = outline;
      } else {
        const outline = new THREE.LineSegments(
          new THREE.EdgesGeometry(mesh.geometry),
          new THREE.LineBasicMaterial({ 
            color: isPrimary ? 0x4a90d9 : 0x66aaff, 
            linewidth: 2 
          })
        );
        outline.scale.setScalar(1.01);
        mesh.add(outline);
        mesh.userData.outline = outline;
      }
    });

    if (objectsToHighlight.length === 0) {
      transformControlsRef.current.detach();
    } else if (objectsToHighlight.length === 1) {
      const mesh = meshesRef.current[objectsToHighlight[0].id];
      if (mesh && mesh.parent === sceneRef.current) {
        // 使用 getMeshGeometryCenterWorld 函数计算几何中心，确保一致性喵
        const worldCenter = getMeshGeometryCenterWorld(mesh);
        
        const pivot = sceneRef.current.getObjectByName('singleSelectPivot');
        if (pivot) {
          pivot.position.copy(worldCenter);
          pivot.rotation.copy(mesh.rotation);
          pivot.scale.copy(mesh.scale);
          transformControlsRef.current.attach(pivot);
        }
      }
    } else {
      const meshes = objectsToHighlight
        .map(obj => meshesRef.current[obj.id])
        .filter(m => m && m.parent === sceneRef.current);
      
      // 如果 meshes 为空（比如文件夹内的 mesh 还没加载完成），尝试用文件夹对象的位置作为 pivot
      if (meshes.length === 0) {
        // 找到第一个有位置信息的对象（通常是文件夹对象）
        const firstObj = objectsToHighlight[0];
        if (firstObj && firstObj.position) {
          const pivot = sceneRef.current.getObjectByName('multiSelectPivot');
          if (pivot) {
            pivot.position.set(firstObj.position[0], firstObj.position[1], firstObj.position[2]);
            pivot.rotation.set(
              THREE.MathUtils.degToRad(firstObj.rotation[0] || 0),
              THREE.MathUtils.degToRad(firstObj.rotation[1] || 0),
              THREE.MathUtils.degToRad(firstObj.rotation[2] || 0)
            );
            pivot.scale.set(firstObj.scale[0] || 1, firstObj.scale[1] || 1, firstObj.scale[2] || 1);
            transformControlsRef.current.attach(pivot);
          }
        }
        return;
      }
      
      const center = calculateSelectionsCenter(meshes);
      
      const primaryMesh = meshes[0];
      if (primaryMesh) {
        const pivot = sceneRef.current.getObjectByName('multiSelectPivot');
        if (pivot) {
          pivot.position.copy(center);
          pivot.rotation.copy(primaryMesh.rotation);
          pivot.scale.copy(primaryMesh.scale);
          transformControlsRef.current.attach(pivot);
        }
      }
    }
  }, [selectedObject, selectedObjects, currentTool, calculateSelectionsCenter, getMeshGeometryCenterWorld]);

  useEffect(() => {
    if (!containerRef.current || !rendererRef.current) return;

    const canvas = rendererRef.current.domElement;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e) => {
      if (hasDraggedRef.current) {
        hasDraggedRef.current = false;
        return;
      }
      
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);

      const validObjects = Object.values(meshesRef.current).filter(
        mesh => mesh.parent === sceneRef.current
      );
      const intersects = raycaster.intersectObjects(validObjects, true);

      if (intersects.length > 0) {
        let clickedMesh = intersects[0].object;
        while (clickedMesh.parent && !meshesRef.current[clickedMesh.userData?.id]) {
          clickedMesh = clickedMesh.parent;
        }
        if (clickedMesh.userData?.id) {
          const found = objects.find(obj => obj.id === clickedMesh.userData.id);
          if (found) {
            onSelectObject(found);
          }
        }
      } else if (currentTool === 'select') {
        onSelectObject(null);
      }
    };

    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('click', handleClick);
    };
  }, [objects, currentTool, onSelectObject]);

  useEffect(() => {
    if (!sceneRef.current) return;

    if (isPlaying) {
      const animate = () => {
        Object.values(meshesRef.current).forEach(mesh => {
          mesh.rotation.y += 0.01;
        });
      };
      const interval = setInterval(animate, 16);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  /**
   * 贴图拖拽处理
   * 
   * 允许用户从资源面板拖拽贴图到视口中，应用到当前选中的模型。
   * 只有 model/sphere/plane 类型可以接收贴图。
   * 
   * 注意：只有在确实有贴图拖拽数据时才阻止默认行为，
   * 否则会干扰 OrbitControls 的正常工作，鼠标操作会变得很奇怪。
   */
  const handleDragOver = (e) => {
    // 只有贴图拖拽才阻止默认行为，其他拖拽（如层级面板拖拽）不处理
    if (e.dataTransfer.types.includes('application/astra-texture')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e) => {
    // 只有贴图拖拽才处理
    const textureData = e.dataTransfer.getData('application/astra-texture');
    if (!textureData) return;
    
    e.preventDefault();
    
    try {
      const { assetId } = JSON.parse(textureData);
      
      // 检查是否有选中对象
      if (!selectedObject) return;
      
      // model 类型用 isModel 判断，sphere/plane/cube/mesh 用 type 判断
      const canApplyTexture = selectedObject.isModel || 
                              selectedObject.type === 'sphere' || 
                              selectedObject.type === 'plane' ||
                              selectedObject.type === 'cube' ||
                              selectedObject.type === 'mesh';
      
      if (!canApplyTexture) return;
      
      // 应用贴图到选中对象
      if (onUpdateObject) {
        onRecordHistory?.();
        
        // cube 类型使用 faceTextures，拖拽贴图应用到鼠标碰到的那个面
        if (selectedObject.type === 'cube') {
          const mesh = meshesRef.current[selectedObject.id];
          if (mesh && sceneRef.current && cameraRef.current && containerRef.current) {
            // 用 raycaster 检测鼠标位置对应的面
            const rect = containerRef.current.getBoundingClientRect();
            const mouse = new THREE.Vector2(
              ((e.clientX - rect.left) / rect.width) * 2 - 1,
              -((e.clientY - rect.top) / rect.height) * 2 + 1
            );
            
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, cameraRef.current);
            
            const intersects = raycaster.intersectObject(mesh);
            if (intersects.length > 0) {
              // 遍历所有交点，找到不是角点的交点
              // 角点的三个轴分量都接近 0.5，面上的点只有一个轴接近 0.5
              const threshold = 0.48; // 判断是否在面上的阈值
              
              let bestFace = null;
              
              for (const intersect of intersects) {
                // 将交点转换到 mesh 的局部坐标系
                const localPoint = mesh.worldToLocal(intersect.point.clone());
                
                const absX = Math.abs(localPoint.x);
                const absY = Math.abs(localPoint.y);
                const absZ = Math.abs(localPoint.z);
                
                // 判断是否是角点：三个轴都接近 0.5
                const isCorner = absX > threshold && absY > threshold && absZ > threshold;
                
                if (isCorner) {
                  // 跳过角点
                  continue;
                }
                
                // 判断是哪个面：只有一个轴接近 0.5
                let faceName;
                if (absX > threshold && absY <= threshold && absZ <= threshold) {
                  faceName = localPoint.x > 0 ? 'right' : 'left';
                } else if (absY > threshold && absX <= threshold && absZ <= threshold) {
                  faceName = localPoint.y > 0 ? 'top' : 'bottom';
                } else if (absZ > threshold && absX <= threshold && absY <= threshold) {
                  faceName = localPoint.z > 0 ? 'front' : 'back';
                } else {
                  // 边上的点：两个轴接近 0.5，跳过
                  continue;
                }
                
                bestFace = faceName;
                break; // 找到第一个非角点的交点就停止
              }
              
              if (bestFace) {
                // 只更新那个面的贴图
                const newFaceTextures = { ...selectedObject.faceTextures };
                newFaceTextures[bestFace] = assetId;
                onUpdateObject(selectedObject.id, { faceTextures: newFaceTextures });
              } else {
                // 如果没有检测到面，应用到所有面作为 fallback
                onUpdateObject(selectedObject.id, {
                  faceTextures: {
                    right: assetId,
                    left: assetId,
                    top: assetId,
                    bottom: assetId,
                    front: assetId,
                    back: assetId
                  }
                });
              }
            } else {
              // 如果没有检测到面，应用到所有面作为 fallback
              onUpdateObject(selectedObject.id, {
                faceTextures: {
                  right: assetId,
                  left: assetId,
                  top: assetId,
                  bottom: assetId,
                  front: assetId,
                  back: assetId
                }
              });
            }
          }
        } else {
          // model/sphere/plane 类型使用 textureId
          onUpdateObject(selectedObject.id, { textureId: assetId });
        }
      }
    } catch (err) {
      console.error('Failed to parse texture drag data:', err);
    }
  };

  const tools = [
    { id: 'select', labelKey: 'tool.select', icon: <IconSelect className="tool-icon" /> },
    { id: 'move', labelKey: 'tool.move', icon: <IconMove className="tool-icon" /> },
    { id: 'rotate', labelKey: 'tool.rotate', icon: <IconRotate className="tool-icon" /> },
    { id: 'scale', labelKey: 'tool.scale', icon: <IconScale className="tool-icon" /> }
  ];

  const cameraModeItems = [
    {
      label: msg('viewport.perspective'),
      onClick: () => setCameraType('perspective')
    },
    {
      label: msg('viewport.orthographic'),
      onClick: () => setCameraType('orthographic')
    }
  ];

  return (
    <div 
      className="viewport-container" 
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {showToolbar && (
        <div className="viewport-toolbar">
          {tools.map(tool => (
            <button
              key={tool.id}
              className={`viewport-tool-btn ${currentTool === tool.id ? 'active' : ''}`}
              onClick={() => onToolChange(tool.id)}
              title={msg(tool.labelKey)}
            >
              {tool.icon}
            </button>
          ))}
          {currentTool === 'scale' && (
            <button
              className={`viewport-tool-btn ${uniformScale ? 'active' : ''}`}
              onClick={() => setUniformScale(!uniformScale)}
              title={uniformScale ? msg('tool.uniformScaleOn') : msg('tool.uniformScaleOff')}
            >
              <IconUniformScale className="tool-icon" />
            </button>
          )}
        </div>
      )}
      <div className="viewport-overlay">
        <span className="viewport-label">
          {viewLabel || (cameraType === 'perspective' ? msg('viewport.perspective') : msg('viewport.orthographic'))}
        </span>
      </div>
      <div className={`view-cube ${showViewCube ? '' : 'hidden'}`} ref={viewCubeRef} />
      {showDock && (
        <div className="viewport-dock">
          <div className="viewport-dock-item">
            <span className="viewport-dock-label">{msg('viewport.cameraMode')}:</span>
            <DropdownMenu
              label={cameraType === 'perspective' ? msg('viewport.perspective') : msg('viewport.orthographic')}
              items={cameraModeItems}
              roundedCorners="all"
              className="camera-mode-dropdown"
              position="top"
            />
          </div>
          {/* 光渲染开关按钮喵 */}
          {onLightRenderingChange && (
            <div className="viewport-dock-item">
              <button
                className={`viewport-dock-btn ${lightRenderingEnabled ? 'active' : ''}`}
                onClick={() => onLightRenderingChange(!lightRenderingEnabled)}
                title={`${lightRenderingEnabled ? msg('viewport.lightRenderingOn') : msg('viewport.lightRenderingOff')} (F1)`}
              >
                {lightRenderingEnabled ? (
                  <IconSun className="dock-icon" />
                ) : (
                  <IconSunOff className="dock-icon" />
                )}
              </button>
            </div>
          )}
          <div className="viewport-control-hint">
            {isFPSMode ? (
              <>
                <span className="hint-group">
                  <IconKeyW className="hint-icon" /><IconKeyA className="hint-icon" /><IconKeyS className="hint-icon" /><IconKeyD className="hint-icon" />
                  <span className="hint-text">{msg('viewport.hint.move')}</span>
                </span>
                <span className="hint-separator">|</span>
                <span className="hint-group">
                  <IconKeyQ className="hint-icon" /><IconKeyE className="hint-icon" />
                  <span className="hint-text">{msg('viewport.hint.updown')}</span>
                </span>
                <span className="hint-separator">|</span>
                <span className="hint-group">
                  <IconMouseRight className="hint-icon" />
                  <span className="hint-text">{msg('viewport.hint.look')}</span>
                </span>
              </>
            ) : (
              <>
                <span className="hint-group">
                  <IconMouseLeft className="hint-icon" />
                  <span className="hint-text">{msg('viewport.hint.rotate')}</span>
                </span>
                <span className="hint-separator">|</span>
                <span className="hint-group">
                  <IconKeyShift className="hint-icon" /><IconMouseLeft className="hint-icon" />
                  <span className="hint-text">{msg('viewport.hint.pan')}</span>
                </span>
                <span className="hint-separator">|</span>
                <span className="hint-group">
                  <IconMouseRight className="hint-icon" />
                  <span className="hint-text">{msg('viewport.hint.immersive')}</span>
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Viewport;
