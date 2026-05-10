import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

function Viewport({ objects, selectedObject, onSelectObject, currentTool, isPlaying, onUpdateObject }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const transformControlsRef = useRef(null);
  const orbitControlsRef = useRef(null);
  const meshesRef = useRef({});
  const animationRef = useRef(null);
  const selectedObjectRef = useRef(selectedObject);

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

    transformControls.addEventListener('dragging-changed', (event) => {
      isTransformDragging = event.value;
      orbitControls.enabled = !event.value;
    });

    transformControls.addEventListener('change', () => {
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
        onUpdateObject(current.id, {
          scale: [mesh.scale.x, mesh.scale.y, mesh.scale.z]
        });
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
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material.dispose();
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
        if (mesh.material.color) {
          mesh.material.color.setStyle(obj.color || '#4a90d9');
        }
      } else {
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

        const outline = new THREE.LineSegments(
          new THREE.EdgesGeometry(mesh.geometry),
          new THREE.LineBasicMaterial({ color: 0x4a90d9, linewidth: 2 })
        );
        outline.scale.setScalar(1.01);
        mesh.add(outline);
        mesh.userData.outline = outline;
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

      const validMeshes = Object.values(meshesRef.current).filter(
        mesh => mesh.parent === sceneRef.current && mesh.geometry
      );
      const intersects = raycaster.intersectObjects(validMeshes, true);

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

  return (
    <div className="viewport-container" ref={containerRef}>
      <div className="viewport-overlay">
        <span className="viewport-label">Perspective</span>
      </div>
    </div>
  );
}

export default Viewport;