import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { create } from 'zustand';
import { BUILDINGS } from '@/model/site';
import { scopeLabel, useScopeStore } from '@/sim/scope';
import { ChevronDown } from '@/components/icons/UiIcons';
import { Glyph } from '@/components/icons/Glyph';

/** Home-page overlay visibility, shared between the strip's toggle and the campus screen. */
export const useHomeUi = create<{ kpis: boolean; toggleKpis: () => void }>((set) => ({
  kpis: true,
  toggleKpis: () => set((s) => ({ kpis: !s.kpis })),
}));

/**
 * The right of the strip under the header: the demo badge, and — always — what the KPIs on
 * screen describe (the entire project or one building), with a switcher.
 */
export function ScopeBar() {
  const { pathname } = useLocation();
  const scope = useScopeStore((s) => s.scope);
  const setScope = useScopeStore((s) => s.setScope);
  const { kpis, toggleKpis } = useHomeUi();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const home = pathname === '/';
  const inSite = pathname.startsWith('/site/');

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="absolute right-[52px] top-[158px] z-30 flex items-center gap-[10px]">
      <div className="pf-chip flex h-[34px] items-center gap-[8px] border border-warn/40 bg-night-900/70 px-[12px] text-[13px] backdrop-blur" title="Demo: every value is simulated; nothing is connected to devices or servers">
        <span className="h-[7px] w-[7px] rounded-full bg-warn" style={{ boxShadow: '0 0 8px #ffb020' }} />
        <span className="font-bold uppercase tracking-[0.1em] text-warn">Demo</span>
        <span className="text-ink-3">Simulated data</span>
      </div>

      <div ref={ref} className="relative">
        <button
          onClick={() => !inSite && setOpen((o) => !o)}
          className="pf-chip flex h-[34px] items-center gap-[8px] border border-accent/60 bg-accent/[0.06] px-[14px] text-[14px] text-white backdrop-blur transition-colors hover:border-accent"
          style={{ cursor: inSite ? 'default' : 'pointer' }}
          title={inSite ? 'Scoped to the building you are viewing' : 'Change what the KPIs describe'}
        >
          <Glyph id={scope === 'project' ? 'location' : 'building'} size={16} color="#4fdcff" />
          <span className="text-ink-3">KPIs for</span>
          <span className="text-accent">{scopeLabel(scope)}</span>
          {!inSite && <ChevronDown size={14} className="text-ink-3" />}
        </button>
        <AnimatePresence>
          {open && (
            <motion.ul
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="pf-panel pf-panel-solid absolute right-0 top-[40px] w-[250px] overflow-hidden py-[8px]"
            >
              {['project', ...BUILDINGS.map((b) => b.id)].map((id) => (
                <li key={id}>
                  <button
                    onClick={() => {
                      setScope(id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-[14px] py-[8px] text-left text-[14px] hover:bg-white/5 ${scope === id ? 'text-accent' : 'text-ink-2'}`}
                  >
                    {scopeLabel(id)}
                    {id !== 'project' && <span className="text-[11px] text-ink-4">{BUILDINGS.find((b) => b.id === id)?.use.split(' · ')[0]}</span>}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {home && (
        <button onClick={toggleKpis} className="pf-chip h-[34px] border border-accent/25 bg-night-900/70 px-[14px] text-[13px] text-ink-2 backdrop-blur hover:border-accent/60 hover:text-white">
          {kpis ? 'Hide KPIs' : 'Show KPIs'}
        </button>
      )}
    </div>
  );
}
