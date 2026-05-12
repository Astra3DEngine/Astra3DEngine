import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { msg } from '../i18n/index.js';

function Viewport({ objects, assets, selectedObject, onSelectObject, currentTool, onToolChange, isPlaying, onUpdateObject }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const transformControlsRef = useRef(null);
  const orbitControlsRef = useRef(null);
  const meshesRef = useRef({});
  const animationRef = useRef(null);
  const selectedObjectRef = useRef(selectedObject);
  const assetsRef = useRef(assets || []);
  const [uniformScale, setUniformScale] = useState(false);
  const uniformScaleRef = useRef(false);
  const viewCubeRef = useRef(null);
  const viewCubeSceneRef = useRef(null);
  const viewCubeCameraRef = useRef(null);
  const viewCubeRendererRef = useRef(null);

  useEffect(() => {
    uniformScaleRef.current = uniformScale;
  }, [uniformScale]);

  useEffect(() => {
    assetsRef.current = assets || [];
  }, [assets]);

  useEffect(() => {
    selectedObjectRef.current = selectedObject;
  }, [selectedObject]);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
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
    orbitControlsRef.current = orbitControls;

    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.setSpace('world');
    scene.add(transformControls);
    transformControlsRef.current = transformControls;

    let isTransformDragging = false;
    let lastScale = new THREE.Vector3();

    transformControls.addEventListener('dragging-changed', (event) => {
      isTransformDragging = event.value;
      orbitControls.enabled = !event.value;
      
      if (event.value && transformControls.getMode() === 'scale') {
        const current = selectedObjectRef.current;
        if (current && meshesRef.current[current.id]) {
          lastScale.copy(meshesRef.current[current.id].scale);
        }
      }
    });

    transformControls.addEventListener('change', () => {
      if (!isTransformDragging) return;
      
      const current = selectedObjectRef.current;
      if (!current || !meshesRef.current[current.id]) return;

      const mesh = meshesRef.current[current.id];
      const mode = transformControls.getMode();

      if (mode === 'translate') {
        onUpdateObject(current.id, {
          position: [mesh.position.x, mesh.position.y, mesh.position.z]
        });
      } else if (mode === 'rotate') {
        onUpdateObject(current.id, {
          rotation: [
            THREE.MathUtils.radToDeg(mesh.rotation.x),
            THREE.MathUtils.radToDeg(mesh.rotation.y),
            THREE.MathUtils.radToDeg(mesh.rotation.z)
          ]
        });
      } else if (mode === 'scale') {
        if (uniformScaleRef.current) {
          const avgScale = (mesh.scale.x + mesh.scale.y + mesh.scale.z) / 3;
          mesh.scale.set(avgScale, avgScale, avgScale);
        }
        onUpdateObject(current.id, {
          scale: [mesh.scale.x, mesh.scale.y, mesh.scale.z]
        });
      }

      if (mesh.material && mesh.material.color) {
        const colorHex = '#' + mesh.material.color.getHexString();
        if (colorHex !== (selectedObjectRef.current?.color || '').toString()) {
          onUpdateObject(current.id, { color: colorHex });
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

      orbitControls.update();
      renderer.render(scene, camera);
      
      if (viewCubeRendererRef.current && viewCubeSceneRef.current && viewCubeCameraRef.current) {
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        viewCubeCameraRef.current.position.copy(direction).negate().multiplyScalar(3);
        viewCubeCameraRef.current.up.copy(camera.up);
        viewCubeCameraRef.current.lookAt(0, 0, 0);
        viewCubeRendererRef.current.render(viewCubeSceneRef.current, viewCubeCameraRef.current);
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

    return () => {
      window.removeEventListener('resize', handleResize);
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
    if (!viewCubeRef.current) return;
    
    const size = 80;
    
    const viewCubeScene = new THREE.Scene();
    viewCubeSceneRef.current = viewCubeScene;
    
    const viewCubeCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    viewCubeCamera.position.set(2, 2, 2);
    viewCubeCamera.lookAt(0, 0, 0);
    viewCubeCameraRef.current = viewCubeCamera;
    
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
    
    const material = new THREE.MeshStandardMaterial({
      color: 0x0099ff,
      metalness: 0.3,
      roughness: 0.7,
      flatShading: true
    });
    
    const viewCubeMesh = new THREE.Mesh(geometry, material);
    viewCubeScene.add(viewCubeMesh);
    
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
      
      raycaster.setFromCamera(mouse, viewCubeCamera);
      const intersects = raycaster.intersectObject(viewCubeMesh);
      
      if (intersects.length > 0 && cameraRef.current) {
        const intersection = intersects[0];
        const intersectPoint = intersection.point.clone();
        
        intersectPoint.applyMatrix4(new THREE.Matrix4().getInverse(viewCubeMesh.matrixWorld));
        
        const direction = intersectPoint.clone().normalize();
        
        const mainDirections = [
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(-1, 0, 0),
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(0, -1, 0),
          new THREE.Vector3(0, 0, 1),
          new THREE.Vector3(0, 0, -1)
        ];
        
        let bestMatch = mainDirections[0];
        let bestDot = direction.dot(mainDirections[0]);
        
        for (let i = 1; i < mainDirections.length; i++) {
          const dot = direction.dot(mainDirections[i]);
          if (dot > bestDot) {
            bestDot = dot;
            bestMatch = mainDirections[i];
          }
        }
        
        const distance = cameraRef.current.position.length();
        const targetPosition = bestMatch.clone().multiplyScalar(distance);
        
        const startPos = cameraRef.current.position.clone();
        const startTime = Date.now();
        const duration = 300;
        
        const animateCamera = () => {
          const elapsed = Date.now() - startTime;
          const t = Math.min(elapsed / duration, 1);
          const easeT = t * (2 - t);
          
          cameraRef.current.position.lerpVectors(startPos, targetPosition, easeT);
          cameraRef.current.lookAt(0, 0, 0);
          
          if (t < 1) {
            requestAnimationFrame(animateCamera);
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
      
      const spherical = new THREE.Spherical();
      spherical.setFromVector3(cameraRef.current.position);
      
      spherical.theta -= deltaX * 0.01;
      spherical.phi -= deltaY * 0.01;
      
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
      
      cameraRef.current.position.setFromSpherical(spherical);
      cameraRef.current.lookAt(0, 0, 0);
      
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
      if (meshesRef.current[obj.id]) {
        const mesh = meshesRef.current[obj.id];
        mesh.position.set(obj.position[0], obj.position[1], obj.position[2]);
        mesh.rotation.set(
          THREE.MathUtils.degToRad(obj.rotation[0]),
          THREE.MathUtils.degToRad(obj.rotation[1]),
          THREE.MathUtils.degToRad(obj.rotation[2])
        );
        mesh.scale.set(obj.scale[0], obj.scale[1], obj.scale[2]);
        if (mesh.material && mesh.material.color) {
          mesh.material.color.setStyle(obj.color || '#4a90d9');
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

        const material = new THREE.MeshStandardMaterial({
          color: obj.color || 0x4a90d9,
          metalness: 0.3,
          roughness: 0.7
        });

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
  }, [objects]);

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

    if (selectedObject && meshesRef.current[selectedObject.id]) {
      const mesh = meshesRef.current[selectedObject.id];
      if (mesh.parent === sceneRef.current) {
        transformControlsRef.current.attach(mesh);

        if (mesh.userData.isModel) {
          const assetSize = mesh.userData.assetSize || new THREE.Vector3(1, 1, 1);
          const size = assetSize.clone().multiply(mesh.scale);
          
          const outline = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x, size.y, size.z)),
            new THREE.LineBasicMaterial({ color: 0x4a90d9, linewidth: 2 })
          );
          mesh.add(outline);
          mesh.userData.outline = outline;
        } else {
          const outline = new THREE.LineSegments(
            new THREE.EdgesGeometry(mesh.geometry),
            new THREE.LineBasicMaterial({ color: 0x4a90d9, linewidth: 2 })
          );
          outline.scale.setScalar(1.01);
          mesh.add(outline);
          mesh.userData.outline = outline;
        }
      }
    } else {
      transformControlsRef.current.detach();
    }
  }, [selectedObject]);

  useEffect(() => {
    if (!containerRef.current || !rendererRef.current) return;

    const canvas = rendererRef.current.domElement;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e) => {
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
    { id: 'select', labelKey: 'tool.select', icon: '↖' },
    { id: 'move', labelKey: 'tool.move', icon: '✥' },
    { id: 'rotate', labelKey: 'tool.rotate', icon: '↻' },
    { id: 'scale', labelKey: 'tool.scale', icon: '⤢' }
  ];

  return (
    <div className="viewport-container" ref={containerRef}>
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
            🔗
          </button>
        )}
      </div>
      <div className="viewport-overlay">
        <span className="viewport-label">{msg('viewport.perspective')}</span>
      </div>
      <div className="view-cube" ref={viewCubeRef} />
    </div>
  );
}

export default Viewport;
