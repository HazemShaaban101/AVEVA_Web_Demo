import { useState } from 'react';
import { motion } from 'framer-motion';
import { Panel } from '@/components/frame/Panel';
import { AssetPanel } from '@/components/frame/AssetPanel';
import { Readings } from '@/components/data/Readings';
import { DataTable, Meter, Tag, type TagTone } from '@/components/data/DataTable';
import { SiteMap } from '@/components/map/SiteMap';
import { KpiBody } from '@/widgets/Widgets';
import { row } from '@/screens/layout';
import { useNow } from '@/sim/clock';
import { useScenario } from '@/sim/scenario';
import { fmt } from '@/utils/format';
import {
  HYDRANTS,
  HYDRANT_TEMPLATE,
  HYD_DRILL,
  HYD_ISOLATED,
  HYD_TAMPER,
  MIN_RESIDUAL_BAR,
  REQUIRED_FLOW_LPM,
  flowTests,
  hydrantFindings,
  hydrantValues,
  type Hydrant,
} from '@/model/assets/fire';
import type { AttrValues } from '@/model/assets/galaxy';

const num = (v: unknown) => (typeof v === 'number' ? v : 0);
const MARKER: Record<TagTone, string> = { good: '#7fcf9d', warn: '#e8a98c', bad: '#d96b84', info: '#7283ff', idle: '#b5a8c0' };

/** A pillar hydrant: bonnet, barrel and two outlets. */
export function HydrantIcon({ size = 20, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 8a4 4 0 0 1 8 0" />
      <path d="M12 2.5V4" />
      <path d="M7 8h10" />
      <path d="M8 8v12M16 8v12" />
      <path d="M5 21h14" />
      <path d="M8 12H5.5v3H8M16 12h2.5v3H16" />
      <circle cx={12} cy={14} r={1.6} />
    </svg>
  );
}

function hydrantState(v: AttrValues): [string, TagTone] {
  if (v.Flowing) return ['In use', 'info'];
  if (v.Readiness === 2) return ['Not ready', 'bad'];
  if (v.Readiness === 1) return ['Attention', 'warn'];
  return ['Ready', 'good'];
}

