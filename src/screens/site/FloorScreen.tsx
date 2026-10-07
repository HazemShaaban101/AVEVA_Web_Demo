import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import floorplan from '@/assets/renders/floorplan.webp';
import { StageFrame } from '@/components/frame/StageFrame';
import { FloorRail, InfoCard, LegendChip, SystemsPicker } from '@/components/site/SiteControls';
import { Toggle } from '@/components/controls/Controls';
import { FcuPanel } from '@/components/site/FcuPanel';
import { Glyph } from '@/components/icons/Glyph';
import { BtuIcon, DropIcon, ElevatorIcon, PowerIcon } from '@/components/icons/UiIcons';
import { buildingById, OVERLAY_SYSTEMS, PLAN_DEVICES, type OverlaySystem, type PlanDevice } from '@/model/site';
import { useScenario } from '@/sim/scenario';
import { derivedSignal } from '@/sim/catalog';
import { useNow } from '@/sim/clock';
import { rand01 } from '@/sim/noise';
import { ahuById } from '@/model/galaxyBindings';
import { pointNumber, useGalaxyObject } from '@/gateway/galaxy';
import { fmt } from '@/utils/format';

const FCU_IDS = PLAN_DEVICES.filter((d) => d.system === 'hvac' && !d.equipment).map((d) => d.id);

/** Floor plan placement inside the stage frame (HVAC.svg: x 396, y 310, 1129×555). */
const PLAN = { x: 344, y: 104, w: 1129, h: 555 };

/** 3D View › A02 › floor: the plan, with one building system overlaid at a time. */
export default function FloorScreen() {
  const { building, floor } = useParams();
  const b = buildingById(building);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [system, setSystem] = useState<OverlaySystem>(() => (OVERLAY_SYSTEMS.some((o) => o.id === params.get('system')) ? (params.get('system') as OverlaySystem) : 'hvac'));
  const [selected, setSelected] = useState<string | null>(null);
  const f = b?.floors.find((x) => x.id === floor);
  if (!b || !f) return <Navigate to={b ? `/site/${b.id}` : '/'} replace />;

  // Live equipment appears on the floor its Galaxy object is assigned to (FAHU_001 → Roof_Floor).
  const devices = PLAN_DEVICES.filter((d) => d.system === system && (!d.equipment || ahuById(d.equipment)?.floor === floor));
  const pickSystem = (s: OverlaySystem) => {
    setSystem(s);
    setSelected(null);
  };

  return (
    <StageFrame crumbs={[{ label: b.label, to: `/site/${b.id}` }, { label: f.label }]}>
      <motion.div
        key={floor}
        className="absolute"
        style={{ left: PLAN.x, top: PLAN.y, width: PLAN.w, height: PLAN.h }}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        onClick={() => setSelected(null)}
      >
        <img src={floorplan} alt={`${b.label} ${f.label} floor plan`} draggable={false} className="absolute inset-0 h-full w-full" style={{ filter: 'drop-shadow(0 30px 40px rgba(0,0,0,0.55))' }} />
        <AnimatePresence mode="popLayout">
          {devices.map((d, i) => (
            <DeviceMarker key={`${floor}-${d.id}`} device={d} floor={f.id} index={i} selected={selected === d.id} onSelect={() => (d.equipment ? navigate(`/site/${b.id}/${f.id}/${d.equipment}`) : setSelected(d.id))} />
          ))}
        </AnimatePresence>
      </motion.div>

      <FloorRail floors={b.floors} active={f.id} onSelect={(id) => navigate(`/site/${b.id}/${id}`)} />
      <SystemsPicker value={system} onChange={pickSystem} />

      <AnimatePresence>
        {system === 'hvac' && selected?.startsWith('fcu') && (
          <FcuPanel
            key={selected}
            planId={`${b.id}-${f.id}-${selected}`}
            label={`${PLAN_DEVICES.find((d) => d.id === selected)!.label} · ${f.label}`}
            floor={f.id}
            markerIndex={FCU_IDS.indexOf(selected)}
            onClose={() => setSelected(null)}
          />
        )}
        {system === 'fire' && <FireChip key="fire" />}
        {system === 'dampers' && (
          <LegendChip key="dampers">
            <span className="text-accent">◆</span> Damper Status
            <span className="flex items-center gap-[6px] text-ok">
              <Dot color="#7fcf9d" /> Open
            </span>
            <span className="flex items-center gap-[6px] text-[#7a7c90]">
              <Dot color="#b5a8c0" /> Closed
            </span>
          </LegendChip>
        )}
      </AnimatePresence>
    </StageFrame>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full" style={{ background: `${color}33` }}>
      <span className="h-[8px] w-[8px] rounded-full" style={{ background: color }} />
    </span>
  );
}

