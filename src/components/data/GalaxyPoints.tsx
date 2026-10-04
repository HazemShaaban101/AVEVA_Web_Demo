import { formatAttr, type AttrValues, type TemplateDef } from '@/model/assets/galaxy';

/**
 * The Galaxy view of one asset: every attribute of its template as `Tag.Attribute`, its current
 * value and its data type. This is what an operator (or an integrator binding the view to the live
 * Galaxy) sees behind each card.
 */
export function GalaxyPoints({ tag, template, values, highlight }: { tag: string; template: TemplateDef; values: AttrValues; highlight?: string[] }) {
  return (
    <div className="font-[family-name:var(--font-plain)] text-[13px]">
      <p className="mb-[8px] text-[12px] text-ink-3">
        <span className="text-aqua">{template.name}</span> · {template.io}
      </p>
      {template.attrs.map((a) => {
        const v = values[a.name];
        const hot = highlight?.includes(a.name);
        const alarm = typeof v === 'boolean' && v && /Alarm|Trip|Fault|Shutdown|Flood|Intrusion|High_High|Overflow/.test(a.name);
        return (
          <div key={a.name} className="flex items-center justify-between gap-[10px] border-b border-white/[0.06] py-[5px]" title={a.desc} style={hot ? { background: 'rgba(79,220,255,0.08)' } : undefined}>
            <span className="min-w-0 truncate font-mono text-[12px] text-ink-2">
              <span className="text-ink-4">{tag}.</span>
              {a.name}
            </span>
            <span className="flex shrink-0 items-center gap-[8px]">
              <span className={alarm ? 'font-medium text-alarm-soft' : 'text-white'}>{formatAttr(a, v ?? null)}</span>
              <span className="w-[52px] text-right text-[10px] uppercase tracking-[0.5px] text-ink-4">{a.type}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
