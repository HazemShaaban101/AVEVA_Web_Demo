import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import site from '@/assets/renders/site.webp';
import { Panel } from '@/components/frame/Panel';
import { CardIcon, CalendarIcon, FilterLinesIcon, LeafIcon, ParkingIcon, PowerIcon } from '@/components/icons/UiIcons';
import { ArcGauge, BarMeter, DialGauge } from '@/components/gauges/Gauges';
import { AnimatedNumber } from '@/components/gauges/AnimatedNumber';
import { PairedBarChart } from '@/components/charts/PairedBarChart';
import { KeyValues, KpiBody } from '@/widgets/Widgets';
import { BUILDINGS, type Building } from '@/model/site';
import { useSignal } from '@/sim/useSignal';
import { scopedSignal, useScope, useScopeStore, BUILDING_SHARE } from '@/sim/scope';
import { useNow } from '@/sim/clock';
import { useScenario } from '@/sim/scenario';
import { fmt } from '@/utils/format';
import { useHomeUi } from '@/components/chrome/ScopeBar';

const PARKING_CAPACITY = 1850;

/**
 * 3D View — the whole site at night. The render settles in, the KPI panels slide in from the edges
 * (as in the prototype), and every building lights up cyan on hover. Clicking a building scopes the
 * KPIs to it (the same scope as the switcher under the wordmark); clicking it again, or the ground,
 * goes back to the entire project.
 */
export default function CampusScreen() {
  const overlays = useHomeUi((st) => st.kpis);
  const [hover, setHover] = useState<Building | null>(null);
  const scope = useScope();
  const setScope = useScopeStore((s) => s.setScope);
  const fire = useScenario((s) => s.fire.active);
  const selected = BUILDINGS.find((b) => b.id === scope) ?? null;

  const pick = (b: Building) => setScope(scope === b.id ? 'project' : b.id);

  return (
    <>
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.08, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: '50% 55%' }}
      >
        <img
          src={site}
          alt="Site"
          draggable={false}
          className="absolute inset-0 h-full w-full"
          style={{
            maskImage: 'radial-gradient(ellipse 46% 50% at 50% 46%, #000 62%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 46% 50% at 50% 46%, #000 62%, transparent 100%)',
          }}
        />
        <svg className="absolute inset-0" width={1920} height={1080}>
          {/* The ground: clicking off the buildings returns the KPIs to the whole project. */}
          <rect width={1920} height={1080} fill="transparent" onClick={() => setScope('project')} />
          {BUILDINGS.map((b) => {
            const on = selected?.id === b.id;
            const lit = on || hover?.id === b.id;
            const alarm = fire && (b.id === 'a01' || b.id === 'a02');
            return (
              <path
                key={b.id}
                d={b.outline}
                onMouseEnter={() => setHover(b)}
                onMouseLeave={() => setHover((h) => (h?.id === b.id ? null : h))}
                onClick={() => pick(b)}
                // Keyboard: Tab through the buildings (focus shows the same highlight and card as hover).
                role="button"
                tabIndex={0}
                aria-label={`Show KPIs for building ${b.label}`}
                aria-pressed={on}
                onFocus={() => setHover(b)}
                onBlur={() => setHover((h) => (h?.id === b.id ? null : h))}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return;
                  e.preventDefault();
                  pick(b);
                }}
                fill={alarm ? '#ef4444' : '#4fdcff'}
                fillOpacity={alarm ? 0.35 : on ? 0.34 : lit ? 0.24 : 0.001}
                stroke={alarm ? '#ef4444' : '#4fdcff'}
                strokeOpacity={alarm || lit ? 1 : 0}
                strokeWidth={on ? 3 : 2}
                strokeLinejoin="round"
                style={{ cursor: 'pointer', outline: 'none', transition: 'fill-opacity .25s, stroke-opacity .25s', animation: alarm ? 'pf-alarm-blink 1s infinite' : undefined, filter: on ? 'drop-shadow(0 0 10px rgba(79,220,255,0.7))' : undefined }}
              />
            );
          })}
        </svg>
        <AnimatePresence>
          {selected && hover?.id !== selected.id && <SelectedPin key={selected.id} b={selected} onClear={() => setScope('project')} />}
        </AnimatePresence>
        <AnimatePresence>{hover && <BuildingTip b={hover} selected={hover.id === selected?.id} />}</AnimatePresence>
      </motion.div>

      <AnimatePresence>{overlays && <KpiOverlay />}</AnimatePresence>

    </>
  );
}

/** The label over the building the KPIs describe, with a way back to the whole project. */
function SelectedPin({ b, onClear }: { b: Building; onClear: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="pf-chip absolute z-20 flex -translate-x-1/2 -translate-y-full items-center gap-[8px] border border-accent bg-night-900/90 py-[4px] pl-[12px] pr-[4px] text-[14px] text-white backdrop-blur"
      style={{ left: b.anchor.x, top: b.anchor.y - 12 }}
    >
      <span className="h-[8px] w-[8px] rounded-full bg-accent" style={{ boxShadow: '0 0 8px #4fdcff' }} />
      KPIs for <span className="text-accent">{b.label}</span>
      <button onClick={onClear} className="flex h-[24px] w-[24px] items-center justify-center rounded-full text-ink-3 hover:bg-white/10 hover:text-white" title="Back to the entire project" aria-label="Back to the entire project">
        ✕
      </button>
    </motion.div>
  );
}

