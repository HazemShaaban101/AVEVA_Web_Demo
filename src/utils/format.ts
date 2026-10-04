export function timeAgo(t: number): string {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

/** "Yesterday At 16:32" / "Today At 09:14" / "Oct 12 At 18:02" — the design's last-event phrasing. */
export function dayAt(t: number): string {
  const d = new Date(t);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const hm = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `Today At ${hm}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday At ${hm}`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} At ${hm}`;
}

export function fmt(v: number | null | undefined, decimals = 0): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
