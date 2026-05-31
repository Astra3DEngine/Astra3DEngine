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
  onCameraTypeChange
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
  const viewCubeMeshRef = useRef(null);
  const viewCubeOrthoCameraRef = useRef(null);
  const orthographicCameraRef = useRef(null);
  const [cameraType, setCameraType] = useState(() => initialCameraType || 'perspective');
  const cameraTypeRef = useRef(initialCameraType || 'perspective');
  const [isFPSMode, setIsFPSMode] = useState(false);
  const initialTransformsRef = useRef({});
  const hasDraggedRef = useRef(false);

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
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0x666666);
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

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
        const isPivotMode = attached && attached.name === 'multiSelectPivot';
        
        if (isPivotMode) {
          const allMeshes = selectedObjectsRef.current
            .filter(o => o)
            .map(o => meshesRef.current[o.id])
            .filter(m => m);
          
          const center = new THREE.Vector3();
          allMeshes.forEach(m => center.add(m.position));
          center.divideScalar(allMeshes.length);
          
          initialTransformsRef.current = {
            center: center.clone(),
            pivotPosition: attached.position.clone(),
            pivotRotation: attached.rotation.clone(),
            pivotScale: attached.scale.clone(),
            others: {}
          };
          
          selectedObjectsRef.current.filter(o => o).forEach(obj => {
            const mesh = meshesRef.current[obj.id];
            if (mesh) {
              initialTransformsRef.current.others[obj.id] = {
                position: mesh.position.clone(),
                rotation: mesh.rotation.clone(),
                scale: mesh.scale.clone()
              };
            }
          });
        } else if (attached && attached.userData?.id) {
          const allMeshes = [attached];
          const others = selectedObjectsRef.current.filter(o => o && o.id !== attached.userData.id);
          others.forEach(obj => {
            const otherMesh = meshesRef.current[obj.id];
            if (otherMesh) {
              allMeshes.push(otherMesh);
            }
          });
          
          const center = new THREE.Vector3();
          allMeshes.forEach(m => center.add(m.position));
          center.divideScalar(allMeshes.length);
          
          const descendants = getAllDescendants(attached.userData.id);
          
          initialTransformsRef.current = {
            center: center.clone(),
            primary: {
              id: attached.userData.id,
              position: attached.position.clone(),
              rotation: attached.rotation.clone(),
              scale: attached.scale.clone()
            },
            others: {},
            descendants: {}
          };
          
          others.forEach(obj => {
            const otherMesh = meshesRef.current[obj.id];
            if (otherMesh) {
              initialTransformsRef.current.others[obj.id] = {
                position: otherMesh.position.clone(),
                rotation: otherMesh.rotation.clone(),
                scale: otherMesh.scale.clone()
              };
            }
          });
          
          descendants.forEach(desc => {
            const descMesh = meshesRef.current[desc.id];
            if (descMesh) {
              initialTransformsRef.current.descendants[desc.id] = {
                position: descMesh.position.clone(),
                rotation: descMesh.rotation.clone(),
                scale: descMesh.scale.clone()
              };
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
        const isPivotMode = attached && attached.name === 'multiSelectPivot';
        
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
            }
          });
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
          
          if (initialTransformsRef.current.descendants) {
            Object.keys(initialTransformsRef.current.descendants).forEach(descId => {
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
      
      const isPivotMode = attached.name === 'multiSelectPivot';
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
            }
          });
        } else if (mode === 'rotate' && initial.center) {
          const deltaQuat = new THREE.Quaternion();
          const initialQuat = new THREE.Quaternion().setFromEuler(initial.pivotRotation);
          const currentQuat = new THREE.Quaternion().setFromEuler(attached.rotation);
          deltaQuat.multiplyQuaternions(currentQuat, initialQuat.clone().invert());
          
          Object.keys(initial.others).forEach(objId => {
            const mesh = meshesRef.current[objId];
            const meshInitial = initial.others[objId];
            if (mesh && meshInitial) {
              const pos = meshInitial.position.clone().sub(initial.center);
              pos.applyQuaternion(deltaQuat);
              pos.add(initial.center);
              mesh.position.copy(pos);
              
              const meshInitialQuat = new THREE.Quaternion().setFromEuler(meshInitial.rotation);
              const newQuat = deltaQuat.clone().multiply(meshInitialQuat);
              mesh.quaternion.copy(newQuat);
            }
          });
        } else if (mode === 'scale' && initial.center) {
          const scaleRatio = new THREE.Vector3(
            attached.scale.x / initial.pivotScale.x,
            attached.scale.y / initial.pivotScale.y,
            attached.scale.z / initial.pivotScale.z
          );

          Object.keys(initial.others).forEach(objId => {
            const mesh = meshesRef.current[objId];
            const meshInitial = initial.others[objId];
            if (mesh && meshInitial) {
              const offset = meshInitial.position.clone().sub(initial.center);
              offset.x *= scaleRatio.x;
              offset.y *= scaleRatio.y;
              offset.z *= scaleRatio.z;
              mesh.position.copy(initial.center).add(offset);

              mesh.scale.x = meshInitial.scale.x * scaleRatio.x;
              mesh.scale.y = meshInitial.scale.y * scaleRatio.y;
              mesh.scale.z = meshInitial.scale.z * scaleRatio.z;
            }
          });
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
        
        if (initial.descendants) {
          Object.keys(initial.descendants).forEach(descId => {
            const descMesh = meshesRef.current[descId];
            const descInitial = initial.descendants[descId];
            if (descMesh && descInitial) {
              descMesh.position.copy(descInitial.position).add(deltaPos);
            }
          });
        }
      } else if (mode === 'rotate' && initial.primary && initial.center) {
        const deltaQuat = new THREE.Quaternion();
        const initialQuat = new THREE.Quaternion().setFromEuler(initial.primary.rotation);
        const currentQuat = new THREE.Quaternion().setFromEuler(mesh.rotation);
        deltaQuat.multiplyQuaternions(currentQuat, initialQuat.clone().invert());
        
        const primaryPos = initial.primary.position.clone().sub(initial.center);
        primaryPos.applyQuaternion(deltaQuat);
        primaryPos.add(initial.center);
        mesh.position.copy(primaryPos);
        
        Object.keys(initial.others).forEach(objId => {
          const otherMesh = meshesRef.current[objId];
          const otherInitial = initial.others[objId];
          if (otherMesh && otherInitial) {
            const pos = otherInitial.position.clone().sub(initial.center);
            pos.applyQuaternion(deltaQuat);
            pos.add(initial.center);
            otherMesh.position.copy(pos);
            
            const otherInitialQuat = new THREE.Quaternion().setFromEuler(otherInitial.rotation);
            const newQuat = deltaQuat.clone().multiply(otherInitialQuat);
            otherMesh.quaternion.copy(newQuat);
          }
        });
        
        if (initial.descendants) {
          Object.keys(initial.descendants).forEach(descId => {
            const descMesh = meshesRef.current[descId];
            const descInitial = initial.descendants[descId];
            if (descMesh && descInitial) {
              const pos = descInitial.position.clone().sub(initial.center);
              pos.applyQuaternion(deltaQuat);
              pos.add(initial.center);
              descMesh.position.copy(pos);
              // 这我不炸了？
              
              const descInitialQuat = new THREE.Quaternion().setFromEuler(descInitial.rotation);
              const newQuat = deltaQuat.clone().multiply(descInitialQuat);
              descMesh.quaternion.copy(newQuat);
            }
          });
        }
      } else if (mode === 'scale' && initial.primary && initial.center) {
        if (uniformScaleRef.current) {
          const avgScale = (mesh.scale.x + mesh.scale.y + mesh.scale.z) / 3;
          mesh.scale.set(avgScale, avgScale, avgScale);
        }
        
        const rawScaleRatio = new THREE.Vector3(
          mesh.scale.x / initial.primary.scale.x,
          mesh.scale.y / initial.primary.scale.y,
          mesh.scale.z / initial.primary.scale.z
        );
        
        const scaleRatio = new THREE.Vector3(1, 1, 1);
        const threshold = 0.001;
        
        if (Math.abs(rawScaleRatio.x - 1) > threshold) scaleRatio.x = rawScaleRatio.x;
        if (Math.abs(rawScaleRatio.y - 1) > threshold) scaleRatio.y = rawScaleRatio.y;
        if (Math.abs(rawScaleRatio.z - 1) > threshold) scaleRatio.z = rawScaleRatio.z;
        
        const primaryPos = initial.primary.position.clone().sub(initial.center);
        primaryPos.multiply(scaleRatio);
        primaryPos.add(initial.center);
        mesh.position.copy(primaryPos);
        
        Object.keys(initial.others).forEach(objId => {
          const otherMesh = meshesRef.current[objId];
          const otherInitial = initial.others[objId];
          if (otherMesh && otherInitial) {
            const pos = otherInitial.position.clone().sub(initial.center);
            pos.multiply(scaleRatio);
            pos.add(initial.center);
            otherMesh.position.copy(pos);
            
            otherMesh.scale.set(
              otherInitial.scale.x * scaleRatio.x,
              otherInitial.scale.y * scaleRatio.y,
              otherInitial.scale.z * scaleRatio.z
            );
          }
        });
        
        if (initial.descendants) {
          Object.keys(initial.descendants).forEach(descId => {
            const descMesh = meshesRef.current[descId];
            const descInitial = initial.descendants[descId];
            if (descMesh && descInitial) {
              const pos = descInitial.position.clone().sub(initial.center);
              pos.multiply(scaleRatio);
              pos.add(initial.center);
              descMesh.position.copy(pos);
              
              descMesh.scale.set(
                descInitial.scale.x * scaleRatio.x,
                descInitial.scale.y * scaleRatio.y,
                descInitial.scale.z * scaleRatio.z
              );
            }
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

    const existingIds = new Set(Object.keys(meshesRef.current));
    const newIds = new Set(objects.map(obj => obj.id));

    existingIds.forEach(id => {
      if (!newIds.has(parseInt(id))) {
        const mesh = meshesRef.current[id];
        if (mesh) {
          sceneRef.current.remove(mesh);
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
            const center = asset.center || new THREE.Vector3(0, 0, 0);
            modelContent.position.sub(center);
            
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
                mesh.material.map = textureAsset.texture;
                mesh.material.needsUpdate = true;
              } else {
                mesh.material.map = null;
                mesh.material.needsUpdate = true;
              }
            } else if (mesh.material.map) {
              mesh.material.map = null;
              mesh.material.needsUpdate = true;
            }
          } else if (mesh.material && mesh.material.color) {
            mesh.material.color.setStyle(obj.color || '#4a90d9');
          }
        }
      } else {
        if (obj.isModel && obj.assetId) {
          const asset = assetsRef.current.find(a => a.id === obj.assetId);
          if (asset && asset.gltfScene) {
            const modelGroup = new THREE.Group();
            
            const modelContent = asset.gltfScene.clone();
            const center = asset.center || new THREE.Vector3(0, 0, 0);
            modelContent.position.sub(center);
            
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
            material = new THREE.MeshStandardMaterial({
              map: textureAsset.texture,
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
        const assetSize = mesh.userData.assetSize || new THREE.Vector3(1, 1, 1);
        
        const outline = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(assetSize.x, assetSize.y, assetSize.z)),
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
        transformControlsRef.current.attach(mesh);
      }
    } else {
      const center = new THREE.Vector3();
      objectsToHighlight.forEach(obj => {
        const mesh = meshesRef.current[obj.id];
        if (mesh) center.add(mesh.position);
      });
      center.divideScalar(objectsToHighlight.length);
      
      const primaryMesh = meshesRef.current[objectsToHighlight[0].id];
      if (primaryMesh && primaryMesh.parent === sceneRef.current) {
        const pivot = sceneRef.current.getObjectByName('multiSelectPivot');
        if (pivot) {
          pivot.position.copy(center);
          pivot.rotation.copy(primaryMesh.rotation);
          pivot.scale.copy(primaryMesh.scale);
          transformControlsRef.current.attach(pivot);
        }
      }
    }
  }, [selectedObject, selectedObjects, currentTool]);

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
    <div className="viewport-container" ref={containerRef}>
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
