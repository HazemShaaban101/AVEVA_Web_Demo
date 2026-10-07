import { useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import site from '@/assets/renders/site.webp';
import { Panel } from '@/components/frame/Panel';
import { CameraIcon, CardIcon, DropIcon, FilterLinesIcon, LeafIcon, ParkingIcon, PeopleIcon, PowerIcon, TicketIcon } from '@/components/icons/UiIcons';
import { Glyph } from '@/components/icons/Glyph';
import { ArcGauge, DialGauge } from '@/components/gauges/Gauges';
import { AnimatedNumber } from '@/components/gauges/AnimatedNumber';
import { PairedBarChart } from '@/components/charts/PairedBarChart';
import { TONE_COLOR, type Tone } from '@/components/controls/Controls';
import { Tag } from '@/components/data/DataTable';
import { KpiBody } from '@/widgets/Widgets';
import { BUILDINGS, type Building } from '@/model/site';
import { deviceValues, devicesOf } from '@/model/assets/fireAlarm';
import { PERIODS, useSignal, type Period } from '@/sim/useSignal';
import { scopedSignal, useScope, useScopeStore, BUILDING_SHARE } from '@/sim/scope';
import { useNow } from '@/sim/clock';
import { useScenario } from '@/sim/scenario';
import { fmt } from '@/utils/format';
import { useHomeUi } from '@/components/chrome/ScopeBar';
import { useTicketSummary } from '@/screens/maintenance/MaintenanceScreens';

const PARKING_CAPACITY = 1850;
const LAMPS = 148;
const CAMERAS = 320;
const BINS = 64;
const RED = '#d96b84';
const AMBER = '#e8a98c';

/** A building the simulations have put into trouble: a fire alarm or a forced door (red), or a utility failure (amber). */
type SimState = 'fire' | 'intrusion' | 'power' | null;

/**
 * 3D View — the whole site at night. The render settles in, the KPI panels slide in from the edges
 * (as in the prototype), and every building lights up on hover. Clicking a building scopes the
 * KPIs to it (the same scope as the switcher under the wordmark); clicking it again, or the ground,
 * goes back to the entire project. The simulations (fire alarm, forced door, utility failure) show
 * here too: the buildings concerned glow red or amber.
 */
export default function CampusScreen() {
  const overlays = useHomeUi((st) => st.kpis);
  const [hover, setHover] = useState<Building | null>(null);
  const scope = useScope();
  const setScope = useScopeStore((s) => s.setScope);
  const fire = useScenario((s) => s.fire.active);
  const intrusion = useScenario((s) => s.intrusion);
  const mainsFailed = useScenario((s) => s.mains.failed);
  const selected = BUILDINGS.find((b) => b.id === scope) ?? null;

  const pick = (b: Building) => setScope(scope === b.id ? 'project' : b.id);
  const simState = (b: Building): SimState => (fire && (b.id === 'a01' || b.id === 'a02') ? 'fire' : intrusion.active && intrusion.building === b.id ? 'intrusion' : mainsFailed ? 'power' : null);

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
        />
        <svg className="absolute inset-0" width={1920} height={1080}>
          {/* The ground: clicking off the buildings returns the KPIs to the whole project. */}
          <rect width={1920} height={1080} fill="transparent" onClick={() => setScope('project')} />
          {BUILDINGS.map((b) => {
            const on = selected?.id === b.id;
            const lit = on || hover?.id === b.id;
            const sim = simState(b);
            const alarm = sim !== null;
            const color = sim === 'power' ? AMBER : alarm ? RED : '#9d78ff';
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
                fill={color}
                fillOpacity={alarm ? (sim === 'power' ? 0.22 : 0.35) : on ? 0.34 : lit ? 0.24 : 0.001}
                stroke={color}
                strokeOpacity={alarm || lit ? 1 : 0}
                strokeWidth={on ? 3 : 2}
                strokeLinejoin="round"
                style={{ cursor: 'pointer', outline: 'none', transition: 'fill-opacity .25s, stroke-opacity .25s', animation: alarm ? 'pf-alarm-blink 1s infinite' : undefined, filter: on ? `drop-shadow(0 0 10px ${color}b3)` : undefined }}
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
      <span className="h-[8px] w-[8px] rounded-full bg-accent" style={{ boxShadow: '0 0 8px #9d78ff' }} />
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
      <p className="mt-[4px] text-[12px] font-medium text-accent">{selected ? 'Click again for the entire project' : 'Click to show this building’s KPIs'}</p>
    </motion.div>
  );
}

/* ---- KPI overlay (Frame 488) ------------------------------------------------------------------ */

/** Healthy values stay white; only a warning (amber) or an alarm (red) takes a colour. */
const colorOf = (t: Tone) => (t === 'warn' || t === 'bad' ? TONE_COLOR[t] : '#ffffff');

function KpiOverlay() {
  const navigate = useNavigate();
  const go = (to: string) => () => navigate(to);
  const scope = useScope();
  const fire = useScenario((s) => s.fire.active);
  const mainsFailed = useScenario((s) => s.mains.failed);
  const share = scope === 'project' ? 1 : (BUILDING_SHARE[scope] ?? 0.1);
  const capacity = PARKING_CAPACITY * share;
  return (
    <motion.div className="pointer-events-none absolute inset-0 [&>section]:pointer-events-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.4 }}>
      <Panel frame={{ x: 52, y: 196, w: 302, h: 350 }} index={4} icon={<FilterLinesIcon />} title="Air Quality Index" subtitle="Environmental Health">
        <AirQuality />
      </Panel>
      <Panel frame={{ x: 52, y: 562, w: 302, h: 160 }} index={5} icon={<Glyph id="building" size={18} color="#ffffff" />} title="IBMS Health" subtitle="Building status across the site">
        <IbmsHealth />
      </Panel>
      <Panel frame={{ x: 52, y: 742, w: 302, h: 124 }} index={6} icon={<TicketIcon />} onClick={go('/maintenance/ticketing')} hint="Open Maintenance › Ticketing" title="Ticketing" subtitle="Work orders">
        <Ticketing />
      </Panel>

      <Panel frame={{ x: 1566, y: 196, w: 302, h: 270 }} index={7} icon={<DropIcon />} onClick={go('/metering/water')} hint="Open Metering › Water" title="Water Consumption" subtitle="Domestic vs Irrigation">
        <WaterConsumption />
      </Panel>
      <Panel frame={{ x: 1566, y: 486, w: 302, h: 380 }} index={8} icon={<CardIcon />} onClick={go('/electric/transformers')} hint="Open Electric › Transformers" title="Power Infrastructure" subtitle="Main High-Voltage Transformer Load">
        <PowerInfra />
      </Panel>

      <Panel frame={{ x: 52, y: 891, w: 280, h: 155 }} index={9} icon={<PowerIcon />} onClick={go('/metering/energy')} hint="Open Metering › Energy" title={scope === 'project' ? 'Total Site Power' : 'Building Power'} subtitle="Live electrical load">
        <KpiBody
          source={{ sim: 'site.power' }}
          decimals={scope === 'project' ? 1 : 0}
          unit={scope === 'project' ? 'mw' : 'kw'}
          tone={(v) => (mainsFailed ? 'bad' : v === null ? 'neutral' : v / (scope === 'project' ? 4.6 : 4600 * share) < 1.05 ? 'good' : v / (scope === 'project' ? 4.6 : 4600 * share) < 1.15 ? 'warn' : 'bad')}
          note={(v, p) => {
            const d = v !== null && p ? Math.round(((v - p) / p) * 100) : 0;
            return `${d >= 0 ? '+' : ''}${d}% from avg`;
          }}
        />
      </Panel>
      <Panel frame={{ x: 352, y: 891, w: 280, h: 155 }} index={10} icon={<ParkingIcon />} onClick={go('/security/parking')} hint="Open Security › Parking" title="Smart Parking" subtitle="Real-time vacant spots">
        <KpiBody
          source={{ sim: 'site.parkingFree' }}
          decimals={0}
          unit="Free"
          tone={(v) => (v === null ? 'neutral' : 1 - v / capacity < 0.92 ? 'good' : 1 - v / capacity < 0.98 ? 'warn' : 'bad')}
          note={(v) => `${Math.round((1 - (v ?? 0) / capacity) * 100)}% full`}
        />
      </Panel>
      <Panel frame={{ x: 652, y: 891, w: 440, h: 155 }} index={11} icon={<CameraIcon />} onClick={go('/security/cctv')} hint="Open Security › CCTV" title="External Infrastructure">
        <ExternalInfra />
      </Panel>
      <Panel frame={{ x: 1112, y: 891, w: 330, h: 155 }} index={12} icon={<PeopleIcon />} onClick={go('/community/application')} hint="Open Community › Application" title="Community" subtitle="Visitors & app activity">
        <Community />
      </Panel>
      <Panel frame={{ x: 1462, y: 891, w: 406, h: 155 }} index={13} icon={<LeafIcon />} onClick={go('/metering/analytics')} hint="Open Metering › Energy Analytics" title="Sustainability Index">
        <Sustainability />
      </Panel>

      <AnimatePresence>{fire && <FireDashboard key="fire" onOpen={go('/fire/system')} />}</AnimatePresence>
    </motion.div>
  );
}

/** A label / value line whose value takes the colour of its status. */
function ToneRow({ label, value, tone = 'neutral' }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-[#d0c0df]">{label}</dt>
      <dd className="tabular-nums" style={{ color: colorOf(tone) }}>
        {value}
      </dd>
    </div>
  );
}

function AirQuality() {
  const co2 = useSignal('env.co2', 4000).value;
  const humidity = useSignal('env.humidity', 4000).value;
  const oxygen = useSignal('env.oxygen', 4000).value;
  const pm = useSignal('env.pm25', 4000).value;
  const voc = useSignal('env.voc', 4000).value;
  const co2Tone: Tone = co2 < 550 ? 'good' : co2 < 700 ? 'warn' : 'bad';
  return (
    <div className="flex h-full flex-col">
      <div className="flex justify-center">
        <DialGauge value={co2} min={0} max={800} unit="PPM" size={118} tone={co2Tone} />
      </div>
      <span className="mx-[16px] mb-[6px] h-px bg-white/15" />
      <dl className="flex flex-col gap-[5px] px-[18px] text-[14px]">
        <ToneRow label="Relative Humidity" value={`${fmt(humidity)} %`} tone={humidity >= 30 && humidity <= 60 ? 'good' : 'warn'} />
        <ToneRow label="Oxygen Level" value={`${fmt(oxygen, 1)} %`} tone={oxygen >= 20.5 ? 'good' : 'bad'} />
        <ToneRow label="PM Index" value={`${fmt(pm)} µg/m³`} tone={pm < 12 ? 'good' : pm < 25 ? 'warn' : 'bad'} />
        <ToneRow label="VOC" value={`${fmt(voc)} ppb`} tone={voc < 150 ? 'good' : voc < 250 ? 'warn' : 'bad'} />
        <ToneRow label="Filter Status" value="Clean" tone="good" />
      </dl>
    </div>
  );
}

/** One health light per building: Healthy, or Fault while a fire, a forced door or an HVAC trip is active. */
function IbmsHealth() {
  const fire = useScenario((s) => s.fire.active);
  const intrusion = useScenario((s) => s.intrusion);
  const faults: Record<string, string> = { b03: 'AHU-03 supply fan trip' };
  if (fire) faults.a01 = faults.a02 = 'Fire alarm';
  if (intrusion.active) faults[intrusion.building] = 'Door forced';
  const bad = BUILDINGS.filter((b) => faults[b.id]).length;
  return (
    <div className="px-[16px] pb-[10px]">
      <div className="grid grid-cols-4 gap-[6px]">
        {BUILDINGS.map((b) => {
          const f = faults[b.id];
          return (
            <span
              key={b.id}
              title={f ? `${b.label}: ${f}` : `${b.label}: healthy`}
              className="flex items-center justify-center gap-[5px] rounded-[8px] border py-[4px] text-[13px]"
              style={f ? { borderColor: `${RED}99`, background: `${RED}1f`, color: '#eaaab9' } : { borderColor: 'rgba(157,120,255,0.25)', background: 'rgba(157,120,255,0.06)', color: '#d9cbe6' }}
            >
              <span className="h-[6px] w-[6px] rounded-full" style={{ background: 'currentColor', boxShadow: '0 0 6px currentColor', animation: f ? 'pf-alarm-blink 1.2s infinite' : undefined }} />
              {b.label}
            </span>
          );
        })}
      </div>
      <p className="mt-[6px] text-[12px]" style={{ color: bad ? '#eaaab9' : '#bbaacb' }}>
        {bad ? `${bad} of ${BUILDINGS.length} with a fault` : `All ${BUILDINGS.length} buildings healthy`}
      </p>
    </div>
  );
}

function Ticketing() {
  const t = useTicketSummary();
  const cell = (label: string, n: number, color: string) => (
    <div className="flex flex-1 flex-col items-center">
      <span className="text-[34px] font-medium leading-none tabular-nums" style={{ color }}>
        {n}
      </span>
      <span className="mt-[4px] text-[13px] text-ink-3">{label}</span>
    </div>
  );
  return (
    <div className="flex h-full items-center px-[10px] pb-[12px]">
      {cell('Open', t.open, '#ffffff')}
      <span className="h-[44px] w-px bg-white/15" />
      {cell('Overdue', t.overdue, t.overdue ? RED : '#ffffff')}
      <span className="h-[44px] w-px bg-white/15" />
      {cell('Closed', t.closed, '#ffffff')}
    </div>
  );
}

/** Water infrastructure only: domestic against irrigation, by hour, day or month. */
function WaterConsumption() {
  const scope = useScope();
  const [period, setPeriod] = useState<Period>('week');
  const now = useNow(600_000);
  const p = PERIODS[period];
  const data = useMemo(() => {
    const dom = scopedSignal('water.consumption.daily', scope).series(now, p.count, p.stepMs, p.label);
    const irr = scopedSignal('water.irrigation.daily', scope).series(now, p.count, p.stepMs, p.label);
    const k = period === 'day' ? 1 / 24 : 1;
    return dom.map((d, i) => ({ label: d.label, a: d.actual * k, b: irr[i].actual * k }));
  }, [scope, now, p, period]);
  const unit = period === 'day' ? 'm³/h' : 'm³';
  return (
    <>
      <div className="absolute left-[16px] top-[2px] z-10 flex gap-[6px]" onClick={(e) => e.stopPropagation()}>
        {(['day', 'week', 'month'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setPeriod(k)}
            className={`pf-chip h-[22px] px-[9px] text-[11px] font-medium transition-colors ${period === k ? 'border border-accent/70 bg-accent/20 text-accent' : 'border border-white/10 text-ink-3 hover:text-white'}`}
          >
            {k === 'day' ? 'Daily' : k === 'week' ? 'Weekly' : 'Monthly'}
          </button>
        ))}
      </div>
      <div className="absolute inset-x-[14px] bottom-[6px] top-[26px]">
        <PairedBarChart data={data} names={{ a: 'Domestic', b: 'Irrigation' }} unit={unit} compact barWidth={period === 'month' ? 3 : period === 'day' ? 4 : 7} labelEvery={period === 'month' ? 5 : period === 'day' ? 4 : 1} />
      </div>
    </>
  );
}

function PowerInfra() {
  const kpi = useSignal('power.transformerKpi', 4000).value;
  const mainsFailed = useScenario((s) => s.mains.failed);
  const tone: Tone = mainsFailed ? 'bad' : kpi < 85 ? 'good' : kpi < 95 ? 'warn' : 'bad';
  const status: [string, Tone] = mainsFailed ? ['Utility lost · on generators', 'bad'] : kpi < 85 ? ['Optimal', 'good'] : kpi < 95 ? ['High Load', 'warn'] : ['Overload', 'bad'];
  const active = useSignal('power.active', 4000);
  const reactive = useSignal('power.reactive', 4000);
  return (
    <div className="flex h-full flex-col">
      <div className="flex justify-center">
        <ArcGauge value={kpi} size={210} tone={tone} />
      </div>
      <span className="mx-[16px] mb-[10px] h-px bg-white/15" />
      <dl className="flex flex-col gap-[9px] px-[18px] text-[15px]">
        <ToneRow label="Active Power" value={`${fmt(active.value)} kw`} />
        <ToneRow label="Reactive Power" value={`${fmt(reactive.value)} kVAR`} />
        <ToneRow label="Peak Today" value={`${Math.round(Math.max(kpi, 88))}%`} tone={Math.max(kpi, 88) < 90 ? 'good' : 'warn'} />
        <ToneRow label="Status" value={status[0]} tone={status[1]} />
      </dl>
    </div>
  );
}

/** Street lighting, CCTV cameras and smart garbage bins: the systems outside the buildings. */
function ExternalInfra() {
  const lamps = useSignal('infra.lightsOn', 10_000, { global: true }).value;
  const cams = useSignal('infra.cctvOnline', 10_000, { global: true }).value;
  const bins = useSignal('infra.binsFull', 10_000, { global: true }).value;
  const faulty = 3;
  const cell = (label: string, value: number, of: number | null, tone: Tone, note: string) => (
    <div className="flex flex-1 flex-col items-center text-center">
      <span className="text-[13px] text-ink-3">{label}</span>
      <span className="mt-[2px] text-[34px] font-medium leading-none tabular-nums" style={{ color: colorOf(tone) }}>
        <AnimatedNumber value={value} decimals={0} />
        {of !== null && <span className="ml-[3px] text-[15px] text-ink-3">/{of}</span>}
      </span>
      <span className="mt-[5px] text-[12px]" style={{ color: tone === 'good' ? '#9a85b0' : colorOf(tone) }}>
        {note}
      </span>
    </div>
  );
  const camPct = (cams / CAMERAS) * 100;
  return (
    <div className="flex h-full items-center px-[10px] pb-[12px]">
      {cell('Street Lighting', lamps, LAMPS, 'good', `${faulty} lamps faulty`)}
      <span className="h-[64px] w-px bg-white/15" />
      {cell('CCTV Online', cams, CAMERAS, camPct >= 90 ? 'good' : camPct >= 80 ? 'warn' : 'bad', `${CAMERAS - Math.round(cams)} offline`)}
      <span className="h-[64px] w-px bg-white/15" />
      {cell('Smart Bins', bins, BINS, bins < 16 ? 'good' : bins < 24 ? 'warn' : 'bad', 'need collection')}
    </div>
  );
}

function Community() {
  const visitors = useSignal('community.visitors', 5000);
  const users = useSignal('community.activeUsers', 5000);
  const sentiment = useSignal('community.sentiment', 10_000, { global: true }).value;
  return (
    <div className="flex h-full items-center px-[16px] pb-[12px]">
      <div className="flex flex-col">
        <span className="text-[38px] font-medium leading-none tabular-nums text-white">
          <AnimatedNumber value={visitors.value} decimals={0} />
        </span>
        <span className="mt-[4px] text-[13px] text-ink-3">Visitors on site</span>
      </div>
      <span className="mx-[16px] h-[64px] w-px bg-white/15" />
      <dl className="flex flex-1 flex-col gap-[6px] text-[14px]">
        <ToneRow label="App users" value={fmt(users.value)} />
        <ToneRow label="Sentiment" value={`${fmt(sentiment)}%`} tone={sentiment >= 80 ? 'good' : sentiment >= 70 ? 'warn' : 'bad'} />
      </dl>
    </div>
  );
}

function Sustainability() {
  const energy = useSignal('site.energyToday', 10_000);
  const water = useSignal('site.waterToday', 10_000);
  return (
    <div className="flex h-full items-center px-[14px]">
      <SustainPart label="Energy" value={energy.value} unit={energy.unit} decimals={energy.unit === 'MWh' ? 1 : 0} pct={88} color="#9d78ff" />
      <span className="mx-[14px] h-[70px] w-px bg-white/15" />
      <SustainPart label="Water" value={water.value} unit="m³" decimals={0} pct={24} color="#b9a2ff" />
    </div>
  );
}

function SustainPart({ label, value, unit, decimals, pct, color }: { label: string; value: number; unit: string; decimals: number; pct: number; color: string }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-1 items-center">
      <div>
        <p className="text-[13px] text-[#b09dc1]">{label}</p>
        <p className="mt-[3px] leading-none text-white">
          <span className="text-[30px] font-medium">
            <AnimatedNumber value={value} decimals={decimals} />
          </span>
          <span className="ml-[4px] text-[14px] text-[#b09dc1]">{unit}</span>
        </p>
      </div>
      <svg width={54} height={54} viewBox="0 0 54 54" className="ml-auto">
        <circle cx={27} cy={27} r={25} fill="#09050c" />
        <circle cx={27} cy={27} r={r} fill="none" stroke="#1d1428" strokeWidth={4} />
        <motion.circle
          cx={27}
          cy={27}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          transform="rotate(-90 27 27)"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct / 100) }}
          transition={{ duration: 1.2, delay: 0.8 }}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
        <text x={27} y={31} fill="#ffffff" fontSize={12} textAnchor="middle">
          {pct}%
        </text>
      </svg>
    </div>
  );
}

