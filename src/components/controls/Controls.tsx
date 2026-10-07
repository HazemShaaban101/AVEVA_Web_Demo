import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight } from '@/components/icons/UiIcons';
import { Glyph } from '@/components/icons/Glyph';

/* ---------------------------------------------------------------------------------------------
 * Small controls from the design system. Each mirrors one of the exported components.
 * ------------------------------------------------------------------------------------------- */

/** "Mode ›": cycles a chart between day / week / month (the design's period select). */
export function ModeButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="pf-chip group flex h-[36px] items-center gap-[10px] border border-accent/40 bg-accent/[0.06] px-[12px] text-accent transition-colors hover:bg-accent/15"
      style={{ boxShadow: 'inset 0 0 18px rgba(157,120,255,0.05)' }}
      title="Change period"
    >
      <span className="text-[12px] font-bold tracking-[0.14em]">MODE</span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={label} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="whitespace-nowrap text-[12px] text-ink-2">
          {label}
        </motion.span>
      </AnimatePresence>
      <ChevronRight size={16} className="transition-transform group-hover:translate-x-[2px]" />
    </button>
  );
}

export type Tone = 'good' | 'warn' | 'bad' | 'neutral' | 'aqua';

export const TONE_COLOR: Record<Tone, string> = {
  good: '#d9cbe6',
  warn: '#e8a98c',
  bad: '#d96b84',
  neutral: '#ffffff',
  aqua: '#b58ce3',
};

/** The big colored assessment text ("Good", "Above Average", "Needs Restart"). */
export function Verdict({ text, tone, size = 32 }: { text: string; tone: Tone; size?: number }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={text}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.25 }}
        className="block text-center leading-none tracking-[0.5px]"
        style={{ fontSize: size, color: TONE_COLOR[tone], textShadow: tone === 'warn' || tone === 'bad' ? `0 0 14px ${TONE_COLOR[tone]}30` : undefined }}
      >
        {text}
      </motion.span>
    </AnimatePresence>
  );
}

/** Cut-corner plate with a value inside ("Alarms", "156 People", "Yesterday At 16:32"). */
export function Capsule({ children, tone, size = 30, glow }: { children: ReactNode; tone?: 'alarm'; size?: number; glow?: boolean }) {
  const alarm = tone === 'alarm';
  return (
    <span
      className="pf-chip inline-flex items-center justify-center whitespace-nowrap border px-[30px] leading-none text-white"
      style={{
        fontSize: size * 0.9,
        height: size * 1.8,
        borderColor: alarm ? '#d96b84' : 'rgba(157,120,255,0.3)',
        background: alarm ? 'rgba(74,20,52,0.5)' : 'linear-gradient(145deg, rgba(157,120,255,0.12), rgba(8,5,11,0.7))',
        boxShadow: alarm || glow ? '0 0 16px rgba(217,107,132,0.55), inset 0 0 10px rgba(217,107,132,0.3)' : 'inset 0 0 24px rgba(157,120,255,0.05)',
      }}
    >
      {children}
    </span>
  );
}

export type PillState = 'active' | 'inactive' | 'connecting' | 'alarm' | 'normal';

const PILL: Record<PillState, { text: string; color: string; border: string; bg: string }> = {
  active: { text: 'Active', color: '#9d78ff', border: '#9d78ff', bg: 'linear-gradient(145deg, rgba(157,120,255,0.17), rgba(8,5,11,0.78))' },
  normal: { text: 'Normal', color: '#7fcf9d', border: 'rgba(127,207,157,0.6)', bg: 'linear-gradient(145deg, rgba(127,207,157,0.15), rgba(8,5,11,0.78))' },
  inactive: { text: 'Inactive', color: '#534760', border: 'rgba(157,120,255,0.2)', bg: 'rgba(10,6,13,0.6)' },
  connecting: { text: 'Connecting', color: '#e4ccff', border: 'rgba(157,120,255,0.3)', bg: 'rgba(10,6,13,0.6)' },
  alarm: { text: 'Alarm', color: '#e59aaa', border: '#d96b84', bg: 'linear-gradient(145deg, rgba(217,107,132,0.2), rgba(34,10,24,0.78))' },
};