/** Fire › Fire Hydrants: readiness of every yard hydrant, live monitor data and the flow-test record. */
export function FireHydrantsScreen() {
  const now = useNow(2000);
  const fireActive = useScenario((s) => s.fire.active);
  const [sel, setSel] = useState<string>(HYD_TAMPER);
  const hydrants = HYDRANTS.map((h) => ({ h, v: hydrantValues(h, now, fireActive) }));
  const ready = hydrants.filter(({ v }) => v.Readiness === 0).length;
  const attention = hydrants.filter(({ v }) => v.Readiness === 1).length;
  const notReady = hydrants.filter(({ v }) => v.Readiness === 2).length;
  const open = hydrants.filter(({ v }) => v.Isolation_Valve_Open).map(({ v }) => num(v.Static_Pressure));
  const overdue = hydrants.filter(({ v }) => num(v.Days_To_Test) < 0);
  const dueSoon = hydrants.filter(({ v }) => num(v.Days_To_Test) >= 0 && num(v.Days_To_Test) <= 60);
  const alarms = hydrants.filter(({ v }) => v.Cap_Tamper || v.Leak_Alarm || v.Impact_Alarm || (v.Pressure_Low_Alarm && v.Isolation_Valve_Open && !v.Flowing));
  const selected = hydrants.find((x) => x.h.tag === sel) ?? hydrants[0];

  const kpis = row(208, 140, 4);
  const map = { x: 52, y: 373, w: 760, h: 330 };
  const chart = { x: 837, y: 373, w: 395, h: 330 };
  const table = { x: 52, y: 728, w: 1180, h: 250 };
  const detail = { x: 1257, y: 373, w: 611, h: 605 };
  const icon = <HydrantIcon />;

  return (
    <>
      <Panel frame={kpis[0]} index={0} icon={icon} title="Hydrants Ready" subtitle="Readiness across the site">
        <KpiBody source={{ fixed: ready }} decimals={0} unit={`/ ${HYDRANTS.length}`} note={<span className="flex flex-col gap-[4px] text-[15px]"><span>{attention} need attention</span><span>{notReady} out of service</span></span>} />
      </Panel>
      <Panel frame={kpis[1]} index={1} icon={icon} title="Hydrant Main Pressure" subtitle="At the in-service hydrants">
        <KpiBody source={{ fixed: Math.min(...open) }} decimals={1} unit="bar" note={<span className="flex flex-col gap-[4px] text-[15px]"><span>to {fmt(Math.max(...open), 1)} bar</span>{fireActive ? <Tag tone="bad">Fire pumps running</Tag> : <span>Jockey holding the main</span>}</span>} />
      </Panel>
      <Panel frame={kpis[2]} index={2} icon={icon} title="Flow Tests" subtitle="Annual test (NFPA 25)">
        <KpiBody source={{ fixed: overdue.length + dueSoon.length }} decimals={0} unit="due" note={<span className="flex flex-col gap-[4px] text-[15px]">{overdue.length ? <Tag tone="warn">{overdue.map((o) => o.h.label).join(', ')} overdue</Tag> : <span>None overdue</span>}<span>{dueSoon.length} in the next 60 days</span></span>} />
      </Panel>
      <Panel frame={kpis[3]} index={3} icon={icon} title="Hydrant Alarms" subtitle="Tamper, leak, impact, pressure">
        <KpiBody source={{ fixed: alarms.length }} decimals={0} unit="" note={alarms.length ? <Tag tone="bad">{alarms.map((a) => `${a.h.label} ${hydrantFindings(a.v).find((f) => f !== 'Low flow at last test')?.toLowerCase() ?? ''}`).join(', ')}</Tag> : 'None'} />
      </Panel>

      <SiteMap frame={map} dim={0.3}>
        {hydrants.map(({ h, v }) => {
          const [, t] = hydrantState(v);
          const on = h.tag === sel;
          return (
            <g key={h.tag} onClick={() => setSel(h.tag)} style={{ cursor: 'pointer' }}>
              {(t === 'bad' || v.Flowing) && <circle cx={h.x} cy={h.y} r={40} fill="none" stroke={MARKER[t]} strokeWidth={5} style={{ animation: 'pf-alarm-blink 1s infinite' }} />}
              <circle cx={h.x} cy={h.y} r={on ? 26 : 20} fill={MARKER[t]} stroke="#ffffff" strokeWidth={on ? 6 : 3} />
              <text x={h.x} y={h.y - 36} textAnchor="middle" fill="#ffffff" fontSize={34} fontWeight={600} style={{ paintOrder: 'stroke', stroke: '#020102', strokeWidth: 8 }}>
                {h.label}
              </text>
            </g>
          );
        })}
      </SiteMap>

      <Panel frame={chart} index={4} icon={icon} title="Flow Test Results" subtitle={`Last test vs ${fmt(REQUIRED_FLOW_LPM)} L/min required`}>
        <FlowTestChart hydrants={hydrants} selected={sel} onSelect={setSel} />
      </Panel>

      <Panel frame={table} index={5} icon={icon} title="Fire Hydrants" subtitle="Click a row, a bar or a marker for the hydrant's details">
        <div className="absolute inset-x-[4px] bottom-[8px] top-[0px]">
          <DataTable
            dense
            rows={hydrants}
            rowKey={(r) => r.h.tag}
            onRowClick={(r) => setSel(r.h.tag)}
            highlight={(r) => (r.v.Readiness === 2 ? 'alarm' : r.v.Readiness === 1 ? 'warn' : null)}
            columns={[
              { key: 't', header: 'Hydrant', width: 80, render: (r) => <span className="text-white">{r.h.label}</span> },
              { key: 'k', header: 'Type', width: 160, render: (r) => r.h.kind },
              { key: 'l', header: 'Location', render: (r) => r.h.location },
              { key: 's', header: 'Readiness', width: 130, render: (r) => { const [tx, tn] = hydrantState(r.v); return <Tag tone={tn}>{tx}</Tag>; } },
              { key: 'sc', header: 'Score', width: 70, align: 'right', render: (r) => `${fmt(num(r.v.Readiness_Score))}%` },
              { key: 'p', header: 'Pressure', width: 100, align: 'right', render: (r) => `${fmt(num(r.v.Static_Pressure), 1)} bar` },
              { key: 'n', header: 'Next test', width: 110, align: 'right', render: (r) => <span className={num(r.v.Days_To_Test) < 0 ? 'text-warn' : undefined}>{num(r.v.Days_To_Test) < 0 ? `${-num(r.v.Days_To_Test)} d late` : `in ${num(r.v.Days_To_Test)} d`}</span> },
            ]}
          />
        </div>
      </Panel>

      <HydrantDetail key={selected.h.tag} frame={detail} h={selected.h} v={selected.v} now={now} />
    </>
  );
}

