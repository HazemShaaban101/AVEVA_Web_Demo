import { memo, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AhuLive } from '@/equipment/useAhuLive';

/**
 * A procedural cut-away air handling unit: fresh-air damper → filter bank → cooling coil (with its
 * piping and PICV out front) → plug fan on its motor, with the VSD beside it → outlet duct carrying the
 * smoke detector. Every moving part follows the unit's live Galaxy points; hovering a part lights it
 * cyan, clicking selects it (the points panel jumps to it).
 *
 * Units: 1 ≈ 0.5 m. X runs with the airflow, Y is up, the open (cut-away) side faces +Z. Parts are laid
 * out so that no two solids share a face or cut through each other: frame members sit proud of the
 * panels, and every component keeps a clear gap to its neighbours.
 */

export type AhuPart = 'damper' | 'filter' | 'coil' | 'valve' | 'fan' | 'motor' | 'outlet' | 'smoke';

/* ---- Layout ------------------------------------------------------------------------------------ */

const X0 = -4;
const X1 = 4;
const Y0 = 0.22; // floor top
const H = 2.2;
const Y1 = Y0 + H; // underside of the roof
const CY = Y0 + H / 2;
const D = 1.9;
const Z = D / 2;
const FZ = Z + 0.06; // front frame members, proud of the panels
const FILTER_X = -2.8;
const COIL_X = -0.55;
const FAN_X = 2.2;
const MOTOR_X = 3.25;
const DUCT_X = X1 + 0.72;

/** Where each callout label is pinned, in model space (see Projector). */
export const CALLOUT_ANCHORS: Record<'damper' | 'filter' | 'valve' | 'fan' | 'motor' | 'outlet', [number, number, number]> = {
  damper: [X0 - 0.1, Y1 + 0.35, 0.9],
  filter: [FILTER_X, Y1 + 0.35, 0.9],
  valve: [COIL_X + 0.1, 0.02, 1.62],
  fan: [FAN_X, Y1 + 0.35, 0.9],
  motor: [3.6, 0.02, 1.3],
  outlet: [DUCT_X + 0.25, CY + 0.95, 0.7],
};

/* ---- Materials ----------------------------------------------------------------------------------- */

const CYAN = new THREE.Color('#4fdcff');
const std = (color: string, metalness: number, roughness: number) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
// Casing materials never glow, so one shared instance each.
const M = {
  casing: std('#e4e7ec', 0.3, 0.5),
  inner: std('#b9c0ca', 0.2, 0.75),
  frame: std('#8d95a1', 0.5, 0.4),
  skid: std('#4d5561', 0.5, 0.5),
  dark: std('#2a2e36', 0.4, 0.6),
};

interface MatSpec {
  color: string;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  side?: THREE.Side;
}

/** One material per part (shared by all its meshes) that glows cyan while the part is hot. */
function useHotMaterial({ color, metalness = 0.35, roughness = 0.55, emissive, emissiveIntensity = 0, side }: MatSpec, hot: boolean) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ metalness, roughness, ...(side !== undefined && { side }) }), [metalness, roughness, side]);
  useEffect(() => () => mat.dispose(), [mat]);
  mat.color.set(color);
  mat.emissive.set(hot ? CYAN : (emissive ?? '#000000'));
  mat.emissiveIntensity = hot ? 0.45 : emissiveIntensity;
  return mat;
}

/* ---- Building blocks ----------------------------------------------------------------------------- */

interface BoxProps {
  size: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  material: THREE.Material;
  shadow?: boolean;
}