function DeviceMarker({ device, floor, index, selected, onSelect }: { device: PlanDevice; floor: string; index: number; selected: boolean; onSelect: () => void }) {
  const fireActive = useScenario((st) => st.fire.active);
  const pos = { left: `${device.x}%`, top: `${device.y}%` };
  const anim = {
    initial: { opacity: 0, y: 10, scale: 0.8 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { delay: index * 0.05, type: 'spring' as const, stiffness: 380, damping: 26 },
  };

  if (device.system === 'dampers') return <DamperTag device={device} floor={floor} pos={pos} anim={anim} />;
  if (device.system === 'metering' && selected) return <MeterCard device={device} floor={floor} pos={pos} />;
  if (device.system === 'elevators' && selected) return <ElevatorCard device={device} floor={floor} pos={pos} />;
  if (device.equipment) return <AhuMarker device={device} pos={pos} anim={anim} onSelect={onSelect} />;

  const alarm = device.system === 'fire' && fireActive && (device.id === 'sd-05' || device.id === 'sd-06');
  const icon =
    device.system === 'hvac' ? <Glyph id="fan" size={16} color="#ffffff" /> : device.system === 'elevators' ? <ElevatorIcon size={16} className="text-white" /> : device.system === 'metering' ? <PowerIcon size={15} className="text-white" /> : <Glyph id="flame" size={14} color="#ffffff" />;

  return (
    <motion.button
      {...anim}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-[6px] rounded-full py-[4px] pl-[4px] pr-[10px] text-[12px] text-white"
      style={{
        ...pos,
        background: alarm ? 'rgba(217,107,132,0.9)' : selected ? 'rgba(181,140,227,0.95)' : 'rgba(13,8,18,0.85)',
        border: `1px solid ${alarm ? '#eaaab9' : selected ? '#ffffff' : 'rgba(181,140,227,0.7)'}`,
        boxShadow: alarm ? '0 0 16px #d96b84' : '0 6px 16px rgba(0,0,0,0.45)',
        animation: alarm ? 'pf-alarm-blink 0.9s infinite' : undefined,
      }}
    >
      <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full" style={{ background: alarm ? '#a9506a' : '#482a6a' }}>
        {icon}
      </span>
      {device.label}
    </motion.button>
  );
}

/* ---- HVAC -------------------------------------------------------------------------------------- */

function AhuMarker({ device, pos, anim, onSelect }: { device: PlanDevice; pos: React.CSSProperties; anim: object; onSelect: () => void }) {
  const unit = ahuById(device.equipment)!;
  const obj = useGalaxyObject(unit.galaxy);
  const running = (pointNumber(obj, unit.attrs.fanStatus) ?? 0) > 0;
  const supply = pointNumber(obj, unit.attrs.supplyTemp);
  return (
    <motion.button
      {...anim}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className="group absolute -translate-x-1/2 -translate-y-1/2"
      style={pos}
    >
      <span className="absolute left-1/2 top-1/2 h-[46px] w-[46px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/40" style={{ animation: 'pf-pulse-ring 2s ease-out infinite' }} />
      <span className="relative flex items-center gap-[8px] rounded-[8px] border border-accent bg-night-900/90 py-[6px] pl-[6px] pr-[12px] text-left shadow-[0_0_18px_rgba(157,120,255,0.5)] transition-transform group-hover:scale-105">
        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-accent">
          <motion.span animate={running ? { rotate: 360 } : { rotate: 0 }} transition={running ? { duration: 1.2, repeat: Infinity, ease: 'linear' } : {}}>
            <Glyph id="fan" size={20} color="#1b1200" />
          </motion.span>
        </span>
        <span>
          <span className="block text-[14px] leading-tight text-accent">{device.label}</span>
          <span className="block text-[11px] leading-tight text-ink-2">
            {obj?.status === 'live' ? `${running ? 'Running' : 'Stopped'} · ${fmt(supply, 1)}°C` : 'Connecting…'} · LIVE
          </span>
        </span>
      </span>
    </motion.button>
  );
}

/* ---- Dampers, elevators, metering, fire -------------------------------------------------------- */

function DamperTag({ device, floor, pos, anim }: { device: PlanDevice; floor: string; pos: React.CSSProperties; anim: object }) {
  const key = `${floor}-${device.id}`;
  const open = useScenario((s) => s.dampers[key] ?? rand01(device.id.length + device.x, 7) > 0.2);
  const setDamper = useScenario((s) => s.setDamper);
  return (
    <motion.div {...anim} className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-[8px] rounded-[8px] bg-white px-[8px] py-[4px] font-[family-name:var(--font-plain)] text-[12px] text-[#07050a] shadow-[0_6px_16px_rgba(0,0,0,0.4)]" style={pos} onClick={(e) => e.stopPropagation()}>
      <Dot color={open ? '#7fcf9d' : '#b5a8c0'} />
      {device.label}
      <Toggle on={open} onChange={(v) => setDamper(key, v)} label={`${device.label} ${open ? 'open' : 'closed'}`} />
    </motion.div>
  );
}

function ElevatorCard({ device, floor, pos }: { device: PlanDevice; floor: string; pos: React.CSSProperties }) {
  const now = useNow(3000);
  const s = derivedSignal(`elevator.${device.id}`, { low: 0, high: 5.99, profile: 'retail', noise: 0.6, drift: 3, decimals: 2 });
  const level = Math.floor(s.actual(now));
  const prev = Math.floor(s.actual(now - 3000));
  const alarm = device.id === 'elv-03' && new Date(now).getMinutes() % 10 < 3;
  const floors = ['GF', 'FF', 'F2', 'F3', 'R', 'UR'];
  const rows: [string, string, boolean?][] = [
    ['Status', alarm ? 'Alarm' : 'In Service', alarm],
    ['Car Position', floors[Math.max(0, Math.min(5, level))]],
    ['Direction', level > prev ? 'Up ▲' : level < prev ? 'Down ▼' : 'Idle'],
    ['Load', `${Math.round(Math.abs(s.actual(now) - level) * 90)}%`],
  ];
  return (
    <InfoCard
      title={
        <>
          <span className="text-accent">◆</span> {device.label}
        </>
      }
      className="w-[240px] -translate-x-1/2 -translate-y-full"
      style={{ ...pos, marginTop: -10 }}
    >
      {rows.map(([k, v, bad]) => (
        <div key={k} className="flex items-center justify-between py-[4px] text-[13px]">
          <span>{k}</span>
          <span className="min-w-[120px] rounded-[8px] border px-[8px] py-[2px] text-center" style={{ borderColor: bad ? '#d96b84' : '#b58ce3', color: bad ? '#d96b84' : '#482a6a', fontWeight: bad ? 600 : 400 }}>
            {v}
          </span>
        </div>
      ))}
      <p className="pt-[4px] text-[10px] text-[#bbaacb]">Floor {floor.toUpperCase()} landing</p>
    </InfoCard>
  );
}

function MeterCard({ device, floor, pos }: { device: PlanDevice; floor: string; pos: React.CSSProperties }) {
  const now = useNow(5000);
  const base = `meter.${floor}.${device.id}`;
  const btu = derivedSignal(`${base}.btu`, { low: 600, high: 1400, profile: 'hvac', noise: 0.06, decimals: 0 }).actual(now);
  const m3 = derivedSignal(`${base}.m3`, { low: 700, high: 1300, profile: 'retail', noise: 0.05, decimals: 0 }).actual(now);
  const kw = derivedSignal(`${base}.kw`, { low: 500, high: 1500, profile: 'retail', noise: 0.05, decimals: 0 }).actual(now);
  return (
    <InfoCard
      title={
        <Link to="/metering/energy" className="flex items-center gap-[6px] text-[14px] hover:underline">
          Location <span className="text-accent">↗</span>
        </Link>
      }
      className="w-[190px] -translate-x-1/2 -translate-y-full"
      style={{ ...pos, marginTop: -10 }}
    >
      <p className="mb-[4px] text-[11px] text-[#bbaacb]">{device.label}</p>
      {(
        [
          [<BtuIcon key="b" size={14} className="text-[#b378f8]" />, `${fmt(btu)} BTU`],
          [<DropIcon key="d" size={14} className="text-[#6b8cff]" />, `${fmt(m3)} m³`],
          [<PowerIcon key="p" size={14} className="text-accent" />, `${fmt(kw)} kW`],
        ] as const
      ).map(([icon, text], i) => (
        <div key={i} className="flex items-center justify-between py-[3px] text-[13px]">
          {icon}
          <span>{text}</span>
        </div>
      ))}
    </InfoCard>
  );
}

function FireChip() {
  const active = useScenario((s) => s.fire.active);
  return (
    <LegendChip>
      <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-[#e6e7ff]">
        <Glyph id="fire" size={20} color={active ? '#d96b84' : '#482a6a'} />
      </span>
      Fire Alarm System
      <span className={`flex items-center gap-[8px] ${active ? 'text-alarm' : 'text-ok'}`} style={active ? { animation: 'pf-alarm-blink 0.9s infinite' } : undefined}>
        <Dot color={active ? '#d96b84' : '#7fcf9d'} /> {active ? 'Alarm' : 'Normal'}
      </span>
    </LegendChip>
  );
}
