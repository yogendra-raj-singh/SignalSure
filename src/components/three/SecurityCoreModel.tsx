import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  createCoreSurfaceBumpTexture,
  createRadialBaseTexture,
} from './webglUtils';

interface SecurityCoreModelProps {
  reducedMotion: boolean;
  isMobile: boolean;
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
}

const _dummy = new THREE.Object3D();

export function SecurityCoreModel({
  reducedMotion,
  isMobile,
  pointerRef,
}: SecurityCoreModelProps) {
  const rootRef = useRef<THREE.Group>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const midRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const scanSweepRef = useRef<THREE.Group>(null);
  const ticksRef = useRef<THREE.InstancedMesh>(null);
  const nodesRef = useRef<THREE.InstancedMesh>(null);

  const bumpTexture = useMemo(() => createCoreSurfaceBumpTexture(), []);
  const radialBaseTexture = useMemo(() => createRadialBaseTexture(), []);

  // Build composite geometries cleanly and dispose on unmount
  const geometries = useMemo(() => {
    const coreSphere = new THREE.SphereGeometry(0.96, isMobile ? 28 : 42, isMobile ? 28 : 42);
    const outerIco = new THREE.IcosahedronGeometry(1.36, 2);
    const outerEdges = new THREE.EdgesGeometry(outerIco, 1);
    outerIco.dispose();

    const innerIco = new THREE.IcosahedronGeometry(1.16, 1);
    const innerEdges = new THREE.EdgesGeometry(innerIco, 1);
    const nodeSourcePos = innerIco.attributes.position;
    const uniqueVerts: THREE.Vector3[] = [];
    for (let i = 0; i < nodeSourcePos.count; i++) {
      const v = new THREE.Vector3(
        nodeSourcePos.getX(i),
        nodeSourcePos.getY(i),
        nodeSourcePos.getZ(i)
      );
      if (!uniqueVerts.some((u) => u.distanceToSquared(v) < 0.001)) {
        uniqueVerts.push(v);
      }
    }
    innerIco.dispose();

    // Precision beveled titanium housing bezel via LatheGeometry
    const bezelProfile = [
      new THREE.Vector2(1.46, -0.055),
      new THREE.Vector2(1.56, -0.042),
      new THREE.Vector2(1.59, 0.0),
      new THREE.Vector2(1.56, 0.042),
      new THREE.Vector2(1.46, 0.055),
      new THREE.Vector2(1.44, 0.025),
      new THREE.Vector2(1.44, -0.025),
      new THREE.Vector2(1.46, -0.055),
    ];
    const bezelLathe = new THREE.LatheGeometry(bezelProfile, isMobile ? 48 : 72);

    const ringOuter = new THREE.TorusGeometry(2.12, 0.014, 12, isMobile ? 64 : 110);
    const ringMid = new THREE.TorusGeometry(1.86, 0.018, 12, isMobile ? 64 : 100);
    const ringInner = new THREE.TorusGeometry(1.66, 0.011, 10, isMobile ? 56 : 88);
    const scanArc = new THREE.TorusGeometry(1.41, 0.016, 10, 48, Math.PI * 0.72);
    const tickBox = new THREE.BoxGeometry(0.016, 0.05, 0.024);
    const nodeSphere = new THREE.SphereGeometry(0.028, 10, 10);
    const baseDisc = new THREE.CircleGeometry(2.7, 48);

    return {
      coreSphere,
      outerEdges,
      innerEdges,
      uniqueVerts,
      bezelLathe,
      ringOuter,
      ringMid,
      ringInner,
      scanArc,
      tickBox,
      nodeSphere,
      baseDisc,
    };
  }, [isMobile]);

  const materials = useMemo(() => {
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#041010'),
      metalness: 0.72,
      roughness: 0.24,
      clearcoat: 0.9,
      clearcoatRoughness: 0.16,
      bumpMap: bumpTexture,
      bumpScale: 0.014,
      envMapIntensity: 1.15,
    });

    const outerWireMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#00f0c8'),
      transparent: true,
      opacity: 0.42,
    });

    const innerWireMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#14b8a6'),
      transparent: true,
      opacity: 0.24,
    });

    const bezelMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#132422'),
      metalness: 0.92,
      roughness: 0.18,
      envMapIntensity: 1.3,
    });

    const ringOuterMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1e3835'),
      metalness: 0.85,
      roughness: 0.28,
      emissive: new THREE.Color('#0d9488'),
      emissiveIntensity: 0.28,
    });

    const ringMidMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#132422'),
      metalness: 0.88,
      roughness: 0.22,
      emissive: new THREE.Color('#00f0c8'),
      emissiveIntensity: 0.35,
    });

    const ringInnerMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#334d4a'),
      metalness: 0.75,
      roughness: 0.38,
      emissive: new THREE.Color('#f59e0b'),
      emissiveIntensity: 0.18,
    });

    const scanArcMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#00f0c8'),
      emissive: new THREE.Color('#00f0c8'),
      emissiveIntensity: 1.1,
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.88,
    });

    const tickMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#7df9e2'),
      emissive: new THREE.Color('#00f0c8'),
      emissiveIntensity: 0.45,
      roughness: 0.35,
      metalness: 0.7,
    });

    const nodeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e2fbf7'),
      emissive: new THREE.Color('#00f0c8'),
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.4,
    });

    const baseDiscMat = new THREE.MeshBasicMaterial({
      map: radialBaseTexture,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });

    return {
      coreMat,
      outerWireMat,
      innerWireMat,
      bezelMat,
      ringOuterMat,
      ringMidMat,
      ringInnerMat,
      scanArcMat,
      tickMat,
      nodeMat,
      baseDiscMat,
    };
  }, [bumpTexture, radialBaseTexture]);

  // Populate instanced ticks & geodesic anchor nodes once
  useEffect(() => {
    const tickMesh = ticksRef.current;
    if (tickMesh) {
      const count = 48;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const radius = 1.59;
        _dummy.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        _dummy.rotation.set(0, -angle, 0);
        const isMajor = i % 4 === 0;
        _dummy.scale.set(1, isMajor ? 1.55 : 0.85, isMajor ? 1.3 : 1);
        _dummy.updateMatrix();
        tickMesh.setMatrixAt(i, _dummy.matrix);
      }
      tickMesh.instanceMatrix.needsUpdate = true;
      tickMesh.computeBoundingSphere();
    }

    const nodeMesh = nodesRef.current;
    if (nodeMesh) {
      geometries.uniqueVerts.forEach((v, idx) => {
        _dummy.position.copy(v);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.setScalar(idx % 3 === 0 ? 1.25 : 0.85);
        _dummy.updateMatrix();
        nodeMesh.setMatrixAt(idx, _dummy.matrix);
      });
      nodeMesh.instanceMatrix.needsUpdate = true;
      nodeMesh.computeBoundingSphere();
    }
  }, [geometries.uniqueVerts]);

  // Clean disposal of geometries, materials, and procedural textures
  useEffect(() => {
    return () => {
      Object.values(geometries).forEach((item) => {
        if (item instanceof THREE.BufferGeometry) item.dispose();
      });
      Object.values(materials).forEach((mat) => mat.dispose());
      bumpTexture.dispose();
      radialBaseTexture.dispose();
    };
  }, [geometries, materials, bumpTexture, radialBaseTexture]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const root = rootRef.current;
    if (!root) return;

    // Restrained pointer parallax with exponential damping
    const targetRotY = pointerRef.current.x * 0.22;
    const targetRotX = -pointerRef.current.y * 0.14;
    root.rotation.y = THREE.MathUtils.damp(root.rotation.y, targetRotY, 4.5, dt);
    root.rotation.x = THREE.MathUtils.damp(root.rotation.x, targetRotX, 4.5, dt);

    if (reducedMotion) return;

    const elapsed = state.clock.elapsedTime;
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = elapsed * 0.14;
    }
    if (midRingRef.current) {
      midRingRef.current.rotation.y = -elapsed * 0.22;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z = elapsed * 0.31;
    }
    if (scanSweepRef.current) {
      scanSweepRef.current.rotation.y = elapsed * 0.72;
      scanSweepRef.current.rotation.z = Math.sin(elapsed * 0.45) * 0.22;
    }
  });

  return (
    <group>
      <group ref={rootRef}>
        {/* 1. Dark translucent-feel PBR obsidian core */}
        <mesh geometry={geometries.coreSphere} material={materials.coreMat} />

        {/* 2. Inner telemetry lattice */}
        <lineSegments
          geometry={geometries.innerEdges}
          material={materials.innerWireMat}
        />

        {/* 3. Outer geodesic luminous data lattice */}
        <lineSegments
          geometry={geometries.outerEdges}
          material={materials.outerWireMat}
        />

        {/* 4. Geodesic anchor signal nodes */}
        <instancedMesh
          ref={nodesRef}
          args={[
            geometries.nodeSphere,
            materials.nodeMat,
            geometries.uniqueVerts.length,
          ]}
        />

        {/* 5. Precision beveled titanium equatorial bezel */}
        <mesh geometry={geometries.bezelLathe} material={materials.bezelMat} />

        {/* 6. Instanced equatorial telemetry tick marks */}
        <instancedMesh
          ref={ticksRef}
          args={[geometries.tickBox, materials.tickMat, 48]}
        />

        {/* 7. Three nested tilted orbital rings */}
        <mesh
          ref={outerRingRef}
          geometry={geometries.ringOuter}
          material={materials.ringOuterMat}
          rotation={[Math.PI * 0.34, Math.PI * 0.12, 0]}
        />
        <mesh
          ref={midRingRef}
          geometry={geometries.ringMid}
          material={materials.ringMidMat}
          rotation={[-Math.PI * 0.28, Math.PI * 0.24, 0.2]}
        />
        <mesh
          ref={innerRingRef}
          geometry={geometries.ringInner}
          material={materials.ringInnerMat}
          rotation={[Math.PI * 0.46, -Math.PI * 0.18, 0.4]}
        />

        {/* 8. Subtle active scan sweep arc */}
        <group ref={scanSweepRef}>
          <mesh
            geometry={geometries.scanArc}
            material={materials.scanArcMat}
            rotation={[Math.PI * 0.5, 0, 0]}
          />
        </group>
      </group>

      {/* 9. Grounded radial chamber floor projection */}
      <mesh
        geometry={geometries.baseDisc}
        material={materials.baseDiscMat}
        position={[0, -2.18, 0]}
        rotation={[-Math.PI * 0.5, 0, 0]}
      />
    </group>
  );
}
