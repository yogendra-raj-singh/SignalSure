import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SignalStreamsProps {
  reducedMotion: boolean;
  isMobile: boolean;
}

type SignalClass = 'safe' | 'suspicious' | 'blocked';

interface ParticleState {
  signalClass: SignalClass;
  laneOffset: number;
  progress: number;
  speed: number;
  scale: number;
}

// Pre-allocated scratch math objects (zero GC allocations in render loop)
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _mat = new THREE.Matrix4();
const _color = new THREE.Color();

const COLOR_INCOMING = new THREE.Color('#7c9390');
const COLOR_SAFE = new THREE.Color('#00f0c8');
const COLOR_SUSPICIOUS = new THREE.Color('#f59e0b');
const COLOR_BLOCKED = new THREE.Color('#fb7185');

export function SignalStreams({ reducedMotion, isMobile }: SignalStreamsProps) {
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const count = isMobile ? 18 : 36;

  // Define curved trajectories: approach from left -> scan at core -> separate into 3 paths
  const curves = useMemo(() => {
    const incomingCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.6, 0.35, -0.5),
      new THREE.Vector3(-3.0, 0.22, -0.15),
      new THREE.Vector3(-1.55, 0.05, 0.05),
      new THREE.Vector3(-0.3, 0.0, 0.0),
    ]);

    const safeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.3, 0.0, 0.0),
      new THREE.Vector3(1.15, 0.42, 0.22),
      new THREE.Vector3(2.65, 0.92, 0.35),
      new THREE.Vector3(4.3, 1.32, 0.2),
    ]);

    const suspiciousCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.3, 0.0, 0.0),
      new THREE.Vector3(1.2, -0.05, -0.35),
      new THREE.Vector3(2.7, -0.18, -0.45),
      new THREE.Vector3(4.2, -0.25, -0.2),
    ]);

    const blockedCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.3, 0.0, 0.0),
      new THREE.Vector3(-0.85, -0.75, 0.55),
      new THREE.Vector3(-2.1, -1.35, 0.72),
      new THREE.Vector3(-3.6, -1.78, 0.35),
    ]);

    const makeGuideGeo = (curve: THREE.CatmullRomCurve3) =>
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(36));

    return {
      incomingCurve,
      safeCurve,
      suspiciousCurve,
      blockedCurve,
      incomingGeo: makeGuideGeo(incomingCurve),
      safeGeo: makeGuideGeo(safeCurve),
      suspiciousGeo: makeGuideGeo(suspiciousCurve),
      blockedGeo: makeGuideGeo(blockedCurve),
    };
  }, []);

  const lineMaterials = useMemo(() => {
    return {
      incoming: new THREE.LineBasicMaterial({
        color: '#64748b',
        transparent: true,
        opacity: 0.28,
      }),
      safe: new THREE.LineBasicMaterial({
        color: '#00f0c8',
        transparent: true,
        opacity: 0.34,
      }),
      suspicious: new THREE.LineBasicMaterial({
        color: '#f59e0b',
        transparent: true,
        opacity: 0.32,
      }),
      blocked: new THREE.LineBasicMaterial({
        color: '#fb7185',
        transparent: true,
        opacity: 0.34,
      }),
    };
  }, []);

  const particleGeo = useMemo(() => new THREE.OctahedronGeometry(0.058, 0), []);
  const particleMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.25,
        metalness: 0.3,
        emissive: new THREE.Color('#00f0c8'),
        emissiveIntensity: 0.35,
      }),
    []
  );

  const particlesRef = useRef<ParticleState[]>([]);
  if (particlesRef.current.length !== count) {
    const classes: SignalClass[] = ['safe', 'suspicious', 'blocked'];
    particlesRef.current = Array.from({ length: count }, (_, i) => ({
      signalClass: classes[i % 3],
      laneOffset: ((i % 5) - 2) * 0.045,
      progress: i / count,
      speed: 0.13 + (i % 4) * 0.018,
      scale: 0.78 + (i % 3) * 0.22,
    }));
  }

  const updateInstances = (dt: number, animate: boolean) => {
    const mesh = instancedRef.current;
    if (!mesh) return;

    const list = particlesRef.current;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (animate) {
        p.progress = (p.progress + dt * p.speed) % 1;
      }

      const t = p.progress;
      if (t < 0.45) {
        const localT = t / 0.45;
        curves.incomingCurve.getPoint(localT, _pos);
        _color.copy(COLOR_INCOMING);
        if (localT > 0.7) {
          const target =
            p.signalClass === 'safe'
              ? COLOR_SAFE
              : p.signalClass === 'suspicious'
              ? COLOR_SUSPICIOUS
              : COLOR_BLOCKED;
          _color.lerp(target, (localT - 0.7) / 0.3);
        }
      } else {
        const localT = (t - 0.45) / 0.55;
        const outCurve =
          p.signalClass === 'safe'
            ? curves.safeCurve
            : p.signalClass === 'suspicious'
            ? curves.suspiciousCurve
            : curves.blockedCurve;
        outCurve.getPoint(localT, _pos);
        _color.copy(
          p.signalClass === 'safe'
            ? COLOR_SAFE
            : p.signalClass === 'suspicious'
            ? COLOR_SUSPICIOUS
            : COLOR_BLOCKED
        );
      }

      _pos.y += p.laneOffset;
      _pos.z += p.laneOffset * 0.5;
      _scale.setScalar(p.scale);
      _mat.compose(_pos, _quat, _scale);
      mesh.setMatrixAt(i, _mat);
      mesh.setColorAt(i, _color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  useEffect(() => {
    updateInstances(0, false);
    if (instancedRef.current) {
      instancedRef.current.frustumCulled = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  useEffect(() => {
    return () => {
      curves.incomingGeo.dispose();
      curves.safeGeo.dispose();
      curves.suspiciousGeo.dispose();
      curves.blockedGeo.dispose();
      Object.values(lineMaterials).forEach((m) => m.dispose());
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, [curves, lineMaterials, particleGeo, particleMat]);

  const guideLines = useMemo(
    () => ({
      incoming: new THREE.Line(curves.incomingGeo, lineMaterials.incoming),
      safe: new THREE.Line(curves.safeGeo, lineMaterials.safe),
      suspicious: new THREE.Line(curves.suspiciousGeo, lineMaterials.suspicious),
      blocked: new THREE.Line(curves.blockedGeo, lineMaterials.blocked),
    }),
    [curves, lineMaterials]
  );

  useFrame((_state, delta) => {
    if (reducedMotion) return;
    updateInstances(Math.min(delta, 0.1), true);
  });

  return (
    <group>
      <primitive object={guideLines.incoming} />
      <primitive object={guideLines.safe} />
      <primitive object={guideLines.suspicious} />
      <primitive object={guideLines.blocked} />
      <instancedMesh
        key={count}
        ref={instancedRef}
        args={[particleGeo, particleMat, count]}
      />
    </group>
  );
}
