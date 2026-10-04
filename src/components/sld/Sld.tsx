import type { ReactNode } from 'react';

/**
 * Symbols for single-line diagrams and process schematics, drawn in SVG user units. Live parts are
 * cyan, dead parts grey; flowing lines carry a moving dash in the direction of flow.
 */

export const LIVE = '#4fdcff';
export const DEAD = '#3a5a60';
export const WATER = '#4fb6ff';
export const SEWAGE = '#b48a5a';
const OPEN = '#4ade6b';
const TRIP = '#ef4444';

export function Wire({ points, live, flow, color = LIVE, width = 3 }: { points: [number, number][]; live: boolean; flow?: boolean; color?: string; width?: number }) {
  const d = `M${points.map((p) => p.join(' ')).join(' L')}`;
  return (
    <g>
      <path d={d} fill="none" stroke={live ? color : DEAD} strokeWidth={width} strokeLinejoin="round" style={live ? { filter: `drop-shadow(0 0 3px ${color}88)` } : undefined} />
      {live && flow && <path d={d} fill="none" stroke="#ffffff" strokeOpacity={0.75} strokeWidth={Math.max(1.5, width - 1.5)} strokeDasharray="6 18" strokeLinecap="round" style={{ animation: 'pf-dash 1.2s linear infinite' }} />}
    </g>
  );
}

export function Bus({ x1, x2, y, live, label, value, color = LIVE }: { x1: number; x2: number; y: number; live: boolean; label?: string; value?: string; color?: string }) {
  return (
    <g>
      <line x1={x1} x2={x2} y1={y} y2={y} stroke={live ? color : DEAD} strokeWidth={7} strokeLinecap="round" style={live ? { filter: `drop-shadow(0 0 4px ${color}aa)` } : undefined} />
      {label && (
        <text x={x1} y={y - 12} fill="#b4d3d8" fontSize={13} fontWeight={600} letterSpacing={0.6}>
          {label}
          {value && (
            <tspan fill={live ? '#ffffff' : '#6f929a'} fontWeight={400}>
              {'  '}
              {value}
            </tspan>
          )}
        </text>
      )}
    </g>
  );
}

interface Clickable {
  selected?: boolean;
  onClick?: () => void;
  title?: string;
}

function Hit({ x, y, w, h, selected, onClick, title, children }: Clickable & { x: number; y: number; w: number; h: number; children: ReactNode }) {
  return (
    <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
      {title && <title>{title}</title>}
      {selected && <rect x={x - 5} y={y - 5} width={w + 10} height={h + 10} rx={6} fill="none" stroke="#4fdcff" strokeWidth={2} strokeDasharray="4 3" />}
      <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} fill="transparent" />
      {children}
    </g>
  );
}

/** Circuit breaker: filled = closed, hollow green = open, red = tripped. */
export function Breaker({ x, y, closed, live, tripped, label, labelSide = 'left', ...hit }: Clickable & { x: number; y: number; closed: boolean; live: boolean; tripped?: boolean; label?: string; labelSide?: 'left' | 'right' | 'below' }) {
  const s = 18;
  const fill = tripped ? TRIP : closed ? (live ? LIVE : '#5f8389') : '#031a1c';
  const stroke = tripped ? TRIP : closed ? '#ffffff' : OPEN;
  return (
    <Hit x={x - s / 2} y={y - s / 2} w={s} h={s} {...hit}>
      <rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx={2} fill={fill} stroke={stroke} strokeWidth={1.6} style={tripped ? { animation: 'pf-alarm-blink 0.9s infinite' } : undefined} />
      {!closed && !tripped && <line x1={x - 5} y1={y + 5} x2={x + 5} y2={y - 5} stroke={OPEN} strokeWidth={1.6} />}
      {label && (
        <text x={labelSide === 'left' ? x - 16 : labelSide === 'right' ? x + 16 : x} y={labelSide === 'below' ? y + 26 : y + 4} fill="#b4d3d8" fontSize={12} textAnchor={labelSide === 'left' ? 'end' : labelSide === 'right' ? 'start' : 'middle'}>
          {label}
        </text>
      )}
    </Hit>
  );
}

export function Transformer({ x, y, live, ...hit }: Clickable & { x: number; y: number; live: boolean }) {
  const c = live ? LIVE : DEAD;
  return (
    <Hit x={x - 16} y={y - 26} w={32} h={52} {...hit}>
      <circle cx={x} cy={y - 9} r={15} fill="#031a1c" stroke={c} strokeWidth={2.4} />
      <circle cx={x} cy={y + 9} r={15} fill="none" stroke={c} strokeWidth={2.4} />
    </Hit>
  );
}

