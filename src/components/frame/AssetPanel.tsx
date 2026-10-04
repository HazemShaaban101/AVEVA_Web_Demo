import { useState, type ReactNode } from 'react';
import { Panel, type PanelProps } from '@/components/frame/Panel';
import { GalaxyPoints } from '@/components/data/GalaxyPoints';
import type { AttrValues, TemplateDef } from '@/model/assets/galaxy';

export interface PointsSource {
  tag: string;
  template: TemplateDef;
  values: AttrValues;
}

interface AssetPanelProps extends Omit<PanelProps, 'action' | 'actionPlacement' | 'children'> {
  /** The asset (or, for a set of equipment, every asset) behind the card. */
  points: PointsSource | PointsSource[];
  children: ReactNode;
}

/**
 * A card for one field asset. Its header carries a "Galaxy points" switch that flips the card to the
 * asset's full attribute list (Tag.Attribute, value, type) — the same data the summary is drawn from.
 */
export function AssetPanel({ points: sources, children, ...panel }: AssetPanelProps) {
  const [points, setPoints] = useState(false);
  const list = Array.isArray(sources) ? sources : [sources];
  return (
    <Panel
      {...panel}
      action={
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPoints((p) => !p);
          }}
          className="pf-chip flex h-[28px] shrink-0 items-center gap-[6px] whitespace-nowrap border px-[10px] text-[12px] font-medium tracking-[0.04em] transition-colors"
          style={points ? { borderColor: '#4fdcff', color: '#9be9ff', background: 'rgba(79,220,255,0.1)' } : { borderColor: 'rgba(79,220,255,0.28)', color: '#8fb4ba', background: 'rgba(79,220,255,0.04)' }}
          title={`Galaxy attributes of ${list.map((x) => x.tag).join(', ')}`}
          aria-pressed={points}
        >
          <span className="font-mono text-[11px]">{'{ }'}</span>
          {points ? 'Summary' : 'Galaxy points'}
        </button>
      }
    >
      {points ? (
        <div className="pf-scroll absolute inset-x-[16px] bottom-[12px] top-[2px]">
          {list.map((x, i) => (
            <div key={x.tag} className={i ? 'mt-[14px]' : undefined}>
              {list.length > 1 && <p className="mb-[4px] font-mono text-[13px] text-white">{x.tag}</p>}
              <GalaxyPoints tag={x.tag} template={x.template} values={x.values} />
            </div>
          ))}
        </div>
      ) : (
        children
      )}
    </Panel>
  );
}