function Box({ size, position, rotation, material, shadow = true }: BoxProps) {
  return (
    <mesh position={position} rotation={rotation} material={material} castShadow={shadow} receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}

/** A cylinder along an axis ('x' | 'y' | 'z'). */
function Rod({ axis, radius, length, position, material, segments = 20, shadow = false }: { axis: 'x' | 'y' | 'z'; radius: number; length: number; position: [number, number, number]; material: THREE.Material; segments?: number; shadow?: boolean }) {
  const rotation: [number, number, number] = axis === 'x' ? [0, 0, Math.PI / 2] : axis === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  return (
    <mesh position={position} rotation={rotation} material={material} castShadow={shadow}>
      <cylinderGeometry args={[radius, radius, length, segments]} />
    </mesh>
  );
}

/** Many copies of one geometry: a single draw call. */
function Instances({ count, material, geometry, place, shadow = false }: { count: number; material: THREE.Material; geometry: ReactNode; place: (i: number, o: THREE.Object3D) => void; shadow?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      o.position.set(0, 0, 0);
      o.rotation.set(0, 0, 0);
      o.scale.set(1, 1, 1);
      place(i, o);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [count, place]);
  return (
    <instancedMesh ref={ref} args={[undefined, material, count]} castShadow={shadow} receiveShadow>
      {geometry}
    </instancedMesh>
  );
}

interface PartEvents {
  hovered: AhuPart | null;
  selected: AhuPart | null;
  onHover: (p: AhuPart | null) => void;
  onSelect: (p: AhuPart) => void;
}

function Part({ id, hovered, selected, onHover, onSelect, children }: PartEvents & { id: AhuPart; children: (hot: boolean) => ReactNode }) {
  const hot = hovered === id || selected === id;
  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(id);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = '';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
    >
      {children(hot)}
    </group>
  );
}

/* ---- Casing ------------------------------------------------------------------------------------ */

function Casing() {
  const len = X1 - X0;
  return (
    <group>
      {/* skid, floor, roof, back wall */}
      <Box size={[len + 0.3, 0.2, D + 0.12]} position={[0, 0.1, 0]} material={M.skid} />
      <Box size={[len, 0.02, D]} position={[0, Y0 - 0.01, 0]} material={M.inner} shadow={false} />
      <Box size={[len, 0.06, D]} position={[0, Y1 + 0.03, 0]} material={M.casing} />
      <Box size={[len, H, 0.05]} position={[0, CY, -Z + 0.025]} material={M.inner} />
      {/* inlet end: header and sill around the damper opening; outlet end: solid wall */}
      <Box size={[0.05, 0.3, D]} position={[X0 + 0.025, Y1 - 0.15, 0]} material={M.casing} />
      <Box size={[0.05, 0.3, D]} position={[X0 + 0.025, Y0 + 0.15, 0]} material={M.casing} />
      <Box size={[0.05, H, D]} position={[X1 - 0.025, CY, 0]} material={M.casing} />
      {/* open-face frame: posts at the section breaks, top and bottom rails, all proud of the panels */}
      {[X0, -1.6, 1.2, X1].map((x) => (
        <Box key={x} size={[0.12, H + 0.12, 0.12]} position={[x, CY, FZ]} material={M.frame} />
      ))}
      <Box size={[len + 0.12, 0.12, 0.12]} position={[0, Y1, FZ]} material={M.frame} />
      <Box size={[len + 0.12, 0.12, 0.12]} position={[0, Y0, FZ]} material={M.frame} />
      {/* section dividers against the back wall */}
      {[-1.6, 1.2].map((x) => (
        <Box key={x} size={[0.06, H, 0.1]} position={[x, CY, -Z + 0.1]} material={M.inner} shadow={false} />
      ))}
    </group>
  );
}

/* ---- Fresh-air damper -------------------------------------------------------------------------- */

function Damper({ open, hot }: { open: boolean; hot: boolean }) {
  const blades = useRef<THREE.Group>(null);
  const blade = useHotMaterial({ color: '#9fb4c9', metalness: 0.6, roughness: 0.35 }, hot);
  const actuator = useHotMaterial({ color: '#f08a24', metalness: 0.2, roughness: 0.5 }, hot);
  useFrame((_, dt) => {
    const target = open ? THREE.MathUtils.degToRad(72) : 0;
    blades.current?.children.forEach((b) => {
      b.rotation.z = THREE.MathUtils.damp(b.rotation.z, target, 4, dt);
    });
  });
  return (
    <group>
      <group ref={blades}>
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={i} position={[X0 + 0.14, Y0 + 0.5 + i * 0.32, 0]} material={blade} castShadow>
            <boxGeometry args={[0.03, 0.3, D - 0.12]} />
          </mesh>
        ))}
      </group>
      <Box size={[0.2, 0.26, 0.16]} position={[X0 + 0.45, Y1 - 0.35, 0.72]} material={actuator} />
    </group>
  );
}

/* ---- Filter bank --------------------------------------------------------------------------------- */

