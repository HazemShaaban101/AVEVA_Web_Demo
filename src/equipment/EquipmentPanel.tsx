import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AHU_ROLE_LABELS, type AhuRole } from '@/model/galaxyBindings';
import type { AhuLive } from '@/equipment/useAhuLive';
import type { AhuPart } from '@/equipment/AhuModel';
import { useNow } from '@/sim/clock';
import { clsx } from '@/utils/clsx';

type Tab = 'points' | 'schedule' | 'trends' | 'alerts';

/** Rows of the points list, grouped by the part of the unit they belong to. */
export const PART_ROLES: Record<AhuPart, AhuRole[]> = {
  damper: ['freshDamperSts', 'freshDamperCmd', 'freshDamperFail', 'returnDamperSts', 'returnDamperFail', 'outsideTemp', 'outsideHumd'],
  filter: ['pressure', 'filterDps', 'filter'],
  coil: ['valveFb', 'valveCmd', 'valveAlarm'],
  valve: ['valveFb', 'valveCmd', 'valveAlarm'],
  fan: ['fanStatus', 'fanCmd', 'trip', 'flow'],
  motor: ['vsdFb', 'vsdCmd', 'trip'],
  outlet: ['supplyTemp', 'supplyHumd', 'flow'],
  smoke: ['smoke', 'fireAlarm'],
};

const ROW_ORDER: AhuRole[] = [
  'startStop',
  'auto',
  'fanStatus',
  'fanCmd',
  'trip',
  'vsdFb',
  'vsdCmd',
  'supplyTemp',
  'supplyHumd',
  'outsideTemp',
  'outsideHumd',
  'pressure',
  'filterDps',
  'filter',
  'valveFb',
  'valveCmd',
  'valveAlarm',
  'flow',
  'freshDamperSts',
  'freshDamperFail',
  'returnDamperSts',
  'returnDamperFail',
  'smoke',
  'fireAlarm',
];

const ALARMS: AhuRole[] = ['trip', 'filterDps', 'filter', 'valveAlarm', 'freshDamperFail', 'returnDamperFail', 'smoke', 'fireAlarm'];

/** Display text and tone for a role's current value. */
export function formatRole(live: AhuLive, role: AhuRole): { text: string; tone: 'bad' | 'good' | 'idle' | 'value' } {
  const p = live.point(role);
  // Until the object's first values arrive every row shows a placeholder, so the list never jumps.
  if (!p) return { text: live.status === 'live' ? 'n/a' : '…', tone: 'idle' };
  if (p.quality === 'bad') return { text: p.statusCode === 'BadWaitingForInitialData' ? '…' : 'Bad', tone: 'idle' };
  const n = live.num(role);
  const on = (n ?? 0) > 0;
  switch (role) {
    case 'trip':
    case 'filterDps':
    case 'filter':
    case 'valveAlarm':
    case 'freshDamperFail':
    case 'returnDamperFail':
    case 'smoke':
    case 'fireAlarm':
    case 'inAlarm':
      return on ? { text: 'Alarm', tone: 'bad' } : { text: 'Normal', tone: 'good' };
    case 'fanStatus':
      return on ? { text: 'Running', tone: 'good' } : { text: 'Stopped', tone: 'idle' };
    case 'fanCmd':
    case 'startStop':
    case 'freshDamperCmd':
    case 'returnDamperCmd':
      return { text: on ? 'Start' : 'Stop', tone: 'value' };
    case 'auto':
      return { text: on ? 'Auto' : 'Manual', tone: 'value' };
    case 'freshDamperSts':
    case 'returnDamperSts':
      return { text: on ? 'Open' : 'Closed', tone: on ? 'good' : 'idle' };
    case 'flow':
      return on ? { text: 'Proven', tone: 'good' } : { text: 'No flow', tone: 'idle' };
    case 'scan':
      return { text: on ? 'On scan' : 'Off scan', tone: on ? 'good' : 'bad' };
    case 'supplyTemp':
    case 'outsideTemp':
      return { text: `${(n ?? 0).toFixed(1)} °C`, tone: 'value' };
    case 'supplyHumd':
    case 'outsideHumd':
      return { text: `${(n ?? 0).toFixed(0)} %RH`, tone: 'value' };
    case 'pressure':
      return { text: `${(n ?? 0).toFixed(0)} Pa`, tone: 'value' };
    default:
      return { text: `${(n ?? 0).toFixed(0)} %`, tone: 'value' };
  }
}

