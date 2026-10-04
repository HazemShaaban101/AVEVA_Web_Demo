import { useEffect, useRef, useState } from 'react';

/**
 * Counts smoothly from the previous value to the new one (ease-out, 700 ms). Renders plain text so it
 * works inside HTML and SVG <text> alike.
 */
export function AnimatedNumber({ value, decimals = 0, duration = 700 }: { value: number; decimals?: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const shownRef = useRef(value);

  useEffect(() => {
    from.current = shownRef.current;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const v = from.current + (value - from.current) * eased;
      shownRef.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{shown.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
}