function HydrantDetail({ frame, h, v, now }: { frame: { x: number; y: number; w: number; h: number }; h: Hydrant; v: AttrValues; now: number }) {
  const [text, tone] = hydrantState(v);
  const findings = hydrantFindings(v);
  const score = num(v.Readiness_Score);
  const tests = flowTests(h, now);
  return (
    <AssetPanel frame={frame} index={6} icon={<HydrantIcon />} title={`${h.label} · ${h.location}`} subtitle={`${h.tag} · ${h.kind}`} points={{ tag: h.tag, template: HYDRANT_TEMPLATE, values: v }}>
      <div className="absolute inset-x-[20px] top-[2px] flex flex-col gap-[14px]">
        <div className="flex flex-wrap items-center gap-[8px]">
          <Tag tone={tone}>{text}</Tag>
          {findings.map((f) => (
            <Tag key={f} tone="idle" dot={false}>
              {f}
            </Tag>
          ))}
        </div>
        <div className="flex items-end gap-[14px]">
          <span className="text-[48px] leading-none text-white tabular-nums">
            {fmt(score)}
            <span className="ml-[6px] text-[18px] text-ink-3">% readiness</span>
          </span>
        </div>
        <Meter value={score} tone={score >= 90 ? 'good' : score >= 60 ? 'warn' : 'bad'} width={frame.w - 60} label={false} />
        <Readings
          cols={2}
          size={15}
          items={[
            { label: 'Main pressure', value: `${fmt(num(v.Static_Pressure), 2)} bar`, tone: v.Pressure_Low_Alarm && !v.Flowing ? 'bad' : undefined },
            { label: 'Isolation valve', value: v.Isolation_Valve_Open ? 'Open' : 'Closed', tone: v.Isolation_Valve_Open ? 'good' : 'bad' },
            { label: 'Outlet cap', value: v.Cap_Tamper ? 'Tampered' : 'Secure', tone: v.Cap_Tamper ? 'bad' : undefined },
            { label: 'Leak / impact', value: v.Leak_Alarm || v.Impact_Alarm ? 'Alarm' : 'None', tone: v.Leak_Alarm || v.Impact_Alarm ? 'bad' : undefined },
            { label: 'Monitor battery', value: `${num(v.Battery_Pct)}%`, tone: num(v.Battery_Pct) < 20 ? 'warn' : undefined },
            { label: 'Last uplink', value: `${Math.round(num(v.Last_Uplink_s) / 60)} min ago` },
          ]}
        />
        <div>
          <p className="mb-[6px] text-[13px] tracking-[0.4px] text-aqua">Flow tests · pitot at the outlet</p>
          {tests.map((t, i) => {
            const pass = t.flow >= REQUIRED_FLOW_LPM && t.residual >= MIN_RESIDUAL_BAR;
            return (
              <div key={t.date} className="grid grid-cols-[110px_1fr_110px_80px] items-center border-b border-white/[0.06] py-[5px] text-[14px] tabular-nums">
                <span className={i ? 'text-ink-3' : 'text-white'}>{t.date}</span>
                <span className="text-ink-2">{fmt(t.flow)} L/min</span>
                <span className="text-ink-2">{fmt(t.residual, 1)} bar res.</span>
                <span className="text-right">
                  <Tag tone={pass ? 'good' : 'warn'} dot={false}>
                    {pass ? 'Pass' : 'Low'}
                  </Tag>
                </span>
              </div>
            );
          })}
        </div>
        {h.tag === HYD_ISOLATED && <p className="rounded-[8px] border border-alarm/40 bg-alarm/10 px-[12px] py-[9px] text-[13px] text-alarm-soft">Isolated for a barrel gasket replacement. Use H-06 or H-08 for this area until it is back in service.</p>}
        {h.tag === HYD_TAMPER && <p className="rounded-[8px] border border-warn/40 bg-warn/10 px-[12px] py-[9px] text-[13px] text-warn-soft">Outlet cap was removed: send a guard to check for unauthorised water use or damage, then re-seal.</p>}
        {v.Flowing && h.tag === HYD_DRILL && <p className="rounded-[8px] border border-[#7283ff]/40 bg-[#7283ff]/10 px-[12px] py-[9px] text-[13px] text-[#9d78ff]">Civil defence connected during the fire alarm. Main pressure drops while it flows.</p>}
      </div>
    </AssetPanel>
  );
}