function ValueBox({ text, tone }: { text: string; tone: 'bad' | 'good' | 'idle' | 'value' }) {
  return (
    <span
      className="min-w-[110px] rounded-[8px] border px-[8px] py-[2px] text-center text-[13px]"
      style={{
        borderColor: tone === 'bad' ? '#ef4444' : '#4fc3d4',
        color: tone === 'bad' ? '#ef4444' : tone === 'good' ? '#2fae4f' : tone === 'idle' ? '#6f929a' : '#0d3438',
        fontWeight: tone === 'bad' ? 600 : 500,
        background: tone === 'bad' ? '#fff1f1' : '#fff',
      }}
    >
      {text}
    </span>
  );
}

/**
 * The white equipment card from the design ("Title" + item rows + Schedule / Trends / Alerts):
 * live points of the unit, with the part selected in 3D highlighted.
 */
export function EquipmentPanel({ live, selected }: { live: AhuLive; selected: AhuPart | null }) {
  const [tab, setTab] = useState<Tab>('points');
  const list = useRef<HTMLDivElement>(null);
  const highlighted = selected ? PART_ROLES[selected] : [];

  // Jump to the selected part's first point.
  useEffect(() => {
    if (!selected) return;
    setTab('points');
    requestAnimationFrame(() => list.current?.querySelector('[data-hot="true"]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }, [selected]);

  const activeAlarms = ALARMS.filter((r) => live.point(r) && live.on(r));

  return (
    <motion.aside
      // Fades in place: no slide, so it never moves while the 3D scene is being built.
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="absolute right-[24px] top-[24px] z-10 flex h-[560px] w-[330px] flex-col overflow-hidden rounded-[8px] bg-white font-[family-name:var(--font-plain)] text-[#0d3438] shadow-[0_18px_50px_rgba(0,0,0,0.5)]"
    >
      <div className="bg-[#2f8f9e] px-[14px] py-[12px] text-center text-white">
        <p className="text-[20px] font-medium leading-none">{live.unit.id}</p>
        <p className="mt-[5px] text-[11px] tracking-[0.5px] text-white/80">
          {live.status === 'live' ? '● LIVE' : live.status === 'reconnecting' ? '● RECONNECTING' : '● CONNECTING'} · {live.unit.galaxy}
        </p>
      </div>

      <div ref={list} className="pf-scroll min-h-0 flex-1 px-[12px] py-[8px]">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {tab === 'points' &&
              // Rows come from the unit's template, not from the values received so far: a stable list.
              ROW_ORDER.filter((r) => live.unit.attrs[r]).map((role) => {
                const v = formatRole(live, role);
                const hot = highlighted.includes(role);
                return (
                  <div
                    key={role}
                    data-hot={hot}
                    className={clsx('flex items-center justify-between rounded-[8px] px-[6px] py-[5px] text-[13px] transition-colors', hot && 'bg-[#d9fbff]')}
                    title={`${live.unit.galaxy}.${live.unit.attrs[role]}`}
                  >
                    <span className={hot ? 'font-medium text-[#b36b00]' : ''}>{AHU_ROLE_LABELS[role]}</span>
                    <ValueBox {...v} />
                  </div>
                );
              })}
            {tab === 'trends' && <Trends live={live} />}
            {tab === 'alerts' && <Alerts live={live} active={activeAlarms} />}
            {tab === 'schedule' && <Schedule running={live.model.running} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <nav className="grid grid-cols-4 border-t border-[#ececf6] text-[11px] text-[#6f929a]">
        <TabButton on={tab === 'points'} onClick={() => setTab('points')} label="Points" icon={<ListIcon />} />
        <TabButton on={tab === 'schedule'} onClick={() => setTab('schedule')} label="Schedule" icon={<CalIcon />} />
        <TabButton on={tab === 'trends'} onClick={() => setTab('trends')} label="Trends" icon={<PulseIcon />} />
        <TabButton on={tab === 'alerts'} onClick={() => setTab('alerts')} label="Alerts" icon={<BellSmall />} badge={activeAlarms.length} />
      </nav>
    </motion.aside>
  );
}

function TabButton({ on, onClick, label, icon, badge }: { on: boolean; onClick: () => void; label: string; icon: ReactNode; badge?: number }) {
  return (
    <button onClick={onClick} className={clsx('relative flex flex-col items-center gap-[3px] py-[8px] transition-colors', on ? 'text-[#2f8f9e]' : 'hover:text-[#2f8f9e]')}>
      {icon}
      {label}
      {!!badge && <span className="absolute right-[18px] top-[5px] flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-alarm px-[3px] text-[9px] text-white">{badge}</span>}
      {on && <motion.span layoutId="eq-tab" className="absolute inset-x-[14px] top-0 h-[2px] rounded-full bg-[#2f8f9e]" />}
    </button>
  );
}

/* ---- Trends ------------------------------------------------------------------------------------ */

function Trends({ live }: { live: AhuLive }) {
  useNow(5000);
  const roles: { role: AhuRole; unit: string; color: string }[] = [
    { role: 'supplyTemp', unit: '°C', color: '#22a9c7' },
    { role: 'outsideTemp', unit: '°C', color: '#2f8f9e' },
    { role: 'vsdFb', unit: '%', color: '#2fae4f' },
    { role: 'pressure', unit: 'Pa', color: '#d64545' },
  ];
  return (
    <div className="flex flex-col gap-[12px] py-[4px]">
      <p className="text-[11px] text-[#6f929a]">Simulated history of the last hour.</p>
      {roles.map(({ role, unit, color }) => {
        const series = live.obj?.history[live.unit.attrs[role]] ?? [];
        return (
          <div key={role}>
            <div className="flex justify-between text-[12px]">
              <span>{AHU_ROLE_LABELS[role]}</span>
              <span className="font-medium">{series.length ? `${series[series.length - 1].v.toFixed(1)} ${unit}` : '—'}</span>
            </div>
            <Spark data={series.map((p) => p.v)} color={color} />
          </div>
        );
      })}
    </div>
  );
}

function Spark({ data, color }: { data: number[]; color: string }) {
  const w = 290;
  const h = 40;
  if (data.length < 2) return <div className="mt-[4px] flex h-[40px] items-center justify-center rounded-[8px] bg-[#f5f5fb] text-[11px] text-[#8fb4ba]">Collecting…</div>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const y = (v: number) => (max === min ? h / 2 : h - 3 - ((v - min) / (max - min)) * (h - 6));
  const d = data.map((v, i) => `${i ? 'L' : 'M'}${((i / (data.length - 1)) * w).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} className="mt-[4px] rounded-[8px] bg-[#f5f5fb]">
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={color} opacity={0.12} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} />
    </svg>
  );
}

/* ---- Alerts ------------------------------------------------------------------------------------ */

function Alerts({ live, active }: { live: AhuLive; active: AhuRole[] }) {
  // Transitions seen since the screen opened (the Galaxy's alarm history lives in AVEVA itself).
  const [log, setLog] = useState<{ t: number; role: AhuRole; on: boolean }[]>([]);
  const prev = useRef<Record<string, boolean>>({});
  const states = ALARMS.map((r) => `${r}:${live.on(r)}`).join(',');
  useEffect(() => {
    const changes: { t: number; role: AhuRole; on: boolean }[] = [];
    for (const r of ALARMS) {
      const on = live.on(r);
      if (prev.current[r] !== undefined && prev.current[r] !== on) changes.push({ t: Date.now(), role: r, on });
      prev.current[r] = on;
    }
    if (changes.length) setLog((l) => [...changes, ...l].slice(0, 30));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [states]);

  return (
    <div className="py-[4px] text-[13px]">
      {active.length === 0 ? (
        <p className="rounded-[8px] bg-[#effaf3] px-[10px] py-[8px] text-[#2fae4f]">No active alarms on {live.unit.id}.</p>
      ) : (
        active.map((r) => (
          <p key={r} className="mb-[6px] flex items-center justify-between rounded-[8px] bg-[#fff1f1] px-[10px] py-[7px] text-[#d93636]">
            {AHU_ROLE_LABELS[r]} <span className="text-[11px] font-semibold">ACTIVE</span>
          </p>
        ))
      )}
      <p className="mb-[4px] mt-[14px] text-[11px] font-semibold tracking-[0.5px] text-[#6f929a]">CHANGES THIS SESSION</p>
      {log.length === 0 ? (
        <p className="text-[12px] text-[#8fb4ba]">None yet.</p>
      ) : (
        log.map((e, i) => (
          <p key={i} className="flex justify-between py-[3px] text-[12px]">
            <span>{AHU_ROLE_LABELS[e.role]}</span>
            <span className={e.on ? 'text-[#d93636]' : 'text-[#2fae4f]'}>
              {e.on ? 'Raised' : 'Cleared'} · {new Date(e.t).toLocaleTimeString('en-GB')}
            </span>
          </p>
        ))
      )}
    </div>
  );
}

/* ---- Schedule ---------------------------------------------------------------------------------- */

const WEEK = [
  { day: 'Mon', from: '08:00', to: '23:00' },
  { day: 'Tue', from: '08:00', to: '23:00' },
  { day: 'Wed', from: '08:00', to: '23:00' },
  { day: 'Thu', from: '08:00', to: '00:00' },
  { day: 'Fri', from: '09:00', to: '01:00' },
  { day: 'Sat', from: '09:00', to: '01:00' },
  { day: 'Sun', from: '08:00', to: '23:00' },
];

function Schedule({ running }: { running: boolean }) {
  const today = (new Date().getDay() + 6) % 7;
  return (
    <div className="py-[4px] text-[13px]">
      <p className="mb-[8px] text-[11px] text-[#6f929a]">Occupancy schedule (platform plan). Actual state: {running ? 'running' : 'stopped'}.</p>
      {WEEK.map((w, i) => (
        <div key={w.day} className={clsx('mb-[4px] flex items-center gap-[10px] rounded-[8px] px-[8px] py-[5px]', i === today && 'bg-[#eef0ff]')}>
          <span className={clsx('w-[36px]', i === today && 'font-semibold text-[#2f8f9e]')}>{w.day}</span>
          <div className="relative h-[8px] flex-1 rounded-full bg-[#ececf6]">
            <span className="absolute inset-y-0 rounded-full bg-[#2f8f9e]" style={{ left: `${(parseInt(w.from) / 24) * 100}%`, right: `${100 - (Math.max(parseInt(w.to) || 24, parseInt(w.from) + 1) / 24) * 100}%` }} />
          </div>
          <span className="w-[92px] text-right text-[12px] text-[#5f8389]">
            {w.from}–{w.to}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---- Tiny icons (the design's Schedule / Trends / Alerts) --------------------------------------- */

const ListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);
const CalIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
  </svg>
);
const PulseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12h4l3-8 4 16 3-8h4" />
  </svg>
);
const BellSmall = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2ZM10 21h4" />
  </svg>
);
