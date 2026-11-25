import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SecurityCoreModel } from './SecurityCoreModel';
import { SignalStreams } from './SignalStreams';
import { probeWebGLCapabilities } from './webglUtils';

interface SecurityCoreSceneProps {
  reducedMotion: boolean;
  centered?: boolean;
}

function StudioEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmrem.dispose();

    return () => {
      scene.environment = null;
      envTarget.dispose();
    };
  }, [gl, scene]);

  return null;
}

function SoftwareGlPacer({
  active,
  isSoftwareGl,
}: {
  active: boolean;
  isSoftwareGl: boolean;
}) {
  const { invalidate, gl } = useThree();

  useEffect(() => {
    if (!isSoftwareGl || !active) return;

    let timerId = 0;
    let cancelled = false;

    const scheduleNext = () => {
      if (cancelled) return;
      const ctx = gl.getContext() as WebGL2RenderingContext;
      const sync =
        typeof ctx?.fenceSync === 'function'
          ? ctx.fenceSync(ctx.SYNC_GPU_COMMANDS_COMPLETE, 0)
          : null;

      if (sync) {
        ctx.flush();
        const poll = () => {
          if (cancelled) {
            ctx.deleteSync(sync);
            return;
          }
          const status = ctx.getSyncParameter(sync, ctx.SYNC_STATUS);
          if (status === ctx.UNSIGNALED) {
            timerId = window.setTimeout(poll, 12);
          } else {
            ctx.deleteSync(sync);
            timerId = window.setTimeout(() => {
              if (!cancelled) {
                invalidate();
                scheduleNext();
              }
            }, 130);
          }
        };
        timerId = window.setTimeout(poll, 12);
      } else {
        timerId = window.setTimeout(() => {
          if (!cancelled) {
            invalidate();
            scheduleNext();
          }
        }, 160);
      }
    };

    invalidate();
    scheduleNext();

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [active, isSoftwareGl, invalidate, gl]);

  return null;
}

function StaticCoreFallback({ reason }: { reason: 'webgl-unavailable' | 'context-lost' }) {
  return (
    <div
      data-testid="security-core-fallback"
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#030808]"
      aria-label="SignalSure geometric security core visualization"
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(circle at 50% 48%, rgba(0, 240, 200, 0.16), transparent 58%)',
        }}
      />
      <svg
        viewBox="0 0 420 420"
        className="h-56 w-56 text-[#00F0C8]/80 md:h-72 md:w-72"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="210" cy="210" r="158" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="6 8" />
        <circle cx="210" cy="210" r="118" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.25" />
        <circle cx="210" cy="210" r="76" fill="#041210" stroke="#00F0C8" strokeOpacity="0.65" strokeWidth="1.5" />
        <path d="M52 210 H134" stroke="#7C9390" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d="M286 210 C328 190 356 156 392 138" stroke="#00F0C8" strokeWidth="1.75" />
        <path d="M286 210 C328 214 358 220 392 224" stroke="#F59E0B" strokeWidth="1.75" />
        <path d="M210 286 C178 326 144 354 104 374" stroke="#FB7185" strokeWidth="1.75" />
        <circle cx="210" cy="210" r="14" fill="#00F0C8" fillOpacity="0.25" stroke="#00F0C8" strokeWidth="1.5" />
      </svg>
      <span className="sr-only">
        {reason === 'context-lost'
          ? '3D rendering paused; showing static security core preview.'
          : 'WebGL unavailable; showing static security core preview.'}
      </span>
    </div>
  );
}

export default function SecurityCoreScene({
  reducedMotion,
  centered = false,
}: SecurityCoreSceneProps) {
  const [capabilities] = useState(() => probeWebGLCapabilities());
  const [contextLost, setContextLost] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(
    typeof document !== 'undefined' ? document.hidden : false
  );
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onVisibility = () => setIsTabHidden(document.hidden);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    const onPointerMove = (e: PointerEvent) => {
      if (reducedMotion) return;
      const nx = (e.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
      const ny = (e.clientY / Math.max(window.innerHeight, 1)) * 2 - 1;
      pointerRef.current.x = nx;
      pointerRef.current.y = ny;
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, [reducedMotion]);

  const dpr: [number, number] = useMemo(() => {
    if (capabilities.isSoftwareGl) return [1, 1];
    if (isMobile) return [1, 1.5];
    return [1, 2];
  }, [capabilities.isSoftwareGl, isMobile]);

  if (!capabilities.supported) {
    return <StaticCoreFallback reason="webgl-unavailable" />;
  }

  if (contextLost) {
    return <StaticCoreFallback reason="context-lost" />;
  }

  const shouldAnimate = !reducedMotion && !isTabHidden;
  const frameloop: 'always' | 'demand' =
    capabilities.isSoftwareGl || !shouldAnimate ? 'demand' : 'always';

  return (
    <div
      data-testid="security-core-canvas"
      data-motion={reducedMotion ? 'reduced' : 'active'}
      className="pointer-events-none h-full w-full select-none"
      aria-hidden="true"
    >
      <Canvas
        dpr={dpr}
        frameloop={frameloop}
        gl={{
          antialias: !capabilities.isSoftwareGl,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
        onCreated={({ gl, scene }) => {
          scene.background = new THREE.Color('#030808');
          scene.fog = new THREE.FogExp2('#030808', 0.055);
          gl.outputColorSpace = THREE.SRGBColorSpace;

          const canvas = gl.domElement;
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            setContextLost(true);
          });
          canvas.addEventListener('webglcontextrestored', () => {
            setContextLost(false);
          });
        }}
      >
        <PerspectiveCamera
          makeDefault
          position={
            centered
              ? isMobile
                ? [0, 0.25, 5.5]
                : [0, 0.25, 5.0]
              : isMobile
              ? [0, 0.5, 8.2]
              : [-0.4, 0.4, 6.6]
          }
          fov={centered ? 40 : isMobile ? 44 : 38}
          near={0.1}
          far={60}
        />

        <StudioEnvironment />
        <SoftwareGlPacer
          active={shouldAnimate}
          isSoftwareGl={capabilities.isSoftwareGl}
        />

        {/* Warm key light vs cool emerald hemisphere fill + mint-teal rim accent */}
        <hemisphereLight args={['#00f0c8', '#041010', 0.68]} />
        <directionalLight position={[5, 6, 4]} intensity={1.75} color="#fff7ed" />
        <directionalLight position={[-5, -2, -4]} intensity={1.15} color="#00f0c8" />
        <pointLight position={[0, 2.2, 2.5]} intensity={1.45} distance={10} color="#00f0c8" />

        <group
          position={
            centered ? [0, -0.05, 0] : isMobile ? [0, -0.1, 0] : [1.35, -0.05, 0]
          }
        >
          <SecurityCoreModel
            reducedMotion={reducedMotion}
            isMobile={isMobile}
            pointerRef={pointerRef}
          />
          <SignalStreams reducedMotion={reducedMotion} isMobile={isMobile} />
        </group>
      </Canvas>
    </div>
  );
}