/** One bar per hydrant: its last test flow, with the required flow as a line. */
function FlowTestChart({ hydrants, selected, onSelect }: { hydrants: { h: Hydrant; v: AttrValues }[]; selected: string; onSelect: (tag: string) => void }) {
  const W = 360;
  const H = 228;
  const pad = { l: 40, r: 6, t: 10, b: 24 };
  const max = 3000;
  const y = (q: number) => pad.t + (1 - q / max) * (H - pad.t - pad.b);
  const step = (W - pad.l - pad.r) / hydrants.length;
  return (
    <div className="absolute inset-x-[14px] bottom-[10px] top-[0px]">
      <svg className="h-full w-full" viewBox={`0 0 ${W} ${H}`}>
        {[0, 1000, 2000, 3000].map((q) => (
          <g key={q}>
            <line x1={pad.l} x2={W - pad.r} y1={y(q)} y2={y(q)} stroke="rgba(255,255,255,0.07)" />
            <text x={pad.l - 6} y={y(q) + 3.5} textAnchor="end" fill="#ffffff" fontSize={10}>
              {q ? `${q / 1000}k` : '0'}
            </text>
          </g>
        ))}
        {hydrants.map(({ h, v }, i) => {
          const q = num(v.LastTest_Flow_Lpm);
          const pass = q >= REQUIRED_FLOW_LPM;
          const on = h.tag === selected;
          const x = pad.l + i * step + step * 0.18;
          const w = step * 0.64;
          return (
            <g key={h.tag} onClick={() => onSelect(h.tag)} style={{ cursor: 'pointer' }}>
              <rect x={pad.l + i * step} y={pad.t} width={step} height={H - pad.t - pad.b} fill="transparent" />
              <motion.rect
                x={x}
                width={w}
                rx={2}
                fill={pass ? '#9d78ff' : '#e8a98c'}
                fillOpacity={on ? 1 : 0.7}
                stroke={on ? '#ffffff' : 'none'}
                strokeWidth={1.5}
                initial={{ y: y(0), height: 0 }}
                animate={{ y: y(q), height: y(0) - y(q) }}
                transition={{ duration: 0.8, delay: 0.3 + i * 0.03 }}
              />
              <text x={x + w / 2} y={H - pad.b + 14} textAnchor="middle" fill={on ? '#9d78ff' : '#ffffff'} fontSize={10}>
                {h.label.slice(2)}
              </text>
            </g>
          );
        })}
        <line x1={pad.l} x2={W - pad.r} y1={y(REQUIRED_FLOW_LPM)} y2={y(REQUIRED_FLOW_LPM)} stroke="#d96b84" strokeDasharray="5 4" strokeWidth={1.3} />
        <text x={W - pad.r} y={y(REQUIRED_FLOW_LPM) - 5} textAnchor="end" fill="#eaaab9" fontSize={10}>
          Required {fmt(REQUIRED_FLOW_LPM)} L/min
        </text>
      </svg>
    </div>
  );
}