/** While the fire drill runs: where, how many devices, how long — on the 3D View itself. */
function FireDashboard({ onOpen }: { onOpen: () => void }) {
  const fire = useScenario((s) => s.fire);
  const now = useNow(1000);
  const affected = BUILDINGS.filter((b) => b.id === 'a01' || b.id === 'a02');
  const states = affected.flatMap((b) => devicesOf(b).map((d) => deviceValues(d, true, now).state));
  const alarms = states.filter((s) => s === 'Alarm').length;
  const sounders = states.filter((s) => s === 'Sounding').length;
  const elapsed = fire.triggeredAt ? Math.max(0, Math.floor((now - fire.triggeredAt) / 1000)) : 0;
  const stat = (label: string, value: ReactNode, color = '#ffffff') => (
    <div className="flex flex-1 flex-col items-center">
      <span className="text-[30px] font-medium leading-none tabular-nums" style={{ color }}>
        {value}
      </span>
      <span className="mt-[4px] text-[12px] text-ink-3">{label}</span>
    </div>
  );
  return (
    <Panel
      frame={{ x: 650, y: 196, w: 620, h: 150 }}
      index={0}
      icon={<Glyph id="flame" size={20} color="#e59aaa" />}
      title={`Fire Alarm · Buildings ${affected.map((b) => b.label).join(', ')}`}
      subtitle={`Zone ${fire.zone} · response protocol active`}
      onClick={onOpen}
      hint="Open Fire › Fire System"
      style={{ borderColor: RED, background: 'linear-gradient(180deg, rgba(86,16,40,0.78), rgba(36,8,22,0.88))', boxShadow: '0 0 36px rgba(217,107,132,0.45)' }}
    >
      <div className="flex h-full items-center px-[10px] pb-[12px]">
        {stat('Detectors in alarm', alarms, '#e59aaa')}
        {stat('Sounders active', sounders, '#e59aaa')}
        {stat('Pumps', 'Running', '#eeb89e')}
        {stat('Elapsed', `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`)}
        <Tag tone="bad">View devices ›</Tag>
      </div>
    </Panel>
  );
}