const PLEATS = 14;
const PLEAT_SPAN = 1.68;
const PLEAT_STEP = PLEAT_SPAN / PLEATS;
const PLEAT_DEPTH = 0.1;
const PLEAT_LEN = Math.hypot(PLEAT_STEP, PLEAT_DEPTH);
const placePleat = (i: number, o: THREE.Object3D) => {
  const dx = i % 2 ? -PLEAT_DEPTH : PLEAT_DEPTH;
  o.position.set(FILTER_X, CY, -PLEAT_SPAN / 2 + (i + 0.5) * PLEAT_STEP);
  o.rotation.y = Math.atan2(dx, PLEAT_STEP);
};

function Filter({ alarm, hot }: { alarm: boolean; hot: boolean }) {
  const media = useHotMaterial({ color: alarm ? '#e25555' : '#f2c230', metalness: 0.05, roughness: 0.9, emissive: alarm ? '#ff2a2a' : undefined, emissiveIntensity: alarm ? 0.5 : 0 }, hot);
  const rack = useHotMaterial({ color: '#a7afba', metalness: 0.5, roughness: 0.4 }, hot);
  return (
    <group>
      <Box size={[0.16, 0.08, D - 0.12]} position={[FILTER_X, Y1 - 0.14, 0]} material={rack} />
      <Box size={[0.16, 0.08, D - 0.12]} position={[FILTER_X, Y0 + 0.14, 0]} material={rack} />
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.16, H - 0.36, 0.05]} position={[FILTER_X, CY, s * (Z - 0.085)]} material={rack} />
      ))}
      <Instances count={PLEATS} material={media} shadow geometry={<boxGeometry args={[0.012, H - 0.38, PLEAT_LEN]} />} place={placePleat} />
    </group>
  );
}

/* ---- Cooling coil, its piping, and the PICV ------------------------------------------------------ */

const FINS = 30;
const placeFin = (i: number, o: THREE.Object3D) => o.position.set(COIL_X, CY, -0.8 + (i * 1.6) / (FINS - 1));
const TUBE_ROWS = 6;
const placeTube = (i: number, o: THREE.Object3D) => {
  o.position.set(COIL_X + (i % 2 ? 0.08 : -0.08), Y0 + 0.4 + Math.floor(i / 2) * ((H - 0.8) / (TUBE_ROWS - 1)), 0);
  o.rotation.x = Math.PI / 2;
};
const PIPE_Y = Y0 + 0.25; // pipes leave the headers here, run out front, then drop to the slab
const PIPE_Z = 1.45;

