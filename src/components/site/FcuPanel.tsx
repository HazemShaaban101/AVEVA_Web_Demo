import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Glyph } from '@/components/icons/Glyph';
import { ChevronDown, ChevronUp, PowerIcon } from '@/components/icons/UiIcons';
import { useGalaxySearch, writeAttribute, type WriteOutcome } from '@/gateway/discovery';
import { useGalaxyObject } from '@/gateway/galaxy';
import type { OpcValue } from '@/gateway/client';
import { bindFcu, FCU_FAN_MODES, FCU_QUERY, FCU_TEMPLATE as T } from '@/model/galaxyBindings';
import { DEFAULT_FCU, useScenario, type FcuState } from '@/sim/scenario';
import { derivedSignal } from '@/sim/catalog';
import { useNow } from '@/sim/clock';

/**
 * The FCU control card from the floor-plan design (ON/OFF · FAN · MODE · TEMP · SET POINT). When the
 * Galaxy has FCU objects, the card shows and writes the real one (see bindFcu: the floor's own FCUs by
 * Galaxy Area, reused cyclically if there are fewer than markers); otherwise it simulates.
 */
export function FcuPanel({ planId, label, floor, markerIndex, onClose }: { planId: string; label: string; floor: string; markerIndex: number; onClose: () => void }) {
  const found = useGalaxySearch(FCU_QUERY);
  const galaxyName = found?.status === 'done' ? bindFcu(found.items, floor, markerIndex) : null;
  return galaxyName ? (
    <LiveFcu name={galaxyName} label={label} onClose={onClose} />
  ) : (
    <SimFcu id={planId} label={label} onClose={onClose} note={found?.status === 'loading' ? 'Looking for FCUs in the Galaxy…' : 'Simulated · no FCU objects in the Galaxy'} />
  );
}

/* ---- Shared look ------------------------------------------------------------------------------ */

const pill = 'rounded-[8px] border border-[#4fc3d4] px-[8px] py-[3px] text-[12px] text-[#2f8f9e] disabled:opacity-50';
const col = 'flex flex-col items-center gap-[6px]';
const lbl = 'text-[10px] font-semibold tracking-[0.5px] text-[#5f8389]';

function Dots({ n, active, color = '#56c8f5' }: { n: number; active: number; color?: string }) {
  return (
    <span className="flex gap-[3px]">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="h-[4px] w-[14px] rounded-full" style={{ background: i < active ? color : '#d9f3f6' }} />
      ))}
    </span>
  );
}

function Frame({ label, badge, onClose, children, footer }: { label: string; badge: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="absolute right-[15px] top-[372px] z-10 w-[360px] font-[family-name:var(--font-plain)]">
      <div className="flex items-end">
        <span className="rounded-t-[8px] bg-[#2f8f9e] px-[12px] py-[6px] text-[16px] text-white">{label}</span>
        <span className="ml-[8px] pb-[4px] text-[11px] tracking-[0.5px]">{badge}</span>
        <button onClick={onClose} className="ml-auto pb-[2px] pr-[4px] text-[20px] leading-none text-white/70 hover:text-white" aria-label="Close">
          ×
        </button>
      </div>
      <div className="rounded-b-[8px] rounded-tr-[8px] bg-white px-[12px] py-[10px] text-[#0d3438] shadow-[0_14px_40px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between">{children}</div>
        {footer}
      </div>
    </motion.div>
  );
}

function PowerButton({ on, onClick, disabled }: { on: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] border disabled:opacity-50"
      style={{ borderColor: on ? '#56c8f5' : '#4fc3d4', color: on ? '#1aa5dc' : '#4fc3d4', boxShadow: on ? '0 0 8px #56c8f588' : undefined }}
      aria-label={on ? 'Switch off' : 'Switch on'}
    >
      <PowerIcon size={15} />
    </button>
  );
}

/** Set point range the controls allow, for the live and the simulated card alike. */
const SP_MIN = 16;
const SP_MAX = 30;
/** One ±0.5 step, kept in range; an out-of-range value (e.g. an uncommissioned 0) steps into it. */
const stepSetpoint = (sp: number, d: number) => Math.min(SP_MAX, Math.max(SP_MIN, Math.round((sp + d) * 10) / 10));