export function Generator({ x, y, live, running, ...hit }: Clickable & { x: number; y: number; live: boolean; running: boolean }) {
  const c = live ? LIVE : running ? '#9be9ff' : DEAD;
  return (
    <Hit x={x - 24} y={y - 24} w={48} h={48} {...hit}>
      <circle cx={x} cy={y} r={24} fill="#031a1c" stroke={c} strokeWidth={2.6} style={live ? { filter: `drop-shadow(0 0 6px ${LIVE}aa)` } : undefined} />
      <text x={x} y={y - 1} textAnchor="middle" fill={live || running ? '#ffffff' : '#6f929a'} fontSize={15} fontWeight={700}>
        G
      </text>
      <path d={`M${x - 10} ${y + 10} q5 -7 10 0 t10 0`} fill="none" stroke={c} strokeWidth={1.8} />
    </Hit>
  );
}

/** A supply entering the diagram (utility incomer, water main). */
export function Source({ x, y, live, label, value, color = LIVE, ...hit }: Clickable & { x: number; y: number; live: boolean; label: string; value?: string; color?: string }) {
  const c = live ? color : DEAD;
  return (
    <Hit x={x - 60} y={y - 22} w={120} h={30} {...hit}>
      <path d={`M${x - 10} ${y - 18} L${x + 10} ${y - 18} L${x} ${y} Z`} fill={c} />
      <text x={x + 18} y={y - 8} fill="#ffffff" fontSize={13} fontWeight={600}>
        {label}
      </text>
      {value && (
        <text x={x + 18} y={y + 8} fill={live ? '#9be9ff' : '#6f929a'} fontSize={12}>
          {value}
        </text>
      )}
    </Hit>
  );
}

/** A named load or outgoing board at the end of a feeder. */
export function LoadBox({ x, y, w = 96, label, value, live, color = LIVE, ...hit }: Clickable & { x: number; y: number; w?: number; label: string; value?: string; live: boolean; color?: string }) {
  const lines = label.split('\n');
  const h = 22 + lines.length * 14;
  return (
    <Hit x={x - w / 2} y={y} w={w} h={h} {...hit}>
      <rect x={x - w / 2} y={y} width={w} height={h} rx={6} fill="rgba(2,18,18,0.85)" stroke={live ? `${color}99` : 'rgba(255,255,255,0.12)'} />
      {lines.map((l, i) => (
        <text key={i} x={x} y={y + 15 + i * 14} textAnchor="middle" fill="#d9f3f6" fontSize={11.5}>
          {l}
        </text>
      ))}
      {value && (
        <text x={x} y={y + h - 7} textAnchor="middle" fill={live ? '#9be9ff' : '#6f929a'} fontSize={12} fontWeight={600}>
          {value}
        </text>
      )}
    </Hit>
  );
}

/** Automatic transfer switch: two inputs (normal from the left, emergency from above), one output. */
export function Ats({ x, y, position, live, ...hit }: Clickable & { x: number; y: number; position: 'normal' | 'emergency'; live: boolean }) {
  const w = 76;
  const h = 56;
  const c = live ? LIVE : DEAD;
  const pivot: [number, number] = [x, y + h / 2 - 8];
  const tip: [number, number] = position === 'normal' ? [x - 22, y - 6] : [x + 2, y - h / 2 + 10];
  return (
    <Hit x={x - w / 2} y={y - h / 2} w={w} h={h} {...hit}>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={8} fill="#031a1c" stroke="rgba(255,255,255,0.25)" />
      <circle cx={x - 26} cy={y - 6} r={3} fill="#b4d3d8" />
      <circle cx={x} cy={y - h / 2 + 8} r={3} fill="#b4d3d8" />
      <line x1={pivot[0]} y1={pivot[1]} x2={tip[0]} y2={tip[1]} stroke={c} strokeWidth={3} strokeLinecap="round" />
      <circle cx={pivot[0]} cy={pivot[1]} r={3.5} fill={c} />
      <text x={x + w / 2 + 8} y={y + 4} fill="#b4d3d8" fontSize={12}>
        ATS
      </text>
    </Hit>
  );
}

export function Label({ x, y, children, anchor = 'start', color = '#b4d3d8', size = 12, weight }: { x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; color?: string; size?: number; weight?: number }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fill={color} fontSize={size} fontWeight={weight}>
      {children}
    </text>
  );
}