function Coil({ valve, hot }: { valve: number; hot: boolean }) {
  const tint = useMemo(() => new THREE.Color('#b87333').lerp(new THREE.Color('#3aa8ff'), valve).getStyle(), [valve]);
  const fins = useHotMaterial({ color: tint, metalness: 0.7, roughness: 0.3, emissive: '#1f7bff', emissiveIntensity: valve * 0.3 }, hot);
  const tubes = useHotMaterial({ color: '#c47a3a', metalness: 0.8, roughness: 0.3 }, hot);
  const frame = useHotMaterial({ color: '#a7afba', metalness: 0.5, roughness: 0.4 }, hot);
  const pipe = useHotMaterial({ color: '#c9d6e3', metalness: 0.75, roughness: 0.3 }, hot);
  return (
    <group>
      {/* casing frame */}
      <Box size={[0.36, 0.08, D - 0.12]} position={[COIL_X, Y1 - 0.14, 0]} material={frame} />
      <Box size={[0.36, 0.08, D - 0.12]} position={[COIL_X, Y0 + 0.14, 0]} material={frame} />
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.36, H - 0.36, 0.04]} position={[COIL_X, CY, s * (Z - 0.08)]} material={frame} />
      ))}
      {/* fin pack and the copper tube rows through it */}
      <Instances count={FINS} material={fins} geometry={<boxGeometry args={[0.3, H - 0.44, 0.012]} />} place={placeFin} />
      <Instances count={TUBE_ROWS * 2} material={tubes} geometry={<cylinderGeometry args={[0.02, 0.02, 1.66, 10]} />} place={placeTube} />
      {/* flow and return headers on the open face, each piped out front and down to the slab */}
      {[-0.1, 0.1].map((dx) => (
        <group key={dx}>
          <Rod axis="y" radius={0.045} length={H - 0.5} position={[COIL_X + dx, CY, Z - 0.02]} material={pipe} shadow />
          <Rod axis="z" radius={0.045} length={PIPE_Z - (Z - 0.02)} position={[COIL_X + dx, PIPE_Y, (PIPE_Z + Z - 0.02) / 2]} material={pipe} shadow />
          <Rod axis="y" radius={0.045} length={PIPE_Y} position={[COIL_X + dx, PIPE_Y / 2, PIPE_Z]} material={pipe} shadow />
          <mesh position={[COIL_X + dx, PIPE_Y, PIPE_Z]} material={pipe}>
            <sphereGeometry args={[0.055, 16, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Valve({ valve, hot }: { valve: number; hot: boolean }) {
  const pointer = useRef<THREE.Mesh>(null);
  const body = useHotMaterial({ color: '#2b4bd6', metalness: 0.5, roughness: 0.35 }, hot);
  const steel = useHotMaterial({ color: '#c9ccd2', metalness: 0.7, roughness: 0.3 }, hot);
  const handle = useHotMaterial({ color: '#e0773a', metalness: 0.3, roughness: 0.5 }, hot);
  useFrame((_, dt) => {
    if (pointer.current) pointer.current.rotation.y = THREE.MathUtils.damp(pointer.current.rotation.y, valve * Math.PI * 0.5, 4, dt);
  });
  // On the return pipe, halfway out.
  const x = COIL_X + 0.1;
  const z = (PIPE_Z + Z) / 2;
  return (
    <group position={[x, PIPE_Y, z]}>
      <Rod axis="z" radius={0.085} length={0.16} position={[0, 0, 0]} material={body} segments={24} shadow />
      {[-0.09, 0.09].map((dz) => (
        <Rod key={dz} axis="z" radius={0.1} length={0.02} position={[0, 0, dz]} material={body} segments={24} />
      ))}
      <Rod axis="y" radius={0.03} length={0.1} position={[0, 0.13, 0]} material={steel} />
      <Box size={[0.15, 0.12, 0.15]} position={[0, 0.24, 0]} material={steel} />
      <mesh ref={pointer} position={[0, 0.315, 0]} material={handle}>
        <boxGeometry args={[0.14, 0.03, 0.04]} />
      </mesh>
    </group>
  );
}

/* ---- Plug fan, motor and VSD --------------------------------------------------------------------- */

const BLADES = 12;
const placeBlade = (i: number, o: THREE.Object3D) => {
  const a = (i / BLADES) * Math.PI * 2;
  o.position.set(0, Math.cos(a) * 0.5, Math.sin(a) * 0.5);
  o.rotation.x = a + 0.35; // radial, leaning back like a backward-curved wheel
};

function Fan({ running, speed, tripped, hot }: { running: boolean; speed: number; tripped: boolean; hot: boolean }) {
  const wheel = useRef<THREE.Group>(null);
  const omega = useRef(0);
  const blades = useHotMaterial({ color: '#d7dde5', metalness: 0.7, roughness: 0.3, emissive: tripped ? '#ff2020' : undefined, emissiveIntensity: tripped ? 0.4 : 0 }, hot);
  const plate = useHotMaterial({ color: tripped ? '#b33333' : '#aeb6c2', metalness: 0.55, roughness: 0.35 }, hot);
  const cone = useHotMaterial({ color: '#9aa3af', metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide }, hot);
  useFrame((_, dt) => {
    // Spin up / coast down instead of jumping: ~2 s to reach speed.
    const target = running ? 4 + speed * 16 : 0;
    omega.current = THREE.MathUtils.damp(omega.current, target, running ? 1.2 : 0.6, dt);
    if (wheel.current) wheel.current.rotation.x += omega.current * dt;
  });
  return (
    <group position={[FAN_X, CY, 0]}>
      {/* inlet bell: wide mouth upstream, throat at the wheel's shroud */}
      <mesh position={[-0.48, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={cone}>
        <cylinderGeometry args={[0.66, 0.5, 0.26, 40, 1, true]} />
      </mesh>
      <group ref={wheel}>
        <mesh position={[-0.33, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={plate}>
          <torusGeometry args={[0.56, 0.035, 10, 48]} />
        </mesh>
        <Rod axis="x" radius={0.72} length={0.03} position={[0.36, 0, 0]} material={plate} segments={48} shadow />
        <Instances count={BLADES} material={blades} shadow geometry={<boxGeometry args={[0.66, 0.3, 0.02]} />} place={placeBlade} />
        <Rod axis="x" radius={0.1} length={0.14} position={[0.3, 0, 0]} material={plate} />
      </group>
      {/* shaft to the motor */}
      <Rod axis="x" radius={0.04} length={0.5} position={[0.6, 0, 0]} material={M.dark} />
    </group>
  );
}

function Motor({ running, hot }: { running: boolean; hot: boolean }) {
  const body = useHotMaterial({ color: '#c7ccd4', metalness: 0.6, roughness: 0.35 }, hot);
  const cap = useHotMaterial({ color: '#8e96a2', metalness: 0.6, roughness: 0.4 }, hot);
  const cabinet = useHotMaterial({ color: '#dfe3ea', metalness: 0.3, roughness: 0.5 }, hot);
  const screen = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  useEffect(() => () => screen.dispose(), [screen]);
  screen.color.set(running ? '#39e58c' : '#3a4150');
  const r = 0.27;
  return (
    <group>
      <Rod axis="x" radius={r} length={0.6} position={[MOTOR_X, CY, 0]} material={body} segments={32} shadow />
      {[-0.33, 0.33].map((dx) => (
        <Rod key={dx} axis="x" radius={r - 0.03} length={0.06} position={[MOTOR_X + dx, CY, 0]} material={cap} segments={32} />
      ))}
      <Box size={[0.18, 0.12, 0.18]} position={[MOTOR_X, CY + r + 0.06, 0]} material={cap} />
      {/* pedestal from the floor to the motor */}
      <Box size={[0.5, CY - r - Y0, 0.44]} position={[MOTOR_X, (CY - r + Y0) / 2, 0]} material={M.frame} />
      {/* VSD cabinet beside the pedestal, with its status screen */}
      <Box size={[0.34, 0.62, 0.22]} position={[3.6, Y0 + 0.31, 0.72]} material={cabinet} />
      <mesh position={[3.6, Y0 + 0.44, 0.835]} material={screen}>
        <boxGeometry args={[0.14, 0.08, 0.01]} />
      </mesh>
    </group>
  );
}

/* ---- Outlet duct + smoke detector --------------------------------------------------------------- */

function Outlet({ hot }: { hot: boolean }) {
  const duct = useHotMaterial({ color: '#e4e7ec', metalness: 0.3, roughness: 0.5 }, hot);
  return (
    <group position={[DUCT_X, CY, 0]}>
      <Box size={[1.4, 1.2, 1.3]} position={[0, 0, 0]} material={duct} />
      <Box size={[0.06, 1.34, 1.44]} position={[-0.67, 0, 0]} material={M.frame} />
      <Box size={[0.02, 1.0, 1.1]} position={[0.71, 0, 0]} material={M.dark} shadow={false} />
    </group>
  );
}

function SmokeDetector({ smoke, hot }: { smoke: boolean; hot: boolean }) {
  const lamp = useRef<THREE.MeshStandardMaterial>(null);
  const housing = useHotMaterial({ color: '#d62b2b', metalness: 0.2, roughness: 0.5 }, hot);
  useFrame(({ clock }) => {
    if (lamp.current) lamp.current.emissiveIntensity = smoke ? 0.6 + Math.sin(clock.elapsedTime * 10) * 0.6 : 0.1;
  });
  return (
    <group position={[DUCT_X + 0.25, CY + 0.1, 0.7]}>
      <Box size={[0.3, 0.36, 0.1]} position={[0, 0, 0]} material={housing} />
      <mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.02, 20]} />
        <meshStandardMaterial ref={lamp} color="#ffffff" emissive="#ff3030" emissiveIntensity={0.1} />
      </mesh>
    </group>
  );
}

/* ---- Airflow ------------------------------------------------------------------------------------ */

function Airflow({ running, speed, flow }: { running: boolean; speed: number; flow: boolean }) {
  const count = 140;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => Array.from({ length: count }, () => ({ x: Math.random(), y: CY - 0.8 + Math.random() * 1.6, z: -0.75 + Math.random() * 1.5, s: 0.7 + Math.random() * 0.6 })), []);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const level = useRef(0);
  useFrame((_, dt) => {
    level.current = THREE.MathUtils.damp(level.current, running ? 1 : 0, 1.5, dt);
    const m = mesh.current;
    if (!m) return;
    const start = X0 - 0.6;
    const span = DUCT_X + 0.7 - start;
    seeds.forEach((p, i) => {
      p.x = (p.x + (0.12 + speed * 0.45) * p.s * dt * level.current) % 1;
      const x = start + p.x * span;
      // Air narrows into the outlet duct.
      const inDuct = x > X1 - 0.3;
      tmp.position.set(x, CY + (p.y - CY) * (inDuct ? 0.7 : 1), p.z * (inDuct ? 0.8 : 1));
      const k = level.current * (0.55 + 0.45 * Math.sin(p.x * Math.PI));
      tmp.scale.set(0.9 + speed, k, k);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[0.16, 0.018, 0.018]} />
      <meshBasicMaterial color={flow || running ? '#7fe3ff' : '#99aaaa'} transparent opacity={0.85} toneMapped={false} depthWrite={false} />
    </instancedMesh>
  );
}

/* ---- Callout anchors ------------------------------------------------------------------------ */

/**
 * Projects each anchor (model space) to canvas pixels every frame and moves the matching DOM label
 * straight through its style: no React render per frame, and no per-label React root.
 */
function Projector({ targets }: { targets: React.RefObject<Map<string, HTMLElement>> }) {
  const group = useRef<THREE.Group>(null);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    const g = group.current;
    if (!g) return;
    for (const [id, position] of Object.entries(CALLOUT_ANCHORS)) {
      const el = targets.current?.get(id);
      if (!el) continue;
      v.set(...position).applyMatrix4(g.matrixWorld).project(camera);
      const visible = v.z < 1;
      el.style.opacity = visible ? '1' : '0';
      el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px) translate(-50%, -50%)`;
    }
  });
  return <group ref={group} />;
}

interface ModelProps extends PartEvents {
  live: AhuLive['model'];
  /** DOM elements of the callout labels, keyed by CALLOUT_ANCHORS id. */
  anchorTargets: React.RefObject<Map<string, HTMLElement>>;
}

function AhuModelImpl({ live, hovered, selected, onHover, onSelect, anchorTargets }: ModelProps) {
  const common = { hovered, selected, onHover, onSelect };
  return (
    <group position={[-0.6, 0, 0]}>
      <Casing />
      <Part id="damper" {...common}>{(hot) => <Damper open={live.freshOpen} hot={hot} />}</Part>
      <Part id="filter" {...common}>{(hot) => <Filter alarm={live.filterAlarm} hot={hot} />}</Part>
      <Part id="coil" {...common}>{(hot) => <Coil valve={live.valve} hot={hot} />}</Part>
      <Part id="valve" {...common}>{(hot) => <Valve valve={live.valve} hot={hot} />}</Part>
      <Part id="fan" {...common}>{(hot) => <Fan running={live.running} speed={live.speed} tripped={live.tripped} hot={hot} />}</Part>
      <Part id="motor" {...common}>{(hot) => <Motor running={live.running} hot={hot} />}</Part>
      <Part id="outlet" {...common}>{(hot) => <Outlet hot={hot} />}</Part>
      <Part id="smoke" {...common}>{(hot) => <SmokeDetector smoke={live.smoke} hot={hot} />}</Part>
      <Airflow running={live.running} speed={live.speed} flow={live.flow} />
      <Projector targets={anchorTargets} />
    </group>
  );
}

const sameModel = (a: AhuLive['model'], b: AhuLive['model']) =>
  (Object.keys(a) as (keyof AhuLive['model'])[]).every((k) => a[k] === b[k]);

/** Re-renders only when the unit's state, hover or selection changes (not on every point update). */
export const AhuModel = memo(AhuModelImpl, (p, n) => p.hovered === n.hovered && p.selected === n.selected && p.onHover === n.onHover && p.onSelect === n.onSelect && p.anchorTargets === n.anchorTargets && sameModel(p.live, n.live));
