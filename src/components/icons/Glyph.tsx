import type { CSSProperties } from 'react';
import building from '@/assets/icons/building.svg';
import flameSmall from '@/assets/icons/flame-small.svg';
import { NAV_ICONS } from '@/components/icons/navIcons';
import type { GlyphId } from '@/model/navigation';

/** Two small marks that are not navigation glyphs, drawn as CSS masks so they take any color. */
const MASKED = { building, flame: flameSmall } as const;

type AnyGlyph = GlyphId | keyof typeof MASKED;

/** A system glyph (the same paths as the navigation badges) or a small mark, in any size and color. */
export function Glyph({ id, size = 28, color = 'currentColor', style }: { id: AnyGlyph; size?: number; color?: string; style?: CSSProperties }) {
  if (id === 'building' || id === 'flame') {
    const src = MASKED[id];
    return (
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          backgroundColor: color,
          // Quoted: small SVGs are inlined by Vite as data URIs, which contain spaces and quotes.
          WebkitMaskImage: `url("${src}")`,
          maskImage: `url("${src}")`,
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          ...style,
        }}
      />
    );
  }
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill={color} style={style} aria-hidden>
      {NAV_ICONS[id].map((p, i) => (
        <path key={i} d={p.d} opacity={p.opacity} fillRule={p.evenodd ? 'evenodd' : undefined} clipRule={p.evenodd ? 'evenodd' : undefined} />
      ))}
    </svg>
  );
}
