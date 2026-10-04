import { Suspense, useEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { AnimatePresence, motion } from 'framer-motion';
import { StageFrame } from '@/components/frame/StageFrame';
import { AhuModel, type AhuPart } from '@/equipment/AhuModel';
import { EquipmentPanel, formatRole } from '@/equipment/EquipmentPanel';
import { useAhuLive } from '@/equipment/useAhuLive';
import { ahuById, type AhuRole, type AhuUnit } from '@/model/galaxyBindings';
import { buildingById } from '@/model/site';
import { useNow } from '@/sim/clock';
import { useStageScale } from '@/stage/Stage';

type Tone = 'bad' | 'good' | 'idle';

/** 3D View › A02 › R › FAHU-01: the unit in 3D, live from the Galaxy, with its points panel. */
export default function EquipmentScreen() {
  const { building, floor, device } = useParams();
  const b = buildingById(building);
  const unit = ahuById(device);
  const f = b?.floors.find((x) => x.id === floor);
  if (!b || !f || !unit) return <Navigate to="/" replace />;
  return (
    <StageFrame crumbs={[{ label: b.label, to: `/site/${b.id}` }, { label: f.label, to: `/site/${b.id}/${f.id}` }, { label: unit.id }]}>
      <Equipment unit={unit} />
    </StageFrame>
  );
}

function Equipment({ unit }: { unit: AhuUnit }) {
  const live = useAhuLive(unit);
  const [hovered, setHovered] = useState<AhuPart | null>(null);
  const [selected, setSelected] = useState<AhuPart | null>(null);
  const controls = useRef<OrbitControlsImpl>(null);
  const labels = useRef(new Map<string, HTMLElement>());
  // The stage is CSS-scaled; render at the size it is shown (a 4K wall scales ×2), within GPU limits.
  const stageScale = useStageScale();
  const dpr = Math.min(2.5, Math.max(1, window.devicePixelRatio * stageScale));

  const v = (role: AhuRole) => formatRole(live, role);
  const tone = (role: AhuRole): Tone => {
    const t = v(role).tone;
    return t === 'bad' ? 'bad' : t === 'good' ? 'good' : 'idle';
  };
  // Callout labels; each is pinned to its part's anchor in the model (CALLOUT_ANCHORS).
  const callouts: { part: 'damper' | 'filter' | 'valve' | 'fan' | 'motor' | 'outlet'; label: string; value: string; tone: Tone }[] = [
    { part: 'damper', label: 'Outside Air', value: v('outsideTemp').text, tone: 'idle' },
    { part: 'filter', label: 'Filter ΔP', value: v('pressure').text, tone: live.model.filterAlarm ? 'bad' : 'idle' },
    { part: 'valve', label: 'PICV', value: v('valveFb').text, tone: tone('valveAlarm') === 'bad' ? 'bad' : 'idle' },
    { part: 'fan', label: 'Supply Fan', value: live.model.tripped ? 'Trip' : v('fanStatus').text, tone: live.model.tripped ? 'bad' : tone('fanStatus') },
    { part: 'motor', label: 'VSD', value: v('vsdFb').text, tone: 'idle' },
    { part: 'outlet', label: 'Supply Air', value: v('supplyTemp').text, tone: 'idle' },
  ];

  // Building the WebGL scene blocks the main thread for a moment, so it starts only once the page has
  // finished its entrance; the scene then fades in over a loader once its first frame is drawn.
  const [mountScene, setMountScene] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [compiled, setCompiled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMountScene(true), 480);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <AnimatePresence>{!sceneReady && <SceneLoader key="loader" />}</AnimatePresence>
      <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: sceneReady ? 1 : 0 }} transition={{ duration: 0.6 }}>
        {mountScene && (
        <Canvas
          shadows
          dpr={dpr}
          frameloop={compiled ? 'always' : 'never'}
          camera={{ position: [-3.2, 4.6, 10.5], fov: 34 }}
          // Measure with offsetWidth/Height: the stage is CSS-scaled, and bounding rects would be scaled twice.
          resize={{ offsetSize: true }}
          onPointerMissed={() => setSelected(null)}
          style={{ position: 'absolute', inset: 0 }}
        >
          <hemisphereLight args={['#dfe6ff', '#1a1c3a', 0.9]} />
          <ambientLight intensity={0.25} />
          <directionalLight position={[6, 9, 7]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={6} shadow-camera-bottom={-6} />
          <directionalLight position={[-7, 4, -5]} intensity={0.5} color="#4fc3d4" />
          <pointLight position={[1, 3, 4]} intensity={6} distance={12} color="#d9fbff" />
          <Suspense fallback={null}>
            <group position={[-1.2, -0.9, 0]}>
              <AhuModel live={live.model} hovered={hovered} selected={selected} onHover={setHovered} onSelect={setSelected} anchorTargets={labels} />
              {/* Baked once: the unit doesn't move, and re-rendering it every frame is the costliest pass. */}
              <ContactShadows frames={1} position={[0, -0.01, 0]} opacity={0.55} scale={18} blur={2.4} far={4} color="#000010" />
            </group>
          </Suspense>
          <Precompile
            onDone={() => {
              setCompiled(true);
              requestAnimationFrame(() => requestAnimationFrame(() => setSceneReady(true)));
            }}
          />
          <OrbitControls
            ref={controls}
            target={[-0.6, 0.4, 0]}
            enablePan={false}
            minDistance={7}
            maxDistance={16}
            minPolarAngle={0.35}
            maxPolarAngle={1.45}
            minAzimuthAngle={-1.2}
            maxAzimuthAngle={0.9}
            enableDamping
            dampingFactor={0.08}
          />
        </Canvas>
        )}
      </motion.div>

      {/* Callout labels: positioned every frame by the model's projector (see AhuModel). */}
      <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden" style={{ visibility: sceneReady ? 'visible' : 'hidden' }}>
        {callouts.map((c) => (
          <button
            key={c.part}
            ref={(el) => {
              if (el) labels.current.set(c.part, el);
              else labels.current.delete(c.part);
            }}
            onClick={() => setSelected(c.part)}
            className="pointer-events-auto absolute left-0 top-0 flex items-center gap-[8px] whitespace-nowrap rounded-[8px] bg-white px-[8px] py-[5px] font-[family-name:var(--font-plain)] text-[12px] text-[#0d3438] opacity-0 shadow-[0_8px_20px_rgba(0,0,0,0.45)] transition-[opacity] hover:ring-2 hover:ring-accent"
            style={selected === c.part ? { boxShadow: '0 0 0 2px #4fdcff, 0 8px 20px rgba(0,0,0,0.45)' } : undefined}
          >
            {c.label}
            <span
              className="min-w-[70px] rounded-[5px] border px-[6px] py-[1px] text-center font-medium"
              style={{ borderColor: c.tone === 'bad' ? '#ef4444' : '#4fc3d4', color: c.tone === 'bad' ? '#ef4444' : c.tone === 'good' ? '#2fae4f' : '#2f8f9e' }}
            >
              {c.value}
            </span>
          </button>
        ))}
      </div>

      <StatusStrip live={live} onReset={() => controls.current?.reset()} />
      <EquipmentPanel live={live} selected={selected} />
    </>
  );
}

