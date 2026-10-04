import { BRAND } from '@/config/brand';

/** The product name, letter-spaced, over the tagline with a short cyan rule (design: page header brand). */
export function Wordmark({ size = 30 }: { size?: number }) {
  return (
    <div className="flex flex-col">
      <span className="font-[family-name:var(--font-brand)] font-bold leading-none text-white" style={{ fontSize: size, letterSpacing: '0.2em', textShadow: '0 0 18px rgba(79,220,255,0.25)' }}>
        {BRAND.name.toUpperCase()}
      </span>
      <span className="mt-[12px] flex items-center gap-[10px]">
        <span aria-hidden className="h-[2px] w-[26px] bg-accent" style={{ boxShadow: '0 0 8px #4fdcff' }} />
        <span className="pf-eyebrow leading-none">{BRAND.tagline}</span>
      </span>
    </div>
  );
}
