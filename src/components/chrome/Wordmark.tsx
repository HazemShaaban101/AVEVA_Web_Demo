import { BRAND } from '@/config/brand';

/** The product name, letter-spaced, on two lines: everything but the last word, then the last word. */
export function Wordmark({ size = 25 }: { size?: number }) {
  const words = BRAND.name.toUpperCase().split(' ');
  const first = words.slice(0, -1).join(' ');
  const last = words[words.length - 1];
  return (
    // Letter-spacing leaves a gap after the last letter of each line; the left padding evens it out so the lines centre optically.
    <div className="flex flex-col items-center text-center font-[family-name:var(--font-brand)] font-bold text-white" style={{ fontSize: size, letterSpacing: '0.16em', paddingLeft: '0.16em', lineHeight: 1.3, textShadow: '0 0 18px rgba(157,120,255,0.25)' }}>
      {first && <span>{first}</span>}
      <span>{last}</span>
    </div>
  );
}