/**
 * Compiles the scene's shaders off the main thread (KHR_parallel_shader_compile, where available)
 * before the first frame, so the first render doesn't stall on shader compilation.
 */
function Precompile({ onDone }: { onDone: () => void }) {
  const { gl, scene, camera } = useThree();
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    let alive = true;
    gl.compileAsync(scene, camera)
      .catch(() => undefined)
      .then(() => alive && done.current());
    return () => {
      alive = false;
    };
  }, [gl, scene, camera]);
  return null;
}

/** Shown in the scene area until the 3D model has drawn its first frame. */
function SceneLoader() {
  return (
    <motion.div className="pointer-events-none absolute inset-0 flex items-center justify-center" exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex flex-col items-center gap-[14px] pr-[360px]">
        <span className="h-[46px] w-[46px] animate-spin rounded-full border-2 border-white/10 border-t-accent" />
        <span className="font-[family-name:var(--font-plain)] text-[15px] text-ink-3">Loading the 3D model…</span>
      </div>
    </motion.div>
  );
}

function StatusStrip({ live, onReset }: { live: ReturnType<typeof useAhuLive>; onReset: () => void }) {
  const now = useNow(1000);
  const last = Object.values(live.obj?.points ?? {}).reduce<number>((acc, p) => {
    const t = p.sourceTimestamp ? Date.parse(p.sourceTimestamp) : 0;
    return t > acc ? t : acc;
  }, 0);
  const ago = last ? Math.max(0, Math.round((now - last) / 1000)) : null;
  const color = live.status === 'live' ? '#4ade6b' : live.status === 'reconnecting' ? '#ffb020' : '#4fc3d4';
  return (
    <div className="absolute bottom-[22px] left-[110px] z-10 flex items-center gap-[14px] text-[14px]">
      <span className="flex items-center gap-[8px] rounded-full border border-white/15 bg-night-900/70 px-[14px] py-[7px] backdrop-blur">
        <span className="h-[8px] w-[8px] rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        <span className="text-white">{live.status === 'live' ? 'Live' : live.status === 'reconnecting' ? 'Reconnecting' : 'Connecting'}</span>
        <span className="text-ink-3">· {live.unit.galaxy}</span>
        {ago !== null && <span className="text-ink-4">· last change {ago < 60 ? `${ago}s` : `${Math.round(ago / 60)} min`} ago</span>}
      </span>
      <button onClick={onReset} className="rounded-full border border-white/15 bg-night-900/70 px-[14px] py-[7px] text-ink-2 backdrop-blur hover:border-accent/60 hover:text-white">
        Reset view
      </button>
      <span className="text-[13px] text-ink-4">Drag to rotate · scroll to zoom · click a part for its points</span>
    </div>
  );
}