/** State tile (design: connection states): Active / Inactive / Connecting, plus alarm and normal. */
export function StatusPill({ state, label, size = 30 }: { state: PillState; label?: string; size?: number }) {
  const p = PILL[state];
  return (
    <span
      className="pf-chip relative inline-flex items-center gap-[14px] border px-[26px] font-medium leading-none"
      style={{ height: size * 1.75, fontSize: size * 0.9, color: state === 'inactive' ? '#bbaacb' : '#e4ccff', background: p.bg, borderColor: p.border, boxShadow: state === 'inactive' ? undefined : `inset 0 0 24px ${p.color}14, 0 0 20px ${p.color}14` }}
    >
      {state !== 'inactive' && state !== 'connecting' && <span aria-hidden className="absolute bottom-[12px] left-0 top-[12px] w-[2px]" style={{ background: p.color, boxShadow: `0 0 9px ${p.color}` }} />}
      {state === 'connecting' ? (
        <span className="h-[18px] w-[18px] rounded-full border" style={{ borderColor: 'rgba(228,204,255,0.2)', borderTopColor: p.color, borderRightColor: p.color, animation: 'pf-spin 1.2s linear infinite' }} />
      ) : (
        <span className="relative flex h-[18px] w-[18px] items-center justify-center rounded-full border" style={{ borderColor: p.color }}>
          <span className="h-[8px] w-[8px] rounded-full" style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }} />
          {(state === 'active' || state === 'alarm') && <span className="absolute h-[8px] w-[8px] rounded-full" style={{ background: p.color, animation: 'pf-pulse-ring 1.8s ease-out infinite' }} />}
        </span>
      )}
      {label ?? p.text}
    </span>
  );
}

/** The fire-drill control (design: emergency control): "Simulate Fire Alarm", then "Alarm Triggered" in red. */
export function AlarmButton({ triggered, onTrigger, onReset }: { triggered: boolean; onTrigger: () => void; onReset: () => void }) {
  const c = triggered ? '#e59aaa' : '#9d78ff';
  return (
    <div className="flex items-center gap-[14px]">
      <motion.button
        onClick={triggered ? undefined : onTrigger}
        whileTap={{ scale: 0.98 }}
        className="pf-chip flex h-[76px] items-center border pl-[18px] pr-[20px] text-left transition-colors"
        style={
          triggered
            ? { background: 'linear-gradient(90deg, rgba(217,107,132,0.32), rgba(110,22,48,0.3))', borderColor: '#d96b84', boxShadow: 'inset 0 0 26px rgba(217,107,132,0.15), 0 0 24px rgba(217,107,132,0.35)', cursor: 'default' }
            : { background: 'rgba(10,6,13,0.6)', borderColor: 'rgba(157,120,255,0.35)', boxShadow: 'inset 0 0 24px rgba(157,120,255,0.04)' }
        }
      >
        <span className="pf-chip mr-[14px] flex h-[40px] w-[40px] items-center justify-center border" style={{ borderColor: `${c}55`, background: `${c}12` }}>
          <Glyph id="flame" size={20} color={triggered ? '#ffffff' : c} style={{ filter: `drop-shadow(0 0 6px ${c})` }} />
        </span>
        <span className="flex flex-col">
          <strong className="text-[20px] font-medium leading-tight text-white">{triggered ? 'Alarm Triggered' : 'Simulate Fire Alarm'}</strong>
          <small className="mt-[2px] text-[12px] tracking-[0.04em] text-ink-3">{triggered ? 'Response protocol is now active' : 'Run emergency response sequence'}</small>
        </span>
        {triggered ? (
          <span className="ml-[22px] h-[11px] w-[11px] rounded-full bg-[#d96b84]" style={{ animation: 'pf-alarm-blink 0.9s ease-in-out infinite', boxShadow: '0 0 0 5px rgba(217,107,132,0.15), 0 0 14px #d96b84' }} />
        ) : (
          <span className="ml-[22px] text-[22px] text-accent">→</span>
        )}
      </motion.button>
      <AnimatePresence>
        {triggered && (
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            onClick={onReset}
            className="pf-chip h-[76px] border border-accent/30 bg-accent/[0.05] px-[22px] text-[18px] text-ink-2 hover:border-ok hover:text-ok"
          >
            Reset Alarm
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Small switch used on device tags (MVD toggles). */
export function Toggle({ on, onChange, label }: { on: boolean; onChange?: (on: boolean) => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange?.(!on);
      }}
      className="relative h-[16px] w-[28px] shrink-0 rounded-full transition-colors"
      style={{ background: on ? '#9d78ff' : '#09050c', border: on ? 'none' : '1.5px solid #372c42', boxShadow: on ? '0 0 8px rgba(157,120,255,0.6)' : undefined }}
    >
      <motion.span className="absolute top-[2px] h-[12px] w-[12px] rounded-full bg-white" animate={{ left: on ? 14 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 32 }} />
    </button>
  );
}

/** Vertical cyan hairline separating a gauge from its verdict (Frame 506). */
export function Hairline({ height = 190, color = 'rgba(157,120,255,0.16)' }: { height?: number; color?: string }) {
  return <span aria-hidden className="block w-px" style={{ height, background: color }} />;
}
