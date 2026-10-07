import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Panel } from '@/components/frame/Panel';
import { Readings } from '@/components/data/Readings';
import { DataTable, Meter, Tag, type TagTone } from '@/components/data/DataTable';
import { RingGauge } from '@/components/gauges/Gauges';
import { Glyph } from '@/components/icons/Glyph';
import { KpiBody } from '@/widgets/Widgets';
import { row } from '@/screens/layout';
import { useNow } from '@/sim/clock';
import { useScenario } from '@/sim/scenario';
import { buildingById } from '@/model/site';
import { deviceValues, devicesOf, type FireDevice, type FireDeviceState, type FireDeviceValues } from '@/model/assets/fireAlarm';

const STATE_TONE: Record<FireDeviceState, TagTone> = { Normal: 'good', Alarm: 'bad', Sounding: 'bad', Fault: 'warn', Disabled: 'idle' };

/**
 * Fire › Fire System › one building: every fire alarm device on its loop (detectors, call points,
 * sounders) with live state, and the selected device's readings. The same layout as the hydrants page.
 */
export default function FireBuildingScreen() {
  const { building } = useParams();
  const b = buildingById(building);
  const fireActive = useScenario((s) => s.fire.active);
  const now = useNow(2000);
  const navigate = useNavigate();
  const [floor, setFloor] = useState<string | null>(null);
  const all = useMemo(() => (b ? devicesOf(b) : []), [b]);
  const [sel, setSel] = useState<string | null>(null);
  if (!b) return <Navigate to="/fire/system" replace />;

  const rows = all.map((d) => ({ d, v: deviceValues(d, fireActive, now) }));
  const shown = floor ? rows.filter((r) => r.d.floor === floor) : rows;
  const count = (s: FireDeviceState) => rows.filter((r) => r.v.state === s).length;
  const alarms = count('Alarm');
  const sounding = count('Sounding');
  const faults = count('Fault');
  const disabled = count('Disabled');
  const normal = count('Normal');
  const selected = rows.find((r) => r.d.tag === sel) ?? rows.find((r) => r.v.state === 'Alarm') ?? rows.find((r) => r.v.state === 'Fault') ?? rows[0];
  const floors = [...new Set(all.map((d) => d.floor))];

  const kpis = row(208, 140, 4);
  const floorsFrame = { x: 52, y: 373, w: 760, h: 330 };
  const ring = { x: 837, y: 373, w: 395, h: 330 };
  const table = { x: 52, y: 728, w: 1180, h: 250 };
  const detail = { x: 1257, y: 373, w: 611, h: 605 };
  const icon = <Glyph id="flame" size={20} color="#ffffff" />;

  return (
    <>
      <Panel frame={kpis[0]} index={0} icon={icon} title="Fire Alarm Devices" subtitle={`Building ${b.label} · ${b.floors.length} floors`}>
        <KpiBody source={{ fixed: all.length }} decimals={0} unit="devices" note={<span className="flex flex-col gap-[4px] text-[15px]"><span>{normal} normal</span><span>{rows.filter((r) => r.d.kind === 'Smoke detector').length} smoke detectors</span></span>} />
      </Panel>
      <Panel frame={kpis[1]} index={1} icon={icon} title="In Alarm" subtitle="Detectors and call points">
        <KpiBody source={{ fixed: alarms }} decimals={0} unit="" tone={alarms ? 'bad' : 'good'} note={alarms ? <Tag tone="bad">{sounding} sounders active</Tag> : <Tag tone="good">No alarms</Tag>} />
      </Panel>
      <Panel frame={kpis[2]} index={2} icon={icon} title="Faults" subtitle="Dust, battery, loop trouble">
        <KpiBody source={{ fixed: faults }} decimals={0} unit="" tone={faults ? 'warn' : 'good'} note={faults ? <Tag tone="warn">Service required</Tag> : <Tag tone="good">None</Tag>} />
      </Panel>
      <Panel frame={kpis[3]} index={3} icon={icon} title="Fire Panel" subtitle={`FACP-${b.label} · loop L1`}>
        <KpiBody source={{ fixed: disabled }} decimals={0} unit="disabled" tone={alarms ? 'bad' : 'good'} note={alarms ? <Tag tone="bad">Panel in alarm</Tag> : <Tag tone="good">Panel normal</Tag>} />
      </Panel>

      <Panel frame={floorsFrame} index={4} icon={icon} title="Floors" subtitle="Click a floor to filter the devices" action={floor ? <button onClick={() => setFloor(null)} className="pf-chip h-[30px] border border-accent/40 px-[12px] text-[13px] text-accent">Show all floors</button> : undefined}>
        <div className="absolute inset-x-[20px] top-[0px] flex flex-col gap-[6px]">
          {floors.map((f) => {
            const fr = rows.filter((r) => r.d.floor === f);
            const fa = fr.filter((r) => r.v.state === 'Alarm').length;
            const ff = fr.filter((r) => r.v.state === 'Fault').length;
            const tone: TagTone = fa ? 'bad' : ff ? 'warn' : 'good';
            const on = floor === f;
            return (
              <button
                key={f}
                onClick={() => setFloor(on ? null : f)}
                className={`flex items-center gap-[16px] rounded-[10px] border px-[14px] py-[3px] text-left transition-colors ${on ? 'border-accent/70 bg-accent/10' : 'border-white/[0.06] hover:bg-white/[0.04]'}`}
              >
                <span className="w-[44px] text-[18px] font-medium text-white">{f}</span>
                <span className="w-[110px] text-[14px] text-ink-3">{fr.length} devices</span>
                <Meter value={((fr.length - fa - ff) / fr.length) * 100} tone={tone} width={260} label={false} />
                <span className="ml-auto">{fa ? <Tag tone="bad">{fa} in alarm</Tag> : ff ? <Tag tone="warn">{ff} fault</Tag> : <Tag tone="good">Normal</Tag>}</span>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel frame={ring} index={5} icon={icon} title="Device Status" subtitle="Every device on the loop">
        <div className="flex h-full items-center pb-[8px]">
          <div className="flex w-[52%] justify-center">
            <RingGauge
              value={`${Math.round((normal / all.length) * 100)}%`}
              unit="normal"
              size={170}
              segments={[
                { value: normal, color: '#7fcf9d' },
                { value: faults, color: '#e8a98c' },
                { value: alarms + sounding, color: '#d96b84' },
                { value: disabled, color: '#8a7a9a' },
              ]}
            />
          </div>
          <div className="flex flex-col gap-[10px]">
            <Tag tone="good">Normal · {normal}</Tag>
            <Tag tone="bad">Alarm · {alarms + sounding}</Tag>
            <Tag tone="warn">Fault · {faults}</Tag>
            <Tag tone="idle">Disabled · {disabled}</Tag>
          </div>
        </div>
      </Panel>

      <Panel frame={table} index={6} icon={icon} title={`Devices · ${b.label}${floor ? ` · ${floor}` : ''}`} subtitle="Click a row for the device's details">
        <div className="absolute inset-x-[4px] bottom-[8px] top-[0px]">
          <DataTable
            dense
            rows={shown}
            rowKey={(r) => r.d.tag}
            onRowClick={(r) => setSel(r.d.tag)}
            highlight={(r) => (r.v.state === 'Alarm' || r.v.state === 'Sounding' ? 'alarm' : r.v.state === 'Fault' ? 'warn' : null)}
            columns={[
              { key: 't', header: 'Device', width: 150, render: (r) => <span className="font-mono text-[13px] text-white">{r.d.tag}</span> },
              { key: 'k', header: 'Type', width: 170, render: (r) => r.d.kind },
              { key: 'l', header: 'Location', render: (r) => r.d.location },
              { key: 'a', header: 'Address', width: 90, render: (r) => <span className="font-mono text-[13px] text-ink-3">{r.d.address}</span> },
              { key: 's', header: 'State', width: 130, render: (r) => <Tag tone={STATE_TONE[r.v.state]}>{r.v.state}</Tag> },
              { key: 'b', header: 'Battery', width: 80, align: 'right', render: (r) => <span className={r.v.battery < 20 ? 'text-warn' : undefined}>{r.v.battery}%</span> },
            ]}
          />
        </div>
      </Panel>

      <DeviceDetail frame={detail} d={selected.d} v={selected.v} onBack={() => navigate('/fire/system')} />
    </>
  );
}

function DeviceDetail({ frame, d, v, onBack }: { frame: { x: number; y: number; w: number; h: number }; d: FireDevice; v: FireDeviceValues; onBack: () => void }) {
  const tone = STATE_TONE[v.state];
  const bad = v.state === 'Alarm' || v.state === 'Sounding';
  return (
    <Panel frame={frame} index={7} icon={<Glyph id="flame" size={20} color="#ffffff" />} title={d.tag} subtitle={`${d.kind} · ${d.location}`}>
      <div className="absolute inset-x-[20px] top-[2px] flex flex-col gap-[16px]">
        <div className="flex items-center gap-[10px]">
          <Tag tone={tone}>{v.state}</Tag>
          {v.note && <Tag tone="idle" dot={false}>{v.note}</Tag>}
        </div>
        <Readings
          cols={2}
          size={15}
          items={[
            { label: 'Loop address', value: d.address },
            { label: 'Fire panel', value: `FACP-${d.tag.split('-')[0]}` },
            ...(d.kind === 'Smoke detector' ? [{ label: 'Chamber contamination', value: `${v.reading}%`, tone: (v.reading ?? 0) > 50 ? ('warn' as const) : bad ? ('bad' as const) : undefined }] : []),
            ...(d.kind === 'Heat detector' ? [{ label: 'Temperature', value: `${v.reading} °C`, tone: bad ? ('bad' as const) : undefined }] : []),
            { label: 'Battery / supply', value: `${v.battery}%`, tone: v.battery < 20 ? ('warn' as const) : undefined },
            { label: 'Loop signal', value: `${v.signal}%` },
            { label: 'Last function test', value: v.lastTest },
            { label: 'Output', value: d.kind === 'Sounder / strobe' ? (v.state === 'Sounding' ? 'Sounding' : 'Silent') : '—', tone: v.state === 'Sounding' ? ('bad' as const) : undefined },
          ]}
        />
        {bad && <p className="rounded-[8px] border border-alarm/40 bg-alarm/10 px-[12px] py-[9px] text-[13px] text-alarm-soft">Device in alarm: the fire drill has raised the building&rsquo;s fire panel. Reset the alarm on the Fire System page.</p>}
        {v.state === 'Fault' && <p className="rounded-[8px] border border-warn/40 bg-warn/10 px-[12px] py-[9px] text-[13px] text-warn-soft">{v.note}. A maintenance ticket can be raised from Maintenance &rsaquo; Ticketing.</p>}
        <button onClick={onBack} className="pf-chip self-start border border-accent/40 bg-accent/[0.06] px-[16px] py-[8px] text-[14px] text-accent hover:bg-accent/15">
          ‹ All buildings
        </button>
      </div>
    </Panel>
  );
}