function BuildingTip({ b, selected }: { b: Building; selected: boolean }) {
  const occ = useSignal('community.visitors', 5000).value;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      // Towers reach up to the header: their card sits beside the top instead of above it.
      className={`pf-panel pf-panel-solid pointer-events-none absolute z-20 w-[260px] px-[16px] py-[12px] text-white ${b.anchor.y < 380 ? '' : '-translate-x-1/2 -translate-y-full'}`}
      style={b.anchor.y < 380 ? { left: b.anchor.x + 44, top: b.anchor.y - 6 } : { left: b.anchor.x, top: b.anchor.y - 16 }}
    >
      <p className="flex items-center justify-between text-[17px] font-medium">
        {b.label}
        <span className="rounded-[8px] border border-accent/40 bg-accent/10 px-[7px] py-[1px] text-[11px] font-medium text-accent">{b.floors.length} floors</span>
      </p>
      <p className="mt-[2px] text-[12px] text-ink-3">{b.use}</p>
      <p className="mt-[6px] text-[12px] text-ink-2">~{fmt(occ * (b.detailed ? 0.18 : 0.1))} people on site</p>
      <p className="mt-[4px] text-[12px] font-medium text-accent">{selected ? 'Click again for the entire project' : 'Click to show this building\u2019s KPIs'}</p>
    </motion.div>
  );
}

/* ---- KPI overlay (Frame 488) ------------------------------------------------------------------ */

function KpiOverlay() {
  const navigate = useNavigate();
  const go = (to: string) => () => navigate(to);
  const scope = useScope();
  const capacity = PARKING_CAPACITY * (scope === 'project' ? 1 : (BUILDING_SHARE[scope] ?? 0.1));
  return (
    <motion.div className="pointer-events-none absolute inset-0 [&>section]:pointer-events-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.4 }}>
      <Panel frame={{ x: 52, y: 201, w: 302, h: 245 }} index={4} icon={<CardIcon />} title="Elevator Performance" subtitle="Comparative Analysis of Car Occupancy">
        <Elevators />
      </Panel>
      <Panel frame={{ x: 52, y: 471, w: 302, h: 395 }} index={5} icon={<FilterLinesIcon />} title="Air Quality Index" subtitle="Environmental Health & Filtration System">
        <AirQuality />
      </Panel>
      <Panel frame={{ x: 1566, y: 196, w: 302, h: 256 }} index={6} icon={<CalendarIcon />} onClick={go('/metering/water')} hint="Open Metering › Water" title="Weekly Consumption" subtitle="Comparative Analysis">
        <WeeklyConsumption />
      </Panel>
      <Panel frame={{ x: 1566, y: 477, w: 302, h: 390 }} index={7} icon={<CardIcon />} onClick={go('/electric/transformers')} hint="Open Electric › Transformers" title="Power Infrastructure" subtitle="Main High-Voltage Transformer Load">
        <PowerInfra />
      </Panel>
      <Panel frame={{ x: 52, y: 891, w: 339, h: 155 }} index={8} icon={<PowerIcon />} onClick={go('/metering/energy')} hint="Open Metering › Energy" title={scope === 'project' ? 'Total Site Power' : 'Building Power'} subtitle="Measures the live electrical load">
        <KpiBody
          source={{ sim: 'site.power' }}
          decimals={scope === 'project' ? 1 : 0}
          unit={scope === 'project' ? 'mw' : 'kw'}
          note={(v, p) => {
            const d = v !== null && p ? Math.round(((v - p) / p) * 100) : 0;
            return `${d >= 0 ? '+' : ''}${d}% from avg`;
          }}
        />
      </Panel>
      <Panel frame={{ x: 424, y: 891, w: 370, h: 155 }} index={9} icon={<CardIcon />} onClick={go('/metering/btu')} hint="Open Metering › BTU" title="HVAC Efficiency" subtitle="Monitors the Coefficient of Performance (COP)">
        <KpiBody source={{ sim: 'site.hvacCop' }} decimals={1} unit="COP" note={(v) => ((v ?? 0) >= 4.5 ? 'Optimal Range' : 'Below Optimal')} />
      </Panel>
      <Panel frame={{ x: 827, y: 891, w: 338, h: 155 }} index={10} icon={<ParkingIcon />} onClick={go('/security/parking')} hint="Open Security › Parking" title="Parking Spots" subtitle="Real-time tracking of vacant spots">
        <KpiBody source={{ sim: 'site.parkingFree' }} decimals={0} unit="Free" note={(v) => `${Math.round((1 - (v ?? 0) / capacity) * 100)}% Occupancy`} />
      </Panel>
      <Panel frame={{ x: 1198, y: 891, w: 670, h: 155 }} index={11} icon={<LeafIcon />} onClick={go('/metering/analytics')} hint="Open Metering › Energy Analytics" title="Sustainability Index">
        <Sustainability />
      </Panel>
    </motion.div>
  );
}