function SetPoint({ value, onStep, disabled, sp }: { value: string; onStep?: (d: number) => void; disabled?: boolean; sp?: number | null }) {
  return (
    <div className="flex items-center gap-[6px]">
      <div className={col}>
        <span className={lbl}>SET POINT</span>
        <span className={pill}>{value}</span>
      </div>
      {onStep && (
        <div className="flex flex-col gap-[3px] pt-[14px]">
          <button onClick={() => onStep(0.5)} disabled={disabled || (sp != null && sp >= SP_MAX)} className="rounded-[4px] border border-[#4fc3d4] text-[#2f8f9e] disabled:opacity-40" aria-label="Raise set point">
            <ChevronUp size={14} />
          </button>
          <button onClick={() => onStep(-0.5)} disabled={disabled || (sp != null && sp <= SP_MIN)} className="rounded-[4px] border border-[#4fc3d4] text-[#2f8f9e] disabled:opacity-40" aria-label="Lower set point">
            <ChevronDown size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function FanIcon({ spinning, speed }: { spinning: boolean; speed: number }) {
  return (
    <motion.span className="inline-block" animate={spinning ? { rotate: 360 } : { rotate: 0 }} transition={spinning ? { duration: 2.4 / Math.max(1, speed), repeat: Infinity, ease: 'linear' } : {}}>
      <Glyph id="fan" size={13} color="#2f8f9e" />
    </motion.span>
  );
}

/* ---- Live (Galaxy) ------------------------------------------------------------------------------ */

const num = (v: OpcValue | undefined): number | null => (typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 1 : 0) : typeof v === 'string' && v.trim() !== '' && !isNaN(+v) ? +v : null);

function LiveFcu({ name, label, onClose }: { name: string; label: string; onClose: () => void }) {
  const obj = useGalaxyObject(name);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WriteOutcome | null>(null);

  const val = (a: string) => obj?.points[a]?.value;
  const has = (a: string) => Boolean(obj?.points[a]);

  // Controls show and write the command points (what the operator asked for). The _Status points
  // are the equipment's feedback: shown separately, and any disagreement is called out — with no
  // equipment connected yet, the feedback simply never follows.
  const cmdOn = (num(val(T.command)) ?? 0) > 0;
  const fbOn = num(val(T.commandStatus));
  const speedCmd = num(val(T.fanSpeed));
  const speedFb = num(val(T.fanSpeedStatus));
  const modeCmd = num(val(T.fanMode));
  const modeFb = num(val(T.fanModeStatus));
  const temp = num(val(T.temperature));
  const sp = num(val(T.setpoint));
  const modeName = (m: number | null) => (m === null ? '—' : (FCU_FAN_MODES[m] ?? `Mode ${m}`));
  const modeCount = Object.keys(FCU_FAN_MODES).length;
  const mismatches = [
    fbOn !== null && (fbOn > 0) !== cmdOn ? `power ${fbOn > 0 ? 'ON' : 'OFF'}` : null,
    speedFb !== null && speedCmd !== null && speedFb !== speedCmd ? `fan ${speedFb}` : null,
    modeFb !== null && modeCmd !== null && modeFb !== modeCmd ? `mode ${modeName(modeFb)}` : null,
  ].filter(Boolean);

  const write = async (attr: string, value: number) => {
    setBusy(true);
    setResult(null);
    setResult(await writeAttribute(`${name}.${attr}`, value));
    setBusy(false);
  };

  return (
    <Frame
      label={label}
      onClose={onClose}
      badge={
        <span className={obj?.status === 'live' ? 'text-ok' : 'text-warn'}>
          ● {obj?.status === 'live' ? 'LIVE' : 'CONNECTING'} · {name}
        </span>
      }
      footer={
        <>
          {mismatches.length > 0 && (
            <p className="mt-[8px] text-[11px] text-warn" title="Command points are what was requested; _Status points are what the equipment reports.">
              Feedback differs: {mismatches.join(', ')} — no confirmation from the equipment yet.
            </p>
          )}
          <AnimatePresence>
            {result && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`mt-[8px] text-[11px] ${result.accepted ? 'text-[#2fae4f]' : 'text-[#d93636]'}`}>
                {result.accepted ? 'Saved (simulated).' : `Refused (${result.code})${result.message ? `: ${result.message}` : ''}`}
              </motion.p>
            )}
          </AnimatePresence>
        </>
      }
    >
      <div className={col}>
        <span className={lbl}>{cmdOn ? 'ON' : 'OFF'}</span>
        <PowerButton on={cmdOn} disabled={busy || !has(T.command)} onClick={() => write(T.command, cmdOn ? 0 : 1)} />
      </div>
      <div className={col}>
        <span className={lbl}>FAN</span>
        <button className={pill} disabled={busy || !has(T.fanSpeed)} onClick={() => write(T.fanSpeed, ((speedCmd ?? 0) % 3) + 1)} aria-label="Fan speed" title="Fan speed 1 → 2 → 3">
          <FanIcon spinning={cmdOn} speed={speedCmd ?? 1} />
        </button>
        <Dots n={3} active={Math.min(3, Math.max(0, speedCmd ?? 0))} />
      </div>
      <div className={col}>
        <span className={lbl}>MODE</span>
        <button className={pill} disabled={busy || !has(T.fanMode)} onClick={() => write(T.fanMode, ((modeCmd ?? 0) + 1) % modeCount)} title="Mode: Cooling → Heating → Auto">
          {modeName(modeCmd)}
        </button>
        <Dots n={modeCount} active={modeCmd === null ? 0 : modeCmd + 1} />
      </div>
      <div className={col}>
        <span className={lbl}>TEMP</span>
        <span className={pill}>{temp === null ? '—' : `${temp.toFixed(1)}°C`}</span>
      </div>
      <SetPoint value={sp === null ? '—' : `${sp.toFixed(1)}°C`} sp={sp} disabled={busy || sp === null} onStep={(d) => write(T.setpoint, stepSetpoint(sp ?? 22, d))} />
    </Frame>
  );
}

/* ---- Simulated --------------------------------------------------------------------------------- */

/** Room temperature drifts toward the set point while the FCU runs, and away from it when off. */
function useRoomTemp(id: string, fcu: FcuState) {
  const now = useNow(5000);
  const drift = derivedSignal(`room.${id}`, { unit: '°C', low: 0, high: 1, profile: 'flat', noise: 0.8, drift: 30, decimals: 1 }).actual(now);
  const target = fcu.on ? fcu.setpoint + (fcu.mode === 'Fan' ? 1.8 : 0.6) : 27.5;
  return Math.round((target + drift) * 10) / 10;
}

function SimFcu({ id, label, onClose, note }: { id: string; label: string; onClose: () => void; note: string }) {
  const fcu = useScenario((s) => s.fcus[id] ?? DEFAULT_FCU);
  const setFcu = useScenario((s) => s.setFcu);
  const temp = useRoomTemp(id, fcu);
  const modes: FcuState['mode'][] = ['Cooling', 'Heating', 'Fan'];
  return (
    <Frame label={label} onClose={onClose} badge={<span className="text-aqua-soft">SIM</span>} footer={<p className="mt-[8px] text-[11px] text-[#8fb4ba]">{note}</p>}>
      <div className={col}>
        <span className={lbl}>{fcu.on ? 'ON' : 'OFF'}</span>
        <PowerButton on={fcu.on} onClick={() => setFcu(id, { on: !fcu.on })} />
      </div>
      <div className={col}>
        <span className={lbl}>FAN</span>
        <button onClick={() => setFcu(id, { fan: ((fcu.fan % 3) + 1) as 1 | 2 | 3 })} className={pill} disabled={!fcu.on} aria-label="Fan speed">
          <FanIcon spinning={fcu.on} speed={fcu.fan} />
        </button>
        <Dots n={3} active={fcu.on ? fcu.fan : 0} />
      </div>
      <div className={col}>
        <span className={lbl}>MODE</span>
        <button onClick={() => setFcu(id, { mode: modes[(modes.indexOf(fcu.mode) + 1) % 3] })} className={pill} disabled={!fcu.on}>
          {fcu.mode}
        </button>
        <Dots n={3} active={modes.indexOf(fcu.mode) + 1} />
      </div>
      <div className={col}>
        <span className={lbl}>TEMP</span>
        <span className={pill}>{temp}°C</span>
      </div>
      <SetPoint value={`${fcu.setpoint}°C`} sp={fcu.setpoint} onStep={(d) => setFcu(id, { setpoint: stepSetpoint(fcu.setpoint, d) })} />
    </Frame>
  );
}
