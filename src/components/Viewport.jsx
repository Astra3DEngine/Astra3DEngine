/**
 * @file components/Viewport.jsx
 * @description 3D 视口组件：负责渲染场景、处理用户交互和变换控制。
 * three.js 逻辑已拆到 src/engine/（Scene 装配、材质、模型构建、光源、视图立方体、层级数学），
 * 本组件仅承担 React 适配与交互编排。
 * @module components/Viewport
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { msg } from '../i18n/index.js';
import DropdownMenu from './DropdownMenu.jsx';
import {
  ensureStandardMaterial,
  applyTextureToMaterial,
  cloneTexture,
  createPrimitiveMaterial,
} from '../engine/materials.js';
import {
  collectDescendantRelativeTransforms,
  applyTransformToDescendants,
  applyTransformToObject3D,
  extractTransformFromObject3D,
} from '../engine/TreeMath.js';
import { buildModelGroup, buildMeshPart, findMeshByPath } from '../engine/ModelLoader.js';
import {
  createLightFromObject,
  updateLightTargetFromObject,
  createDefaultDirectionalLight,
} from '../engine/lights.js';
import { ViewCube, animateCameraToDirection } from '../engine/ViewCube.js';

import IconSelect from '../assets/icons/tools/select.svg?react';
import IconMove from '../assets/icons/tools/move.svg?react';
import IconRotate from '../assets/icons/tools/rotate.svg?react';
import IconScale from '../assets/icons/tools/scale.svg?react';
import IconUniformScale from '../assets/icons/tools/uniform-scale.svg?react';

import IconMouseLeft from '../assets/icons/viewport/mouse-left.svg?react';
import IconMouseRight from '../assets/icons/viewport/mouse-right.svg?react';
import IconKeyShift from '../assets/icons/viewport/key-shift.svg?react';
import IconKeyW from '../assets/icons/viewport/key-w.svg?react';
import IconKeyA from '../assets/icons/viewport/key-a.svg?react';
import IconKeyS from '../assets/icons/viewport/key-s.svg?react';
import IconKeyD from '../assets/icons/viewport/key-d.svg?react';
import IconKeyQ from '../assets/icons/viewport/key-q.svg?react';
import IconKeyE from '../assets/icons/viewport/key-e.svg?react';
import IconSun from '../assets/icons/viewport/sun.svg?react';
import IconSunOff from '../assets/icons/viewport/sun-off.svg?react';
import { tip } from '../lib/tooltip.js';

/** cube 的六个面，顺序与 BoxGeometry 材质数组一致 */
const CUBE_FACE_NAMES = ['right', 'left', 'top', 'bottom', 'front', 'back'];