function Elevators() {
  const avg = useSignal('elevator.avg', 4000).value;
  const peak = useSignal('elevator.peak', 4000).value;
  return (
    <div className="px-[16px]">
      <BarMeter width={196} rows={[{ label: 'AVG', value: avg, color: '#4fc3d4' }, { label: 'Peak', value: peak, color: '#4fdcff' }]} />
    </div>
  );
}

function AirQuality() {
  const co2 = useSignal('env.co2', 4000).value;
  return (
    <div className="flex h-full flex-col">
      <div className="flex justify-center">
        <DialGauge value={co2} min={0} max={800} unit="PPM" size={172} />
      </div>
      <span className="mx-[16px] mb-[10px] h-px bg-white/15" />
      <KeyValues
        dense
        rows={[
          { label: 'Relative Humidity', source: { sim: 'env.humidity' }, unit: '%' },
          { label: 'Oxygen Level', source: { sim: 'env.oxygen' }, decimals: 1, unit: '%' },
          { label: 'PM Index', source: { sim: 'env.pm25' }, unit: 'µg/m³' },
          { label: 'Filter Status', text: 'Clean' },
        ]}
      />
    </div>
  );
}

function WeeklyConsumption() {
  const now = useNow(60_000);
  const scope = useScope();
  const irrigation = scopedSignal('water.irrigation.daily', scope);
  const water = scopedSignal('water.consumption.daily', scope);
  const days = Array.from({ length: 7 }, (_, i) => {
    const t = now - (6 - i) * 86_400_000;
    return {
      label: new Date(t).toLocaleDateString('en-US', { weekday: 'short' }),
      a: irrigation.actual(t),
      b: water.actual(t),
    };
  });
  return (
    <div className="absolute inset-x-[14px] bottom-[8px] top-[4px]">
      <PairedBarChart data={days} names={{ a: 'Irrigation', b: 'Water' }} unit="m³" compact />
    </div>
  );
}

function PowerInfra() {
  const kpi = useSignal('power.transformerKpi', 4000).value;
  return (
    <div className="flex h-full flex-col">
      <div className="flex justify-center">
        <ArcGauge value={kpi} size={210} />
      </div>
      <span className="mx-[16px] mb-[10px] h-px bg-white/15" />
      <KeyValues
        dense
        rows={[
          { label: 'Active Power', source: { sim: 'power.active' }, unit: 'kw' },
          { label: 'Reactive Power', source: { sim: 'power.reactive' }, unit: 'kVAR' },
          { label: 'Peak Today', text: `${Math.round(Math.max(kpi, 88))}%` },
          { label: 'Status', text: kpi < 90 ? 'Optimal' : 'High Load' },
        ]}
      />
    </div>
  );
}

function Sustainability() {
  const energy = useSignal('site.energyToday', 10_000);
  const water = useSignal('site.waterToday', 10_000);
  return (
    <div className="flex h-full items-center px-[18px]">
      <SustainPart label="Energy Consumption" value={energy.value} unit={energy.unit} decimals={energy.unit === 'MWh' ? 1 : 0} pct={88} color="#4fdcff" />
      <span className="mx-[28px] h-[70px] w-px bg-white/15" />
      <SustainPart label="Water Consumption" value={water.value} unit="m³" decimals={0} pct={24} color="#4fc3d4" />
    </div>
  );
}

function SustainPart({ label, value, unit, decimals, pct, color }: { label: string; value: number; unit: string; decimals: number; pct: number; color: string }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-1 items-center">
      <div>
        <p className="text-[15px] text-[#79a4aa]">{label}</p>
        <p className="mt-[4px] leading-none text-white">
          <span className="text-[50px] font-medium">
            <AnimatedNumber value={value} decimals={decimals} />
          </span>
          <span className="ml-[6px] text-[20px] text-[#79a4aa]">{unit}</span>
        </p>
      </div>
      <svg width={80} height={80} viewBox="0 0 80 80" className="ml-auto">
        <circle cx={40} cy={40} r={36} fill="#062427" />
        <circle cx={40} cy={40} r={r} fill="none" stroke="#12393d" strokeWidth={5} />
        <motion.circle
          cx={40}
          cy={40}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct / 100) }}
          transition={{ duration: 1.2, delay: 0.8 }}
          style={{ filter: `drop-shadow(0 0 5px ${color})` }}
        />
        <text x={40} y={38} fill="#fff" fontSize={16} textAnchor="middle">
          {pct}%
        </text>
        <text x={40} y={52} fill="#9a9a9a" fontSize={9} textAnchor="middle">
          Total
        </text>
      </svg>
    </div>
  );
}
