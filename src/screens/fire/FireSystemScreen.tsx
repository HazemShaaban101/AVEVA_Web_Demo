import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import aerial from '@/assets/renders/aerial.webp';
import { Panel } from '@/components/frame/Panel';
import { AlarmButton } from '@/components/controls/Controls';
import { Meter, Tag } from '@/components/data/DataTable';
import { Glyph } from '@/components/icons/Glyph';
import { CardIcon } from '@/components/icons/UiIcons';
import { CapsuleState, KpiBody } from '@/widgets/Widgets';
import { row } from '@/screens/layout';
import { useScenario } from '@/sim/scenario';
import { useNow } from '@/sim/clock';
import { dayAt } from '@/utils/format';
import { BUILDINGS, FIRE_ZONES, ZONE1_ALARM_BLOCKS } from '@/model/site';
import { summaryOf } from '@/model/assets/fireAlarm';

const MAP = { x: 131, y: 534, w: 1657, h: 365 };
/** Where the map sits on the stage (its alarm blocks are drawn in the image's own coordinates). */
const MAP_TOP = 553;

/**
 * Fire › Fire System: the whole project at a glance — alarm and pump status, every building's fire
 * alarm devices (click a building for its device page) and the zone map, where alarmed blocks glow
 * red. Driven by the fire-drill scenario. (Fire Detection was merged into this page.)
 */
export default function FireSystemScreen() {
  const fire = useScenario((s) => s.fire);
  const trigger = useScenario((s) => s.triggerFireAlarm);
  const resolve = useScenario((s) => s.resolveFireAlarm);
  const navigate = useNavigate();
  const now = useNow(3000);
  const [hoverZone, setHoverZone] = useState<number | null>(null);
  const status = row(208, 150, 4);
  const cards = row(373, 165, BUILDINGS.length, { gap: 14 });
  const flame = <Glyph id="flame" size={20} color="#ffffff" />;

  return (
    <>
      <Panel frame={status[0]} index={0} icon={flame} title="Status" subtitle="Current Fire Alarm Status">
        <CapsuleState capsule="Alarms" state={fire.active ? 'Fire Alarm' : 'Normal'} tone={fire.active ? 'bad' : 'good'} />
      </Panel>
      <Panel frame={status[1]} index={1} icon={flame} title="Status" subtitle="Current Pump Status">
        <CapsuleState capsule="Pumps" state={fire.active ? 'Running' : 'Standby'} tone={fire.active ? 'warn' : 'good'} />
      </Panel>
      <Panel frame={status[2]} index={2} icon={<CardIcon />} title="Ongoing Alarm Count" subtitle="Number Of Ongoing Alarms">
        <KpiBody source={{ fixed: fire.detectors.length }} decimals={0} unit="" tone={fire.active ? 'bad' : 'good'} note={fire.active ? <Tag tone="bad">Urgent alarms</Tag> : <Tag tone="good">No urgent alarms</Tag>} />
      </Panel>
      <Panel frame={status[3]} index={3} icon={<CardIcon />} title="Last Alarm" subtitle="Time Of Last Alarm">
        <div className="flex h-full flex-col justify-center gap-[10px] px-[22px] pb-[14px]">
          <span className="text-[26px] leading-none text-white">{dayAt(fire.lastAlarmAt)}</span>
          {fire.active ? <Tag tone="bad">Alarm ongoing</Tag> : <Tag tone="good">Alarm resolved</Tag>}
        </div>
      </Panel>

      {BUILDINGS.map((b, i) => {
        const s = summaryOf(b, fire.active, now);
        const ok = Math.round(((s.devices - s.alarms - s.faults - s.disabled) / s.devices) * 100);
        const tone = s.alarms ? 'bad' : s.faults ? 'warn' : 'good';
        return (
          <Panel
            key={b.id}
            frame={cards[i]}
            index={4 + i}
            icon={<Glyph id="building" size={18} color="#ffffff" />}
            title={b.label}
            subtitle={`${b.floors.length} floors · ${s.devices} devices`}
            onClick={() => navigate(`/fire/system/${b.id}`)}
            hint={`Open the fire alarm devices of ${b.label}`}
            style={s.alarms ? { borderColor: '#d96b84', boxShadow: '0 0 24px rgba(217,107,132,0.3)' } : undefined}
          >
            <div className="flex h-full flex-col justify-center gap-[9px] px-[18px] pb-[12px]">
              <Tag tone={tone}>{s.alarms ? `${s.alarms} in alarm` : s.faults ? `${s.faults} fault${s.faults > 1 ? 's' : ''}` : 'Normal'}</Tag>
              <Meter value={ok} tone={tone} width={150} label={false} />
              <span className="text-[12px] text-ink-3">{ok}% healthy · {b.use.split(' · ')[0]}</span>
            </div>
          </Panel>
        );
      })}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25 }}
        className="absolute overflow-hidden"
        style={{ left: MAP.x, top: MAP_TOP, width: MAP.w, height: MAP.h, borderRadius: 16 }}
      >
        <img src={aerial} alt="Site aerial view" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 60px rgba(2,1,2,0.85)' }} />
        <svg className="absolute inset-0" width={MAP.w} height={MAP.h} viewBox={`${MAP.x} ${MAP.y} ${MAP.w} ${MAP.h}`}>
          {FIRE_ZONES.map((z) => (
            <g key={z.id} onMouseEnter={() => setHoverZone(z.id)} onMouseLeave={() => setHoverZone(null)}>
              <rect x={z.x0} y={MAP.y} width={z.x1 - z.x0} height={MAP.h} fill={hoverZone === z.id ? 'rgba(157,120,255,0.08)' : 'transparent'} className="transition-[fill] duration-300" />
              {z.id !== 3 && <line x1={z.x0} x2={z.x0} y1={MAP.y + 20} y2={MAP.y + MAP.h - 20} stroke="rgba(157,120,255,0.35)" strokeDasharray="6 8" />}
              <text x={(z.x0 + z.x1) / 2} y={MAP.y + 34} fill={fire.active && fire.zone === z.id ? '#e59aaa' : 'rgba(255,255,255,0.7)'} fontSize={16} textAnchor="middle" letterSpacing={2}>
                {z.label.toUpperCase()}
                {fire.active && fire.zone === z.id ? ' · ALARM' : ' · NORMAL'}
              </text>
            </g>
          ))}
          <AnimatePresence>
            {fire.active &&
              ZONE1_ALARM_BLOCKS.map((d, i) => (
                <motion.path
                  key={i}
                  d={d}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: [0.55, 1, 0.55], scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ opacity: { duration: 1.2, repeat: Infinity }, scale: { duration: 0.3 } }}
                  fill="#d96b84"
                  fillOpacity={0.4}
                  stroke="#d96b84"
                  strokeWidth={2}
                  style={{ transformOrigin: 'center', transformBox: 'fill-box', filter: 'drop-shadow(0 0 10px rgba(217,107,132,0.9))' }}
                />
              ))}
          </AnimatePresence>
        </svg>
        <div className="pointer-events-none absolute inset-0 border border-accent/60" style={{ borderRadius: 16 }} />
      </motion.div>

      <div className="absolute left-1/2 top-[930px] -translate-x-1/2">
        <AlarmButton triggered={fire.active} onTrigger={trigger} onReset={resolve} />
      </div>
    </>
  );
}