/** 兼容旧项目缺少 faceTextures 字段的情况 */
const FALLBACK_FACE_TEXTURES = () => ({
  right: null,
  left: null,
  top: null,
  bottom: null,
  front: null,
  back: null,
});

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
  onLightRenderingChange,
  sceneSettings,
}) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const orthographicCameraRef = useRef(null);
  const transformControlsRef = useRef(null);
  const orbitControlsRef = useRef(null);
  const meshesRef = useRef({});
  const animationRef = useRef(null);
  const objectsRef = useRef(objects);
  const selectedObjectRef = useRef(selectedObject);
  const selectedObjectsRef = useRef(selectedObjects);
  const assetsRef = useRef(assets || []);
  const onRecordHistoryRef = useRef(onRecordHistory);
  const viewCubeRef = useRef(null);
  const viewCubeElRef = useRef(null);
  const ambientLightRef = useRef(null);
  const defaultLightRef = useRef(null);
  const [uniformScale, setUniformScale] = useState(false);
  const uniformScaleRef = useRef(false);
  const [cameraType, setCameraType] = useState(() => initialCameraType || 'perspective');
  const cameraTypeRef = useRef(initialCameraType || 'perspective');
  const [isFPSMode, setIsFPSMode] = useState(false);
  const initialTransformsRef = useRef({});
  const hasDraggedRef = useRef(false);
  const lightRenderingEnabledRef = useRef(lightRenderingEnabled);

  /**
   * 获取 mesh 的几何中心（世界坐标）。
   * model(Group) 用 Box3 计算边界盒中心，普通 mesh 用 geometry 包围盒。
   */
  const getMeshGeometryCenterWorld = useCallback((mesh) => {
    if (mesh.userData.isModel) {
      const box = new THREE.Box3().setFromObject(mesh);
      const center = new THREE.Vector3();
      if (box.isEmpty()) {
        center.copy(mesh.position);
      } else {
        box.getCenter(center);
      }
      return center;
    }
    if (mesh.userData.isLight) {
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

  /** 计算多个 mesh 的几何中心（世界坐标） */
  const calculateSelectionsCenter = useCallback(
    (meshes) => {
      const center = new THREE.Vector3();
      if (meshes.length === 0) return center;
      meshes.forEach((m) => {
        center.add(getMeshGeometryCenterWorld(m));
      });
      center.divideScalar(meshes.length);
      return center;
    },
    [getMeshGeometryCenterWorld]
  );

  // 统一的相机类型切换（同时通知上层，修复四视图不同步问题）
  const handleSetCameraType = useCallback(
    (type) => {
      setCameraType(type);
      onCameraTypeChange?.(type);
    },
    [onCameraTypeChange]
  );

  // ===== ref 同步 =====
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

  // 场景设置：背景色 / 环境光 / 雾
  useEffect(() => {
    if (!sceneRef.current || !ambientLightRef.current) return;

    if (sceneSettings?.backgroundColor) {
      sceneRef.current.background = new THREE.Color(sceneSettings.backgroundColor);
    }
    if (sceneSettings?.ambientLight) {
      if (sceneSettings.ambientLight.color) {
        ambientLightRef.current.color = new THREE.Color(sceneSettings.ambientLight.color);
      }
      if (sceneSettings.ambientLight.intensity !== undefined) {
        ambientLightRef.current.intensity = sceneSettings.ambientLight.intensity;
      }
    }
    if (sceneSettings?.fog?.enabled) {
      sceneRef.current.fog = new THREE.Fog(
        sceneSettings.fog.color || '#ffffff',
        sceneSettings.fog.near || 1,
        sceneSettings.fog.far || 1000
      );
    } else {
      sceneRef.current.fog = null;
    }
  }, [sceneSettings]);

  // 光渲染开关：启用/禁用阴影与光源强度
  useEffect(() => {
    if (!sceneRef.current || !ambientLightRef.current) return;

    const hasUserLights = objectsRef.current.some((obj) => obj.isLight);

    if (lightRenderingEnabled) {
      ambientLightRef.current.intensity = 0.3;
      sceneRef.current.traverse((child) => {
        if (child.isLight && child.type !== 'AmbientLight') {
          if (child.userData.originalIntensity !== undefined) {
            child.intensity = child.userData.originalIntensity;
          }
          if (child.castShadow !== undefined) {
            child.castShadow = true;
          }
        }
      });
      if (defaultLightRef.current) {
        defaultLightRef.current.intensity = hasUserLights
          ? 0
          : defaultLightRef.current.userData.originalIntensity || 1.5;
        defaultLightRef.current.castShadow = true;
      }
    } else {
      ambientLightRef.current.intensity = 0.8;
      sceneRef.current.traverse((child) => {
        if (child.isLight && child.type !== 'AmbientLight') {
          if (child.userData.originalIntensity === undefined) {
            child.userData.originalIntensity = child.intensity;
          }
          child.intensity = 0;
          if (child.castShadow !== undefined) {
            child.castShadow = false;
          }
        }
      });
      if (defaultLightRef.current) {
        defaultLightRef.current.intensity = 0;
        defaultLightRef.current.castShadow = false;
      }
    }
    if (rendererRef.current) {
      rendererRef.current.shadowMap.enabled = true;
    }
  }, [lightRenderingEnabled]);

  // 主场景 / 相机 / 渲染器 / 轨道控制 / 变换控制 / 输入 / 动画循环
  useEffect(() => {
    if (!containerRef.current) return;

    let width = containerRef.current.clientWidth;
    let height = containerRef.current.clientHeight;
    if (width === 0 || height === 0) {
      width = 800;
      height = 600;
    }

    const scene = new THREE.Scene();
    const bgColor = sceneSettings?.backgroundColor || (theme === 'light' ? '#f0f0f0' : '#1a1a2e');
    scene.background = new THREE.Color(bgColor);
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
    renderer.shadowMap.enabled = lightRenderingEnabled;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0x666666);
    scene.add(gridHelper);
    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);

    const ambientColor = sceneSettings?.ambientLight?.color || '#ffffff';
    const ambientIntensity =
      sceneSettings?.ambientLight?.intensity || (lightRenderingEnabled ? 0.3 : 0.8);
    const ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const directionalLight = createDefaultDirectionalLight(1.5);
    directionalLight.castShadow = lightRenderingEnabled;
    if (!lightRenderingEnabled) {
      directionalLight.intensity = 0;
    }
    scene.add(directionalLight);
    defaultLightRef.current = directionalLight;

    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = false;
    orbitControls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: null,
    };
    orbitControlsRef.current = orbitControls;

    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.setSpace('world');
    scene.add(transformControls);
    transformControlsRef.current = transformControls;

    const pivotObject = new THREE.Object3D();
    pivotObject.name = 'multiSelectPivot';
    scene.add(pivotObject);

    const singleSelectPivot = new THREE.Object3D();
    singleSelectPivot.name = 'singleSelectPivot';
    scene.add(singleSelectPivot);

    let isTransformDragging = false;

    let isShiftPressed = false;
    let isRightMouseDown = false;
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
        isPanning = false;
        orbitControls.enabled = !isTransformDragging;
        renderer.domElement.style.cursor = 'default';
      }
      if (e.button === 2) {
        isRightMouseDown = false;
        setIsFPSMode(false);
        Object.keys(keysPressed).forEach((k) => {
          keysPressed[k] = false;
        });
        renderer.domElement.style.cursor = 'default';

        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        orbitControls.target
          .copy(camera.position)
          .add(forward.multiplyScalar(fpsInitialTargetDistance));
        orbitControls.enabled = !isTransformDragging;
        if (document.exitPointerLock) {
          document.exitPointerLock();
        }
      }
    };

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
        const currentPitch = Math.atan2(
          forward.y,
          Math.sqrt(forward.x * forward.x + forward.z * forward.z)
        );
        const newPitch = currentPitch - deltaY * fpsLookSpeed;
        if (newPitch > -Math.PI / 2 + 0.01 && newPitch < Math.PI / 2 - 0.01) {
          camera.quaternion.premultiply(pitchQuat);
        }

        const finalForward = new THREE.Vector3(0, 0, -1);
        finalForward.applyQuaternion(camera.quaternion);
        orbitControls.target
          .copy(camera.position)
          .add(finalForward.multiplyScalar(fpsInitialTargetDistance));
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

    // ===== 多选变换：拖拽开始记录初始状态 =====
    const handleDraggingChanged = (event) => {
      isTransformDragging = event.value;
      if (!isRightMouseDown) {
        orbitControls.enabled = !event.value;
      }

      if (event.value) {
        hasDraggedRef.current = true;
        onRecordHistoryRef.current?.();

        const attached = transformControls.object;
        const isPivotMode =
          attached &&
          (attached.name === 'multiSelectPivot' || attached.name === 'singleSelectPivot');
        const isSinglePivotMode = attached && attached.name === 'singleSelectPivot';

        if (isPivotMode) {
          const center = attached.position.clone();
          initialTransformsRef.current = {
            center: center.clone(),
            pivotPosition: attached.position.clone(),
            pivotRotation: attached.rotation.clone(),
            pivotScale: attached.scale.clone(),
            isSinglePivot: isSinglePivotMode,
            primaryId: isSinglePivotMode ? selectedObjectsRef.current[0]?.id : null,
            others: {},
          };

          selectedObjectsRef.current
            .filter((o) => o)
            .forEach((obj) => {
              const mesh = meshesRef.current[obj.id];
              if (mesh) {
                const worldGeoCenter = getMeshGeometryCenterWorld(mesh);
                const localGeoCenter = mesh.worldToLocal(worldGeoCenter.clone());
                initialTransformsRef.current.others[obj.id] = {
                  position: mesh.position.clone(),
                  rotation: mesh.rotation.clone(),
                  scale: mesh.scale.clone(),
                  geoCenterOffset: localGeoCenter,
                };
              } else if (obj.isFolder) {
                initialTransformsRef.current.others[obj.id] = {
                  position: new THREE.Vector3(obj.position[0], obj.position[1], obj.position[2]),
                  rotation: new THREE.Euler(
                    THREE.MathUtils.degToRad(obj.rotation[0]),
                    THREE.MathUtils.degToRad(obj.rotation[1]),
                    THREE.MathUtils.degToRad(obj.rotation[2])
                  ),
                  scale: new THREE.Vector3(obj.scale[0], obj.scale[1], obj.scale[2]),
                  geoCenterOffset: new THREE.Vector3(0, 0, 0),
                  isFolder: true,
                };
              }
            });

          if (isSinglePivotMode && selectedObjectsRef.current[0]) {
            const primaryId = selectedObjectsRef.current[0].id;
            initialTransformsRef.current.descendantRelativeTransforms =
              collectDescendantRelativeTransforms(primaryId, objectsRef.current, meshesRef.current);
          }
        } else if (attached && attached.userData?.id) {
          const allMeshes = [attached];
          const others = selectedObjectsRef.current.filter(
            (o) => o && o.id !== attached.userData.id
          );
          others.forEach((obj) => {
            const otherMesh = meshesRef.current[obj.id];
            if (otherMesh) allMeshes.push(otherMesh);
          });

          const center = calculateSelectionsCenter(allMeshes);
          const descendantRelativeTransforms = collectDescendantRelativeTransforms(
            attached.userData.id,
            objectsRef.current,
            meshesRef.current
          );

          initialTransformsRef.current = {
            center: center.clone(),
            primary: {
              id: attached.userData.id,
              position: attached.position.clone(),
              rotation: attached.rotation.clone(),
              scale: attached.scale.clone(),
              geoCenterOffset: attached.worldToLocal(getMeshGeometryCenterWorld(attached).clone()),
            },
            others: {},
            descendantRelativeTransforms,
          };

          others.forEach((obj) => {
            const otherMesh = meshesRef.current[obj.id];
            if (otherMesh) {
              const worldGeoCenter = getMeshGeometryCenterWorld(otherMesh);
              const localGeoCenter = otherMesh.worldToLocal(worldGeoCenter.clone());
              initialTransformsRef.current.others[obj.id] = {
                position: otherMesh.position.clone(),
                rotation: otherMesh.rotation.clone(),
                scale: otherMesh.scale.clone(),
                geoCenterOffset: localGeoCenter,
              };
              const otherDescendantTransforms = collectDescendantRelativeTransforms(
                obj.id,
                objectsRef.current,
                meshesRef.current
              );
              otherDescendantTransforms.forEach((transform, id) => {
                descendantRelativeTransforms.set(id, transform);
              });
            }
          });
        } else {
          initialTransformsRef.current = {};
        }
      } else {
        const attached = transformControls.object;
        const isPivotMode =
          attached &&
          (attached.name === 'multiSelectPivot' || attached.name === 'singleSelectPivot');

        if (isPivotMode && initialTransformsRef.current.pivotPosition) {
          selectedObjectsRef.current
            .filter((o) => o)
            .forEach((obj) => {
              const mesh = meshesRef.current[obj.id];
              if (mesh) {
                onUpdateObject(obj.id, extractTransformFromObject3D(mesh), false);
              } else if (obj.isFolder) {
                const initial = initialTransformsRef.current;
                const folderInitial = initial.others[obj.id];
                const mode = transformControls.getMode();
                if (!folderInitial) return;

                let newPos, newRotation, newScale;

                if (mode === 'translate') {
                  const deltaPos = attached.position.clone().sub(initial.pivotPosition);
                  newPos = [
                    folderInitial.position.x + deltaPos.x,
                    folderInitial.position.y + deltaPos.y,
                    folderInitial.position.z + deltaPos.z,
                  ];
                  newRotation = extractTransformFromObject3D(folderInitial).rotation;
                  newScale = [folderInitial.scale.x, folderInitial.scale.y, folderInitial.scale.z];
                } else if (mode === 'rotate' && initial.center) {
                  const deltaQuat = new THREE.Quaternion();
                  const initialQuat = new THREE.Quaternion().setFromEuler(initial.pivotRotation);
                  const currentQuat = new THREE.Quaternion().setFromEuler(attached.rotation);
                  deltaQuat.multiplyQuaternions(currentQuat, initialQuat.clone().invert());

                  const rotatedPos = folderInitial.position
                    .clone()
                    .sub(initial.center)
                    .applyQuaternion(deltaQuat)
                    .add(initial.center);
                  newPos = [rotatedPos.x, rotatedPos.y, rotatedPos.z];

                  const newQuat = deltaQuat
                    .clone()
                    .multiply(new THREE.Quaternion().setFromEuler(folderInitial.rotation));
                  const newEuler = new THREE.Euler().setFromQuaternion(newQuat);
                  newRotation = [
                    THREE.MathUtils.radToDeg(newEuler.x),
                    THREE.MathUtils.radToDeg(newEuler.y),
                    THREE.MathUtils.radToDeg(newEuler.z),
                  ];
                  newScale = [folderInitial.scale.x, folderInitial.scale.y, folderInitial.scale.z];
                } else if (mode === 'scale' && initial.center) {
                  let scaleRatio;
                  if (uniformScaleRef.current) {
                    const avgScale = (attached.scale.x + attached.scale.y + attached.scale.z) / 3;
                    const avgInitial =
                      (initial.pivotScale.x + initial.pivotScale.y + initial.pivotScale.z) / 3;
                    const ratio = avgScale / avgInitial;
                    scaleRatio = new THREE.Vector3(ratio, ratio, ratio);
                  } else {
                    scaleRatio = new THREE.Vector3(
                      attached.scale.x / initial.pivotScale.x,
                      attached.scale.y / initial.pivotScale.y,
                      attached.scale.z / initial.pivotScale.z
                    );
                  }
                  const newFolderPos = initial.center
                    .clone()
                    .add(folderInitial.position.clone().sub(initial.center).multiply(scaleRatio));
                  newPos = [newFolderPos.x, newFolderPos.y, newFolderPos.z];
                  newRotation = [
                    THREE.MathUtils.radToDeg(folderInitial.rotation.x),
                    THREE.MathUtils.radToDeg(folderInitial.rotation.y),
                    THREE.MathUtils.radToDeg(folderInitial.rotation.z),
                  ];
                  newScale = [
                    folderInitial.scale.x * scaleRatio.x,
                    folderInitial.scale.y * scaleRatio.y,
                    folderInitial.scale.z * scaleRatio.z,
                  ];
                } else {
                  const deltaPos = attached.position.clone().sub(initial.pivotPosition);
                  newPos = [
                    folderInitial.position.x + deltaPos.x,
                    folderInitial.position.y + deltaPos.y,
                    folderInitial.position.z + deltaPos.z,
                  ];
                  newRotation = extractTransformFromObject3D(folderInitial).rotation;
                  newScale = [folderInitial.scale.x, folderInitial.scale.y, folderInitial.scale.z];
                }

                onUpdateObject(
                  obj.id,
                  { position: newPos, rotation: newRotation, scale: newScale },
                  false
                );
              }
            });

          if (
            initialTransformsRef.current.isSinglePivot &&
            initialTransformsRef.current.descendantRelativeTransforms
          ) {
            initialTransformsRef.current.descendantRelativeTransforms.forEach((_, descId) => {
              const descMesh = meshesRef.current[descId];
              if (descMesh) {
                onUpdateObject(descId, extractTransformFromObject3D(descMesh), false);
              }
            });
          }
        } else if (attached && attached.userData?.id && initialTransformsRef.current.primary) {
          const currentId = attached.userData.id;
          onUpdateObject(currentId, extractTransformFromObject3D(attached), false);

          const others = selectedObjectsRef.current.filter((o) => o && o.id !== currentId);
          others.forEach((obj) => {
            const otherMesh = meshesRef.current[obj.id];
            if (otherMesh) {
              onUpdateObject(obj.id, extractTransformFromObject3D(otherMesh), false);
            }
          });

          if (initialTransformsRef.current.descendantRelativeTransforms) {
            initialTransformsRef.current.descendantRelativeTransforms.forEach((_, descId) => {
              const descMesh = meshesRef.current[descId];
              if (descMesh) {
                onUpdateObject(descId, extractTransformFromObject3D(descMesh), false);
              }
            });
          }
        }
      }
    };
    transformControls.addEventListener('dragging-changed', handleDraggingChanged);

    // 变换实时同步（拖拽过程）
    const handleTransformChange = () => {
      if (!isTransformDragging) return;

      const attached = transformControls.object;
      if (!attached) return;

      const isPivotMode =
        attached.name === 'multiSelectPivot' || attached.name === 'singleSelectPivot';
      const mode = transformControls.getMode();
      const initial = initialTransformsRef.current;
      const objects = objectsRef.current;
      const meshes = meshesRef.current;

      if (isPivotMode && initial.pivotPosition) {
        if (mode === 'translate') {
          const deltaPos = attached.position.clone().sub(initial.pivotPosition);
          Object.keys(initial.others).forEach((objId) => {
            const mesh = meshes[objId];
            const meshInitial = initial.others[objId];
            if (mesh && meshInitial) {
              mesh.position.copy(meshInitial.position).add(deltaPos);
            }
          });
          if (initial.isSinglePivot && initial.descendantRelativeTransforms && initial.primaryId) {
            applyTransformToDescendants(
              initial.primaryId,
              initial.descendantRelativeTransforms,
              objects,
              meshes
            );
          }
        } else if (mode === 'rotate' && initial.center) {
          const deltaQuat = new THREE.Quaternion();
          const initialQuat = new THREE.Quaternion().setFromEuler(initial.pivotRotation);
          const currentQuat = new THREE.Quaternion().setFromEuler(attached.rotation);
          deltaQuat.multiplyQuaternions(currentQuat, initialQuat.clone().invert());

          Object.keys(initial.others).forEach((objId) => {
            const mesh = meshes[objId];
            const meshInitial = initial.others[objId];
            if (mesh && meshInitial) {
              const geoCenterOffset = meshInitial.geoCenterOffset || new THREE.Vector3();
              const worldGeoCenterOffset = geoCenterOffset
                .clone()
                .multiply(meshInitial.scale)
                .applyEuler(meshInitial.rotation);
              const geoCenter = meshInitial.position.clone().add(worldGeoCenterOffset);
              const rotatedGeoCenter = geoCenter
                .clone()
                .sub(initial.center)
                .applyQuaternion(deltaQuat)
                .add(initial.center);

              const meshInitialQuat = new THREE.Quaternion().setFromEuler(meshInitial.rotation);
              const newQuat = deltaQuat.clone().multiply(meshInitialQuat);
              const newWorldGeoCenterOffset = geoCenterOffset
                .clone()
                .multiply(meshInitial.scale)
                .applyQuaternion(newQuat);
              mesh.position.copy(rotatedGeoCenter).sub(newWorldGeoCenterOffset);
              mesh.quaternion.copy(newQuat);
            }
          });

          if (initial.isSinglePivot && initial.descendantRelativeTransforms && initial.primaryId) {
            applyTransformToDescendants(
              initial.primaryId,
              initial.descendantRelativeTransforms,
              objects,
              meshes
            );
          }
        } else if (mode === 'scale' && initial.center) {
          let scaleRatio;
          if (uniformScaleRef.current) {
            const avgScale = (attached.scale.x + attached.scale.y + attached.scale.z) / 3;
            const avgInitial =
              (initial.pivotScale.x + initial.pivotScale.y + initial.pivotScale.z) / 3;
            const ratio = avgScale / avgInitial;
            scaleRatio = new THREE.Vector3(ratio, ratio, ratio);
          } else {
            scaleRatio = new THREE.Vector3(
              attached.scale.x / initial.pivotScale.x,
              attached.scale.y / initial.pivotScale.y,
              attached.scale.z / initial.pivotScale.z
            );
          }

          Object.keys(initial.others).forEach((objId) => {
            const mesh = meshes[objId];
            const meshInitial = initial.others[objId];
            if (mesh && meshInitial) {
              const geoCenterOffset = meshInitial.geoCenterOffset || new THREE.Vector3();
              const worldGeoCenterOffset = geoCenterOffset
                .clone()
                .multiply(meshInitial.scale)
                .applyEuler(meshInitial.rotation);
              const geoCenter = meshInitial.position.clone().add(worldGeoCenterOffset);
              const offset = geoCenter.clone().sub(initial.center).multiply(scaleRatio);
              const newGeoCenter = initial.center.clone().add(offset);

              const newScale = new THREE.Vector3(
                meshInitial.scale.x * scaleRatio.x,
                meshInitial.scale.y * scaleRatio.y,
                meshInitial.scale.z * scaleRatio.z
              );
              const newWorldGeoCenterOffset = geoCenterOffset
                .clone()
                .multiply(newScale)
                .applyEuler(meshInitial.rotation);
              mesh.position.copy(newGeoCenter).sub(newWorldGeoCenterOffset);
              mesh.scale.copy(newScale);
            }
          });

          if (initial.isSinglePivot && initial.descendantRelativeTransforms && initial.primaryId) {
            applyTransformToDescendants(
              initial.primaryId,
              initial.descendantRelativeTransforms,
              objects,
              meshes
            );
          }
        }
        return;
      }

      if (!attached.userData?.id) return;

      const currentId = attached.userData.id;
      const current = objects.find((obj) => obj.id === currentId);
      if (!current) return;
      const mesh = attached;

      const applyDescendantsIfNeeded = () => {
        if (!initial.descendantRelativeTransforms) return;
        applyTransformToDescendants(
          currentId,
          initial.descendantRelativeTransforms,
          objects,
          meshes
        );
        Object.keys(initial.others).forEach((objId) => {
          applyTransformToDescendants(
            parseInt(objId),
            initial.descendantRelativeTransforms,
            objects,
            meshes
          );
        });
      };

      if (mode === 'translate' && initial.primary) {
        const deltaPos = mesh.position.clone().sub(initial.primary.position);
        Object.keys(initial.others).forEach((objId) => {
          const otherMesh = meshes[objId];
          const otherInitial = initial.others[objId];
          if (otherMesh && otherInitial) {
            otherMesh.position.copy(otherInitial.position).add(deltaPos);
          }
        });
        applyDescendantsIfNeeded();
      } else if (mode === 'rotate' && initial.primary && initial.center) {
        const deltaQuat = new THREE.Quaternion();
        const initialQuat = new THREE.Quaternion().setFromEuler(initial.primary.rotation);
        const currentQuat = new THREE.Quaternion().setFromEuler(mesh.rotation);
        deltaQuat.multiplyQuaternions(currentQuat, initialQuat.clone().invert());

        const primaryGeoCenterOffset = initial.primary.geoCenterOffset || new THREE.Vector3();
        const primaryWorldGeoCenterOffset = primaryGeoCenterOffset
          .clone()
          .multiply(initial.primary.scale)
          .applyEuler(initial.primary.rotation);
        const primaryGeoCenter = initial.primary.position.clone().add(primaryWorldGeoCenterOffset);
        const rotatedPrimaryGeoCenter = primaryGeoCenter
          .clone()
          .sub(initial.center)
          .applyQuaternion(deltaQuat)
          .add(initial.center);

        const newPrimaryWorldGeoCenterOffset = primaryGeoCenterOffset
          .clone()
          .multiply(initial.primary.scale)
          .applyQuaternion(currentQuat);
        mesh.position.copy(rotatedPrimaryGeoCenter).sub(newPrimaryWorldGeoCenterOffset);

        Object.keys(initial.others).forEach((objId) => {
          const otherMesh = meshes[objId];
          const otherInitial = initial.others[objId];
          if (otherMesh && otherInitial) {
            const geoCenterOffset = otherInitial.geoCenterOffset || new THREE.Vector3();
            const worldGeoCenterOffset = geoCenterOffset
              .clone()
              .multiply(otherInitial.scale)
              .applyEuler(otherInitial.rotation);
            const geoCenter = otherInitial.position.clone().add(worldGeoCenterOffset);
            const rotatedGeoCenter = geoCenter
              .clone()
              .sub(initial.center)
              .applyQuaternion(deltaQuat)
              .add(initial.center);

            const otherInitialQuat = new THREE.Quaternion().setFromEuler(otherInitial.rotation);
            const newQuat = deltaQuat.clone().multiply(otherInitialQuat);
            const newOtherWorldGeoCenterOffset = geoCenterOffset
              .clone()
              .multiply(otherInitial.scale)
              .applyQuaternion(newQuat);
            otherMesh.position.copy(rotatedGeoCenter).sub(newOtherWorldGeoCenterOffset);
            otherMesh.quaternion.copy(newQuat);
          }
        });
        applyDescendantsIfNeeded();
      } else if (mode === 'scale' && initial.primary && initial.center) {
        let scaleRatio;
        if (uniformScaleRef.current) {
          const avgScale = (mesh.scale.x + mesh.scale.y + mesh.scale.z) / 3;
          const avgInitial =
            (initial.primary.scale.x + initial.primary.scale.y + initial.primary.scale.z) / 3;
          const ratio = avgScale / avgInitial;
          scaleRatio = new THREE.Vector3(ratio, ratio, ratio);
          mesh.scale.set(avgScale, avgScale, avgScale);
        } else {
          scaleRatio = new THREE.Vector3(
            mesh.scale.x / initial.primary.scale.x,
            mesh.scale.y / initial.primary.scale.y,
            mesh.scale.z / initial.primary.scale.z
          );
        }

        const primaryGeoCenterOffset = initial.primary.geoCenterOffset || new THREE.Vector3();
        const primaryWorldGeoCenterOffset = primaryGeoCenterOffset
          .clone()
          .multiply(initial.primary.scale)
          .applyEuler(initial.primary.rotation);
        const primaryGeoCenter = initial.primary.position.clone().add(primaryWorldGeoCenterOffset);
        const primaryOffset = primaryGeoCenter.clone().sub(initial.center).multiply(scaleRatio);
        const newPrimaryGeoCenter = initial.center.clone().add(primaryOffset);

        const newPrimaryScale = new THREE.Vector3(
          initial.primary.scale.x * scaleRatio.x,
          initial.primary.scale.y * scaleRatio.y,
          initial.primary.scale.z * scaleRatio.z
        );
        const newPrimaryWorldGeoCenterOffset = primaryGeoCenterOffset
          .clone()
          .multiply(newPrimaryScale)
          .applyEuler(initial.primary.rotation);
        mesh.position.copy(newPrimaryGeoCenter).sub(newPrimaryWorldGeoCenterOffset);

        Object.keys(initial.others).forEach((objId) => {
          const otherMesh = meshes[objId];
          const otherInitial = initial.others[objId];
          if (otherMesh && otherInitial) {
            const geoCenterOffset = otherInitial.geoCenterOffset || new THREE.Vector3();
            const worldGeoCenterOffset = geoCenterOffset
              .clone()
              .multiply(otherInitial.scale)
              .applyEuler(otherInitial.rotation);
            const geoCenter = otherInitial.position.clone().add(worldGeoCenterOffset);
            const offset = geoCenter.clone().sub(initial.center).multiply(scaleRatio);
            const newGeoCenter = initial.center.clone().add(offset);

            const newOtherScale = new THREE.Vector3(
              otherInitial.scale.x * scaleRatio.x,
              otherInitial.scale.y * scaleRatio.y,
              otherInitial.scale.z * scaleRatio.z
            );
            const newOtherWorldGeoCenterOffset = geoCenterOffset
              .clone()
              .multiply(newOtherScale)
              .applyEuler(otherInitial.rotation);
            otherMesh.position.copy(newGeoCenter).sub(newOtherWorldGeoCenterOffset);
            otherMesh.scale.copy(newOtherScale);
          }
        });
        applyDescendantsIfNeeded();
      }
    };
    transformControls.addEventListener('change', handleTransformChange);

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

        if (keysPressed.w) camera.position.addScaledVector(direction, fpsMoveSpeed);
        if (keysPressed.s) camera.position.addScaledVector(direction, -fpsMoveSpeed);
        if (keysPressed.a) camera.position.addScaledVector(right, -fpsMoveSpeed);
        if (keysPressed.d) camera.position.addScaledVector(right, fpsMoveSpeed);
        if (keysPressed.q) camera.position.y -= fpsMoveSpeed;
        if (keysPressed.e) camera.position.y += fpsMoveSpeed;

        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        orbitControls.target
          .copy(camera.position)
          .add(forward.multiplyScalar(fpsInitialTargetDistance));
      }

      orbitControls.update();

      orthographicCamera.position.copy(camera.position);
      orthographicCamera.quaternion.copy(camera.quaternion);

      const distance = camera.position.length();
      const frustumSize = distance * 0.8;
      const aspect = renderer.domElement.width / renderer.domElement.height;
      orthographicCamera.left = (-frustumSize * aspect) / 2;
      orthographicCamera.right = (frustumSize * aspect) / 2;
      orthographicCamera.top = frustumSize / 2;
      orthographicCamera.bottom = -frustumSize / 2;
      orthographicCamera.updateProjectionMatrix();

      const activeCamera = cameraTypeRef.current === 'orthographic' ? orthographicCamera : camera;
      if (transformControlsRef.current) {
        transformControlsRef.current.camera = activeCamera;
      }

      renderer.render(scene, activeCamera);

      viewCubeRef.current?.render(cameraTypeRef.current === 'orthographic');
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
      transformControls.removeEventListener('dragging-changed', handleDraggingChanged);
      transformControls.removeEventListener('change', handleTransformChange);
      if (transformControlsRef.current) {
        transformControlsRef.current.dispose();
      }
      if (orbitControlsRef.current) {
        orbitControlsRef.current.dispose();
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      viewCubeRef.current?.dispose();
      viewCubeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once, deps intentionally stable
  }, []);

  // 视图立方体
  useEffect(() => {
    if (!viewCubeElRef.current) return;

    const viewCube = new ViewCube(viewCubeElRef.current, {
      getActiveCamera: () =>
        cameraTypeRef.current === 'orthographic'
          ? orthographicCameraRef.current
          : cameraRef.current,
      isOrthographic: () => cameraTypeRef.current === 'orthographic',
      getOrbitTarget: () => orbitControlsRef.current?.target.clone() || new THREE.Vector3(0, 0, 0),
      onFaceClick: (direction) => {
        animateCameraToDirection(
          cameraRef.current,
          orbitControlsRef.current?.target.clone() || new THREE.Vector3(0, 0, 0),
          direction,
          () => orbitControlsRef.current?.update()
        );
      },
    });
    viewCubeRef.current = viewCube;

    return () => {
      viewCubeRef.current = null;
    };
  }, []);

  // 主题背景色
  useEffect(() => {
    if (!sceneRef.current || !sceneSettings?.backgroundColor) {
      sceneRef.current.background = new THREE.Color(theme === 'light' ? '#f0f0f0' : '#1a1a2e');
    }
  }, [theme, sceneSettings]);

  // 工具切换：select/move 均对应平移控制，顺序与 TransformControls 支持的 mode 对齐
  useEffect(() => {
    if (!transformControlsRef.current) return;
    const tc = transformControlsRef.current;
    const mode = currentTool === 'move' || currentTool === 'select' ? 'translate' : currentTool;
    tc.setMode(mode);
    tc.showX = tc.showY = tc.showZ = currentTool !== 'select';
  }, [currentTool]);

  // 对象同步：创建 / 更新 / 移除场景对象
  useEffect(() => {
    if (!sceneRef.current) return;

    const hasUserLights = objects.some((obj) => obj.isLight);
    if (defaultLightRef.current) {
      defaultLightRef.current.intensity = hasUserLights ? 0 : 0.2;
      defaultLightRef.current.castShadow = hasUserLights ? false : lightRenderingEnabled;
    }

    const existingIds = new Set(Object.keys(meshesRef.current));
    const newIds = new Set(objects.map((obj) => obj.id));

    // 移除已不存在的对象
    existingIds.forEach((id) => {
      if (!newIds.has(parseInt(id))) {
        const mesh = meshesRef.current[id];
        if (mesh) {
          sceneRef.current.remove(mesh);
          if (mesh.userData.isLight && mesh.target) {
            sceneRef.current.remove(mesh.target);
          }
          if (mesh.geometry) {
            mesh.geometry.dispose();
          }
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else {
              mesh.material.dispose();
            }
          }
          mesh.traverse((child) => {
            if (child !== mesh && child.geometry) child.geometry.dispose();
          });
          delete meshesRef.current[id];
        }
      }
    });

    objects.forEach((obj) => {
      const existingMesh = meshesRef.current[obj.id];

      if (existingMesh) {
        const mesh = existingMesh;

        // model 未加载内容时补充重建（资产已就绪但 Group 为空）
        if (obj.isModel && mesh.userData.isModel && mesh.children.length === 0) {
          const asset = assetsRef.current.find((a) => a.id === obj.assetId);
          if (asset && asset.gltfScene) {
            sceneRef.current.remove(mesh);
            const modelGroup = buildModelGroup(asset, { ...obj, assets: assetsRef.current });
            sceneRef.current.add(modelGroup);
            meshesRef.current[obj.id] = modelGroup;
            return;
          }
        }

        applyTransformToObject3D(mesh, obj);

        if (obj.type === 'cube') {
          const faceTextures = obj.faceTextures || FALLBACK_FACE_TEXTURES();
          if (Array.isArray(mesh.material)) {
            CUBE_FACE_NAMES.forEach((faceName, index) => {
              const textureId = faceTextures[faceName];
              const textureAsset = textureId
                ? assetsRef.current.find((a) => a.id === textureId)
                : null;
              mesh.material[index].color.setStyle(obj.color || '#4a90d9');
              mesh.material[index].map = textureAsset?.texture || null;
              mesh.material[index].needsUpdate = true;
            });
          }
        } else if (obj.type === 'sphere' || obj.type === 'plane') {
          if (mesh.material) {
            mesh.material.color.setStyle(obj.color || '#4a90d9');
            if (obj.textureId) {
              const textureAsset = assetsRef.current.find((a) => a.id === obj.textureId);
              if (textureAsset && textureAsset.texture) {
                const texture = cloneTexture(textureAsset.texture, obj.uvScale, obj.uvOffset);
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
          }
        } else if (obj.isModel && mesh.userData.isModel) {
          if (obj.textureId) {
            const textureAsset = assetsRef.current.find((a) => a.id === obj.textureId);
            if (textureAsset && textureAsset.texture) {
              const texture = cloneTexture(textureAsset.texture, obj.uvScale, obj.uvOffset);
              mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                  // 模型材质使用 specular 推导的转换，兼容原始行为
                  child.material = ensureStandardMaterial(child.material, true);
                  child.material.map = texture;
                  child.material.needsUpdate = true;
                }
              });
            }
          } else {
            mesh.traverse((child) => {
              if (child.isMesh && child.material) {
                child.material.map = null;
                child.material.needsUpdate = true;
              }
            });
          }
        } else if (obj.type === 'mesh' && mesh.userData.isMeshPart) {
          if (obj.textureId) {
            const textureAsset = assetsRef.current.find((a) => a.id === obj.textureId);
            if (textureAsset && textureAsset.texture) {
              const texture = cloneTexture(textureAsset.texture, obj.uvScale, obj.uvOffset);
              mesh.material = applyTextureToMaterial(mesh.material, texture);
            }
          } else {
            // 清除贴图，恢复原始材质
            const asset = assetsRef.current.find((a) => a.id === obj.assetId);
            if (asset && asset.gltfScene) {
              const targetMesh = findMeshByPath(asset.gltfScene, obj.meshPath);
              if (targetMesh) {
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
          if (obj.lightType === 'directional' || obj.lightType === 'spot') {
            updateLightTargetFromObject(mesh, obj);
          }
          if (mesh.userData.visualMesh) {
            mesh.userData.visualMesh.traverse((child) => {
              if (child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach((m) => {
                  if (m.color) m.color.setStyle(obj.color || '#ffffff');
                });
              }
            });
            if (obj.lightType === 'spot') {
              const coneLength = 0.6;
              const coneRadius = coneLength * Math.tan(obj.angle || Math.PI / 4);
              mesh.userData.visualMesh.children.forEach((child) => {
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
        return;
      }

      // ===== 新对象创建 =====

      if (obj.isFolder) {
        return;
      }

      if (obj.type === 'mesh' && obj.assetId && obj.meshPath) {
        const asset = assetsRef.current.find((a) => a.id === obj.assetId);
        if (asset && asset.gltfScene) {
          const mesh = buildMeshPart(asset, { ...obj, assets: assetsRef.current });
          if (mesh) {
            sceneRef.current.add(mesh);
            meshesRef.current[obj.id] = mesh;
          }
        }
        return;
      }

      if (obj.isModel && obj.assetId) {
        const asset = assetsRef.current.find((a) => a.id === obj.assetId);
        if (asset && asset.gltfScene) {
          const modelGroup = buildModelGroup(asset, { ...obj, assets: assetsRef.current });
          sceneRef.current.add(modelGroup);
          meshesRef.current[obj.id] = modelGroup;
        }
        return;
      }

      if (obj.isLight) {
        const light = createLightFromObject(obj);
        if (light) {
          if (!lightRenderingEnabledRef.current) {
            light.userData.originalIntensity = light.intensity;
            light.intensity = 0;
            light.castShadow = false;
          }
          sceneRef.current.add(light);
          if (light.userData.visualMesh) {
            light.add(light.userData.visualMesh);
          }
          meshesRef.current[obj.id] = light;
        }
        return;
      }

      // 基础图元
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
      if (obj.type === 'cube') {
        const faceTextures = obj.faceTextures || FALLBACK_FACE_TEXTURES();
        material = CUBE_FACE_NAMES.map((faceName) => {
          const textureId = faceTextures[faceName];
          const textureAsset = textureId ? assetsRef.current.find((a) => a.id === textureId) : null;
          if (textureAsset && textureAsset.texture) {
            return new THREE.MeshStandardMaterial({
              map: textureAsset.texture,
              color: obj.color || 0x4a90d9,
              metalness: 0.3,
              roughness: 0.7,
            });
          }
          return createPrimitiveMaterial(obj.color);
        });
      } else if ((obj.type === 'sphere' || obj.type === 'plane') && obj.textureId) {
        const textureAsset = assetsRef.current.find((a) => a.id === obj.textureId);
        if (textureAsset && textureAsset.texture) {
          const texture = cloneTexture(textureAsset.texture, obj.uvScale, obj.uvOffset);
          material = new THREE.MeshStandardMaterial({
            map: texture,
            color: obj.color || 0x4a90d9,
            metalness: 0.3,
            roughness: 0.7,
          });
        } else {
          material = createPrimitiveMaterial(obj.color);
        }
      } else {
        material = createPrimitiveMaterial(obj.color);
      }

      const mesh = new THREE.Mesh(geometry, material);
      applyTransformToObject3D(mesh, obj);
      mesh.userData = { id: obj.id };
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      sceneRef.current.add(mesh);
      meshesRef.current[obj.id] = mesh;
    });
  }, [objects, assets, lightRenderingEnabled]);

  // 选中高亮 + 变换轴心
  useEffect(() => {
    if (!transformControlsRef.current || !sceneRef.current) return;

    Object.values(meshesRef.current).forEach((mesh) => {
      if (mesh.userData.outline) {
        mesh.remove(mesh.userData.outline);
        mesh.userData.outline.geometry.dispose();
        mesh.userData.outline.material.dispose();
        mesh.userData.outline = null;
      }
    });

    const objectsToHighlight =
      selectedObjects.length > 1
        ? selectedObjects.filter((o) => o)
        : selectedObject
          ? [selectedObject]
          : [];

    objectsToHighlight.forEach((obj, index) => {
      const mesh = meshesRef.current[obj.id];
      if (!mesh) return;

      const isPrimary = index === 0;

      if (mesh.userData.isModel) {
        const modelContent = mesh.children[0];
        if (modelContent) {
          const box = new THREE.Box3().setFromObject(modelContent);
          const size = new THREE.Vector3();
          box.getSize(size);
          const boxCenter = new THREE.Vector3();
          box.getCenter(boxCenter);
          const localCenter = modelContent.worldToLocal(boxCenter.clone());

          const outlineGeo = new THREE.BoxGeometry(size.x * 1.02, size.y * 1.02, size.z * 1.02);
          const outline = new THREE.LineSegments(
            new THREE.EdgesGeometry(outlineGeo),
            new THREE.LineBasicMaterial({ color: isPrimary ? 0x4a90d9 : 0x66aaff, linewidth: 2 })
          );
          outline.position.copy(localCenter);
          modelContent.add(outline);
          mesh.userData.outline = outline;
        }
      } else if (mesh.userData.isLight) {
        const outline = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.SphereGeometry(0.6, 8, 8)),
          new THREE.LineBasicMaterial({ color: isPrimary ? 0x4a90d9 : 0x66aaff, linewidth: 2 })
        );
        mesh.add(outline);
        mesh.userData.outline = outline;
      } else {
        const outline = new THREE.LineSegments(
          new THREE.EdgesGeometry(mesh.geometry),
          new THREE.LineBasicMaterial({ color: isPrimary ? 0x4a90d9 : 0x66aaff, linewidth: 2 })
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
        .map((obj) => meshesRef.current[obj.id])
        .filter((m) => m && m.parent === sceneRef.current);

      if (meshes.length === 0) {
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
  }, [
    selectedObject,
    selectedObjects,
    currentTool,
    calculateSelectionsCenter,
    getMeshGeometryCenterWorld,
  ]);

  // 射线拾取
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
        (mesh) => mesh.parent === sceneRef.current
      );
      const intersects = raycaster.intersectObjects(validObjects, true);

      if (intersects.length > 0) {
        let clickedMesh = intersects[0].object;
        while (clickedMesh.parent && !meshesRef.current[clickedMesh.userData?.id]) {
          clickedMesh = clickedMesh.parent;
        }
        if (clickedMesh.userData?.id) {
          const found = objects.find((obj) => obj.id === clickedMesh.userData.id);
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

  // 播放模式：旋转实体对象（排除灯光/可视化/轴心/网格辅助）
  useEffect(() => {
    if (!sceneRef.current || !isPlaying) return;

    const animate = () => {
      Object.values(meshesRef.current).forEach((mesh) => {
        if (
          mesh.userData?.id &&
          !mesh.userData?.isLight &&
          !mesh.userData?.visualMesh &&
          !mesh.userData?.outline &&
          mesh.type !== 'DirectionalLight' &&
          mesh.type !== 'PointLight' &&
          mesh.type !== 'SpotLight' &&
          mesh.type !== 'Object3D'
        ) {
          mesh.rotation.y += 0.01;
        }
      });
    };
    const interval = setInterval(animate, 16);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // ===== 贴图拖拽 =====
  const handleDragOver = (e) => {
    if (e.dataTransfer.types.includes('application/astra-texture')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e) => {
    const textureData = e.dataTransfer.getData('application/astra-texture');
    if (!textureData) return;

    e.preventDefault();

    try {
      const { assetId } = JSON.parse(textureData);
      if (!selectedObject) return;

      const canApplyTexture =
        selectedObject.isModel ||
        selectedObject.type === 'sphere' ||
        selectedObject.type === 'plane' ||
        selectedObject.type === 'cube' ||
        selectedObject.type === 'mesh';
      if (!canApplyTexture) return;

      if (!onUpdateObject) return;
      onRecordHistory?.();

      // cube 使用 faceTextures，按鼠标碰到的面应用
      if (selectedObject.type === 'cube') {
        const mesh = meshesRef.current[selectedObject.id];
        if (mesh && sceneRef.current && cameraRef.current && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const mouse = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
          );

          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse, cameraRef.current);
          const intersects = raycaster.intersectObject(mesh);

          let bestFace = null;
          const threshold = 0.48;
          for (const intersect of intersects) {
            const localPoint = mesh.worldToLocal(intersect.point.clone());
            const absX = Math.abs(localPoint.x);
            const absY = Math.abs(localPoint.y);
            const absZ = Math.abs(localPoint.z);

            if (absX > threshold && absY > threshold && absZ > threshold) continue;

            let faceName;
            if (absX > threshold && absY <= threshold && absZ <= threshold) {
              faceName = localPoint.x > 0 ? 'right' : 'left';
            } else if (absY > threshold && absX <= threshold && absZ <= threshold) {
              faceName = localPoint.y > 0 ? 'top' : 'bottom';
            } else if (absZ > threshold && absX <= threshold && absY <= threshold) {
              faceName = localPoint.z > 0 ? 'front' : 'back';
            } else {
              continue;
            }
            bestFace = faceName;
            break;
          }

          if (bestFace) {
            const newFaceTextures = {
              ...(selectedObject.faceTextures || FALLBACK_FACE_TEXTURES()),
            };
            newFaceTextures[bestFace] = assetId;
            // 修复：记录历史后传 false，避免重复快照
            onUpdateObject(selectedObject.id, { faceTextures: newFaceTextures }, false);
          } else {
            onUpdateObject(
              selectedObject.id,
              {
                faceTextures: {
                  right: assetId,
                  left: assetId,
                  top: assetId,
                  bottom: assetId,
                  front: assetId,
                  back: assetId,
                },
              },
              false
            );
          }
        }
      } else {
        onUpdateObject(selectedObject.id, { textureId: assetId }, false);
      }
    } catch (err) {
      console.error('Failed to parse texture drag data:', err);
    }
  };

  const tools = [
    { id: 'select', labelKey: 'tool.select', icon: <IconSelect className="tool-icon" /> },
    { id: 'move', labelKey: 'tool.move', icon: <IconMove className="tool-icon" /> },
    { id: 'rotate', labelKey: 'tool.rotate', icon: <IconRotate className="tool-icon" /> },
    { id: 'scale', labelKey: 'tool.scale', icon: <IconScale className="tool-icon" /> },
  ];

  const cameraModeItems = [
    {
      label: msg('viewport.perspective'),
      onClick: () => handleSetCameraType('perspective'),
    },
    {
      label: msg('viewport.orthographic'),
      onClick: () => handleSetCameraType('orthographic'),
    },
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
          {tools.map((tool) => (
            <button
              key={tool.id}
              className={`viewport-tool-btn ${currentTool === tool.id ? 'active' : ''}`}
              onClick={() => onToolChange(tool.id)}
              {...tip(msg(tool.labelKey))}
            >
              {tool.icon}
            </button>
          ))}
          {currentTool === 'scale' && (
            <button
              className={`viewport-tool-btn ${uniformScale ? 'active' : ''}`}
              onClick={() => setUniformScale(!uniformScale)}
              {...tip(uniformScale ? msg('tool.uniformScaleOn') : msg('tool.uniformScaleOff'))}
            >
              <IconUniformScale className="tool-icon" />
            </button>
          )}
        </div>
      )}
      <div className="viewport-overlay">
        <span className="viewport-label">
          {viewLabel ||
            (cameraType === 'perspective'
              ? msg('viewport.perspective')
              : msg('viewport.orthographic'))}
        </span>
      </div>
      <div className={`view-cube ${showViewCube ? '' : 'hidden'}`} ref={viewCubeElRef} />
      {showDock && (
        <div className="viewport-dock">
          <div className="viewport-dock-item">
            <span className="viewport-dock-label">{msg('viewport.cameraMode')}:</span>
            <DropdownMenu
              label={
                cameraType === 'perspective'
                  ? msg('viewport.perspective')
                  : msg('viewport.orthographic')
              }
              items={cameraModeItems}
              roundedCorners="all"
              className="camera-mode-dropdown"
              position="top"
            />
          </div>
          {onLightRenderingChange && (
            <div className="viewport-dock-item">
              <button
                className={`viewport-dock-btn ${lightRenderingEnabled ? 'active' : ''}`}
                onClick={() => onLightRenderingChange(!lightRenderingEnabled)}
                {...tip(
                  `${lightRenderingEnabled ? msg('viewport.lightRenderingOn') : msg('viewport.lightRenderingOff')} (F1)`
                )}
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
                  <IconKeyW className="hint-icon" />
                  <IconKeyA className="hint-icon" />
                  <IconKeyS className="hint-icon" />
                  <IconKeyD className="hint-icon" />
                  <span className="hint-text">{msg('viewport.hint.move')}</span>
                </span>
                <span className="hint-separator">|</span>
                <span className="hint-group">
                  <IconKeyQ className="hint-icon" />
                  <IconKeyE className="hint-icon" />
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
                  <IconKeyShift className="hint-icon" />
                  <IconMouseLeft className="hint-icon" />
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
