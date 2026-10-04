import { Panel } from '@/components/frame/Panel';

/** Fallback for a subsystem whose screen isn't registered (never shown once every screen exists). */
export function ComingSoon({ system, subsystem }: { system: string; subsystem: string }) {
  return (
    <Panel title={`${system} · ${subsystem}`} subtitle="This view is being prepared" frame={{ x: 52, y: 208, w: 1816, h: 770 }}>
      <div className="flex h-full items-center justify-center text-[24px] text-ink-3">No data source connected yet.</div>
    </Panel>
  );
}
