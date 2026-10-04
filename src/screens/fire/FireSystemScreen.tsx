import { Panel } from '@/components/frame/Panel';
import { AlarmButton } from '@/components/controls/Controls';
import { Glyph } from '@/components/icons/Glyph';
import { CardIcon } from '@/components/icons/UiIcons';
import { CapsuleState, CountStacked, PillStacked } from '@/widgets/Widgets';
import { row, stack } from '@/screens/layout';
import { useScenario } from '@/sim/scenario';
import { dayAt } from '@/utils/format';

/** Fire › Fire System (design: "Fire System"). Driven by the fire-drill scenario. */
export default function FireSystemScreen() {
  const fire = useScenario((s) => s.fire);
  const trigger = useScenario((s) => s.triggerFireAlarm);
  const resolve = useScenario((s) => s.resolveFireAlarm);
  const [left, center, right] = row(208, 360, 3, { gap: 59 });
  const [s1, s2] = stack(left.x, left.w, 208, [166, 166], 23);
  const flame = <Glyph id="flame" size={20} color="#fff" />;

  return (
    <>
      <Panel frame={s1} index={0} icon={flame} title="Status" subtitle="Current Fire Alarm Status">
        <CapsuleState capsule="Alarms" state={fire.active ? 'Fire Alarm' : 'Normal'} tone={fire.active ? 'bad' : 'good'} />
      </Panel>
      <Panel frame={s2} index={1} icon={flame} title="Status" subtitle="Current Pump Status">
        <CapsuleState capsule="Pumps" state={fire.active ? 'Running' : 'Standby'} tone={fire.active ? 'bad' : 'warn'} />
      </Panel>
      <Panel frame={center} index={2} icon={<CardIcon />} title="Ongoing Alarm Count" subtitle="Number Of Ongoing Alarms">
        <CountStacked
          count={fire.detectors.length}
          alarm={fire.active}
          verdict={fire.active ? { text: 'Urgent Alarms', tone: 'bad' } : { text: 'No Urgent Alarms', tone: 'warn' }}
        />
      </Panel>
      <Panel frame={right} index={3} icon={<CardIcon />} title="Last Alarm" subtitle="Time Of Last Alarm">
        <PillStacked
          capsule={dayAt(fire.lastAlarmAt)}
          capsuleTone={fire.active ? 'alarm' : undefined}
          verdict={fire.active ? { text: 'Alarm Ongoing', tone: 'bad' } : { text: 'Alarm Resolved', tone: 'good' }}
        />
      </Panel>

      <div className="absolute left-1/2 top-[642px] -translate-x-1/2">
        <AlarmButton triggered={fire.active} onTrigger={trigger} onReset={resolve} />
      </div>
    </>
  );
}