export function Legend({ x, y, items }: { x: number; y: number; items: { label: string; swatch: ReactNode }[] }) {
  let cx = x;
  return (
    <g>
      {items.map((it) => {
        const at = cx;
        cx += 34 + it.label.length * 6.6;
        return (
          <g key={it.label} transform={`translate(${at} ${y})`}>
            {it.swatch}
            <text x={24} y={4} fill="#79a4aa" fontSize={12}>
              {it.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/* ---- Process symbols (water, wastewater) --------------------------------------------------------- */

/** A storage tank with its live level. */
export function Tank({ x, y, w, h, level, label, value, color = WATER, ...hit }: Clickable & { x: number; y: number; w: number; h: number; level: number; label: string; value?: string; color?: string }) {
  const fill = Math.max(0, Math.min(1, level));
  return (
    <Hit x={x} y={y} w={w} h={h} {...hit}>
      <rect x={x} y={y} width={w} height={h} rx={6} fill="#031a1c" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} />
      <rect x={x + 2} y={y + 2 + (h - 4) * (1 - fill)} width={w - 4} height={(h - 4) * fill} rx={4} fill={color} fillOpacity={0.35} style={{ transition: 'all .8s' }} />
      <line x1={x + 2} x2={x + w - 2} y1={y + 2 + (h - 4) * (1 - fill)} y2={y + 2 + (h - 4) * (1 - fill)} stroke={color} strokeWidth={1.5} />
      <text x={x + w / 2} y={y - 8} textAnchor="middle" fill="#ffffff" fontSize={12.5} fontWeight={600}>
        {label}
      </text>
      {value && (
        <text x={x + w / 2} y={y + h / 2 + 5} textAnchor="middle" fill="#ffffff" fontSize={13} fontWeight={600}>
          {value}
        </text>
      )}
    </Hit>
  );
}

/** Centrifugal pump: filled while running, red when tripped. */
export function Pump({ x, y, running, tripped, label, color = WATER, ...hit }: Clickable & { x: number; y: number; running: boolean; tripped?: boolean; label?: string; color?: string }) {
  const c = tripped ? TRIP : running ? color : '#5f8389';
  return (
    <Hit x={x - 16} y={y - 16} w={32} h={32} {...hit}>
      <circle cx={x} cy={y} r={15} fill={running ? `${c}33` : '#031a1c'} stroke={c} strokeWidth={2.2} style={tripped ? { animation: 'pf-alarm-blink 0.9s infinite' } : undefined} />
      <path d={`M${x - 7} ${y + 7} L${x + 9} ${y} L${x - 7} ${y - 7} Z`} fill={c} />
      {label && (
        <text x={x} y={y + 30} textAnchor="middle" fill="#b4d3d8" fontSize={11.5}>
          {label}
        </text>
      )}
    </Hit>
  );
}

/**
 * Valve (bow-tie): blue when open, blinking red on a fault. Closed is hollow red, or hollow grey for a
 * valve that is normally closed (zone and washout valves), so only an abnormal shut stands out.
 */
export function Valve({ x, y, open, fault, vertical, label, normallyClosed, ...hit }: Clickable & { x: number; y: number; open: boolean; fault?: boolean; vertical?: boolean; label?: string; normallyClosed?: boolean }) {
  const c = fault ? TRIP : open ? WATER : normallyClosed ? '#79a4aa' : TRIP;
  const d = vertical ? `M${x - 9} ${y - 10} L${x + 9} ${y - 10} L${x - 9} ${y + 10} L${x + 9} ${y + 10} Z` : `M${x - 10} ${y - 9} L${x - 10} ${y + 9} L${x + 10} ${y - 9} L${x + 10} ${y + 9} Z`;
  return (
    <Hit x={x - 11} y={y - 11} w={22} h={22} {...hit}>
      <path d={d} fill={open && !fault ? c : '#031a1c'} stroke={open && !fault ? '#ffffff' : c} strokeWidth={1.5} strokeLinejoin="round" style={fault ? { animation: 'pf-alarm-blink 0.9s infinite' } : undefined} />
      {label && (
        <text x={vertical ? x + 16 : x} y={vertical ? y + 4 : y - 16} textAnchor={vertical ? 'start' : 'middle'} fill="#b4d3d8" fontSize={11.5}>
          {label}
        </text>
      )}
    </Hit>
  );
}

/** Instrument bubble (PT, FT, LT, AT) with its reading. */
export function Instrument({ x, y, code, value, side = 'right', ...hit }: Clickable & { x: number; y: number; code: string; value?: string; side?: 'right' | 'left' | 'above' }) {
  return (
    <Hit x={x - 14} y={y - 14} w={28} h={28} {...hit}>
      <circle cx={x} cy={y} r={14} fill="#031a1c" stroke="#b4d3d8" strokeWidth={1.3} />
      <text x={x} y={y + 4} textAnchor="middle" fill="#ffffff" fontSize={10.5} fontWeight={700}>
        {code}
      </text>
      {value && (
        <text x={side === 'right' ? x + 20 : side === 'left' ? x - 20 : x} y={side === 'above' ? y - 20 : y + 4} textAnchor={side === 'right' ? 'start' : side === 'left' ? 'end' : 'middle'} fill="#9be9ff" fontSize={12} fontWeight={600}>
          {value}
        </text>
      )}
    </Hit>
  );
}
