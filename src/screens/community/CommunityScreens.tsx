import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Panel } from '@/components/frame/Panel';
import { ChatIcon, PeopleIcon, PhoneIcon, RouteIcon } from '@/components/icons/UiIcons';
import { Meter, Tag, clockTime, type TagTone } from '@/components/data/DataTable';
import { RingGauge } from '@/components/gauges/Gauges';
import { Hairline } from '@/components/controls/Controls';
import { SiteMap } from '@/components/map/SiteMap';
import { DialVerdict, KpiBody } from '@/widgets/Widgets';
import { TrendCard } from '@/widgets/TrendCard';
import { vsAverage } from '@/widgets/verdicts';
import { row, stack } from '@/screens/layout';
import { pickFrom, useEventCountToday, useEventStream, type StreamSpec } from '@/sim/events';
import { useSignal } from '@/sim/useSignal';
import { useNow } from '@/sim/clock';
import { fbm } from '@/sim/noise';
import { fmt } from '@/utils/format';

/* =================================================================================================
 * Application (visitor app)
 * ================================================================================================= */

const FEATURES = [
  { name: 'Wayfinding', share: 0.31, color: '#9d78ff' },
  { name: 'Offers & Coupons', share: 0.24, color: '#b58ce3' },
  { name: 'Parking Payment', share: 0.16, color: '#7fcf9d' },
  { name: 'Loyalty Points', share: 0.13, color: '#5b7cff' },
  { name: 'Events & Cinema', share: 0.1, color: '#e59aaa' },
  { name: 'Store Directory', share: 0.06, color: '#ffffff' },
];

export function ApplicationScreen() {
  const [dial, rating, stats] = row(208, 330, [600, 590, 576]);
  const [s1, s2] = stack(stats.x, stats.w, 208, [153, 152]);
  const [features, trend] = row(563, 415, [700, 1066]);
  const users = useSignal('community.activeUsers', 5000).value;
  const now = useNow(60_000);
  const downloads = 184_320 + Math.floor((now - new Date('2026-09-01').getTime()) / 3_600_000) * 37;
  const phone = <PhoneIcon />;

  return (
    <>
      <Panel frame={dial} index={0} icon={phone} title="Active Users" subtitle="Visitors using the mall app right now">
        <DialVerdict source={{ sim: 'community.activeUsers' }} max={3000} unit="users" verdict={vsAverage(0.05)} />
      </Panel>
      <Panel frame={rating} index={1} icon={phone} title="App Rating" subtitle="App Store & Google Play, last 30 days">
        <div className="flex h-full items-center">
          <div className="flex w-[48%] justify-center">
            <RingGauge
              value="4.6"
              unit="of 5"
              segments={[
                { value: 71, color: '#7fcf9d' },
                { value: 17, color: '#9d78ff' },
                { value: 12, color: '#d96b84' },
              ]}
            />
          </div>
          <Hairline />
          <ul className="flex-1 space-y-[12px] pl-[40px] text-[16px] text-ink-2">
            {[
              ['5–4 ★', '71%', '#7fcf9d'],
              ['3 ★', '17%', '#9d78ff'],
              ['2–1 ★', '12%', '#d96b84'],
            ].map(([k, v, c]) => (
              <li key={k} className="flex items-center gap-[10px]">
                <span className="h-[8px] w-[8px] rounded-full" style={{ background: c }} />
                {k}
                <span className="ml-auto pr-[40px] text-white">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>
      <Panel frame={s1} index={2} icon={phone} title="Downloads" subtitle="Since launch">
        <KpiBody source={{ fixed: downloads }} decimals={0} unit="" note={<Tag tone="good">+37 / hour</Tag>} />
      </Panel>
      <Panel frame={s2} index={3} icon={phone} title="Sessions" subtitle="Right now">
        <KpiBody source={{ sim: 'community.sessions' }} decimals={0} unit="" note={`${fmt(users * 0.62)} in-mall`} />
      </Panel>

      <Panel frame={features} index={4} icon={phone} title="Feature Usage" subtitle="Share of sessions today">
        <div className="absolute inset-x-[24px] top-[20px] flex flex-col gap-[22px]">
          {FEATURES.map((f, i) => (
            <div key={f.name} className="flex items-center gap-[16px] text-[16px]">
              <span className="w-[180px] text-white">{f.name}</span>
              <div className="relative h-[10px] flex-1 overflow-hidden rounded-full bg-white/10">
                <motion.span className="absolute inset-y-0 left-0 rounded-full" style={{ background: f.color, boxShadow: `0 0 10px ${f.color}` }} initial={{ width: 0 }} animate={{ width: `${(f.share / 0.31) * 100}%` }} transition={{ duration: 1, delay: 0.2 + i * 0.08 }} />
              </div>
              <span className="w-[48px] text-right tabular-nums text-ink-2">{Math.round(f.share * 100)}%</span>
            </div>
          ))}
        </div>
      </Panel>
      <TrendCard frame={trend} index={5} icon={phone} title="Active Users" subtitle="Hourly, with the expected curve" sim="community.activeUsers" yTitle="Users" decimals={0} />
    </>
  );
}

/* =================================================================================================
 * Navigation (wayfinding kiosks)
 * ================================================================================================= */

const KIOSKS = [
  { id: 'K1', x: 320, y: 700 },
  { id: 'K2', x: 640, y: 560 },
  { id: 'K3', x: 930, y: 660 },
  { id: 'K4', x: 1200, y: 540 },
  { id: 'K5', x: 1470, y: 700 },
  { id: 'K6', x: 1760, y: 580 },
  { id: 'K7', x: 2030, y: 660 },
  { id: 'K8', x: 2260, y: 560 },
];

const PLACES = [
  { name: 'Cinema', x: 1560, y: 430 },
  { name: 'Food Court', x: 1020, y: 420 },
  { name: 'Hypermarket', x: 360, y: 420 },
  { name: 'Kids Zone', x: 1880, y: 440 },
  { name: 'Pharmacy', x: 700, y: 440 },
  { name: 'Customer Service', x: 1300, y: 460 },
  { name: 'Prayer Room', x: 2150, y: 440 },
  { name: 'Parking P1', x: 520, y: 900 },
  { name: 'Clinics', x: 2250, y: 780 },
];

const QUERIES: StreamSpec<{ kiosk: (typeof KIOSKS)[number]; place: (typeof PLACES)[number] }> = {
  id: 'nav.queries',
  peakPerHour: 260,
  profile: 'occupancy',
  make: (_, rnd) => ({ kiosk: pickFrom(KIOSKS, rnd(1)), place: PLACES[Math.min(PLACES.length - 1, Math.floor(rnd(2) ** 1.6 * PLACES.length))] }),
};

/** Route: kiosk → promenade → along it → up to the destination. */
function routePath(k: { x: number; y: number }, p: { x: number; y: number }) {
  const promenade = 800;
  return `M${k.x} ${k.y} L${k.x} ${promenade} L${p.x} ${promenade} L${p.x} ${p.y}`;
}

export function NavigationScreen() {
  const queries = useEventStream(QUERIES, 40);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setShown((s) => (s + 1) % 6), 5000);
    return () => clearInterval(t);
  }, []);
  const q = queries[shown];
  const counts = PLACES.map((p) => ({ p, n: queries.filter((e) => e.data.place.name === p.name).length })).sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...counts.map((c) => c.n));
  const map = { x: 52, y: 208, w: 1260, h: 470 };
  const [top, kiosks] = stack(1337, 531, 208, [440, 305]);
  const trend = { x: 52, y: 703, w: 1260, h: 275 };

  return (
    <>
      <SiteMap frame={map}>
        {PLACES.map((p) => (
          <g key={p.name}>
            <circle cx={p.x} cy={p.y} r={10} fill="#b58ce3" opacity={0.9} />
            <text x={p.x} y={p.y - 20} fill="#ffffff" fontSize={26} textAnchor="middle" style={{ paintOrder: 'stroke', stroke: '#020102', strokeWidth: 6 }}>
              {p.name}
            </text>
          </g>
        ))}
        {KIOSKS.map((k) => (
          <g key={k.id}>
            <rect x={k.x - 16} y={k.y - 16} width={32} height={32} rx={6} fill={q?.data.kiosk.id === k.id ? '#9d78ff' : '#07050a'} stroke="#9d78ff" strokeWidth={2} />
            <text x={k.x} y={k.y + 7} fill={q?.data.kiosk.id === k.id ? '#020102' : '#9d78ff'} fontSize={18} textAnchor="middle" fontWeight={600}>
              {k.id.slice(1)}
            </text>
          </g>
        ))}
        <AnimatePresence mode="wait">
          {q && (
            <motion.g key={q.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.path d={routePath(q.data.kiosk, q.data.place)} fill="none" stroke="#9d78ff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, ease: 'easeInOut' }} style={{ filter: 'drop-shadow(0 0 10px rgba(157,120,255,0.8))' }} />
              <path d={routePath(q.data.kiosk, q.data.place)} fill="none" stroke="#ffffff" strokeWidth={3} strokeDasharray="4 22" strokeLinecap="round" style={{ animation: 'pf-dash 1s linear infinite' }} />
              <circle cx={q.data.place.x} cy={q.data.place.y} r={22} fill="none" stroke="#9d78ff" strokeWidth={4}>
                <animate attributeName="r" values="14;34;14" dur="1.6s" repeatCount="indefinite" />
              </circle>
            </motion.g>
          )}
        </AnimatePresence>
      </SiteMap>
      <AnimatePresence mode="wait">
        {q && (
          <motion.div key={q.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute left-[92px] top-[228px] z-10 rounded-[8px] border border-accent/60 bg-night-900/85 px-[16px] py-[10px] backdrop-blur">
            <p className="text-[13px] text-ink-3">Kiosk {q.data.kiosk.id} · {clockTime(q.t)}</p>
            <p className="text-[20px] text-white">
              Route to <span className="text-accent">{q.data.place.name}</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <Panel frame={top} index={1} icon={<RouteIcon />} title="Top Destinations" subtitle="Kiosk and app searches, last 6 hours">
        <div className="absolute inset-x-[20px] top-[14px] flex flex-col gap-[14px]">
          {counts.slice(0, 8).map(({ p, n }) => (
            <div key={p.name} className="flex items-center gap-[12px] text-[15px]">
              <span className="w-[150px] text-white">{p.name}</span>
              <div className="relative h-[8px] flex-1 overflow-hidden rounded-full bg-white/10">
                <motion.span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ boxShadow: '0 0 8px #9d78ff' }} animate={{ width: `${(n / max) * 100}%` }} />
              </div>
              <span className="w-[32px] text-right tabular-nums text-ink-3">{n}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel frame={kiosks} index={2} icon={<RouteIcon />} title="Kiosks" subtitle="8 wayfinding kiosks">
        <div className="absolute inset-x-[20px] top-[10px] grid grid-cols-2 gap-x-[24px] gap-y-[10px] text-[14px]">
          {KIOSKS.map((k) => (
            <div key={k.id} className="flex items-center justify-between border-b border-white/[0.06] pb-[6px] text-ink-2">
              Kiosk {k.id}
              <Tag tone={k.id === 'K6' ? 'warn' : 'good'}>{k.id === 'K6' ? 'Paper low' : 'Online'}</Tag>
            </div>
          ))}
        </div>
      </Panel>
      <TrendCard frame={trend} index={3} icon={<RouteIcon />} title="Kiosk Queries" subtitle="Searches per hour" sim="community.kioskQueries" yTitle="Queries" decimals={0} />
    </>
  );
}

/* =================================================================================================
 * Crowd monitoring
 * ================================================================================================= */

const CROWD_ZONES = [
  { id: 'Z1', name: 'Hypermarket Plaza', x: 420, y: 560, area: 5200, bias: 0.9 },
  { id: 'Z2', name: 'West Pavilions', x: 760, y: 600, area: 4100, bias: 0.6 },
  { id: 'Z3', name: 'Food Court', x: 1040, y: 520, area: 3600, bias: 1.25 },
  { id: 'Z4', name: 'Central Boulevard', x: 1320, y: 640, area: 6800, bias: 1.0 },
  { id: 'Z5', name: 'Cinema Forecourt', x: 1580, y: 520, area: 2900, bias: 1.35 },
  { id: 'Z6', name: 'Kids Zone', x: 1880, y: 600, area: 2400, bias: 0.8 },
  { id: 'Z7', name: 'East Gardens', x: 2170, y: 620, area: 5600, bias: 0.55 },
];

function useCrowd() {
  const now = useNow(5000);
  const visitors = useSignal('community.visitors', 5000).value;
  const weights = CROWD_ZONES.map((z, i) => z.bias * (1 + 0.35 * fbm(now / 600_000 + i * 7.1, 991 + i)));
  const total = weights.reduce((a, b) => a + b, 0);
  return CROWD_ZONES.map((z, i) => {
    const people = Math.round((visitors * 0.55 * weights[i]) / total);
    const density = people / z.area; // people per m²
    const level: [string, TagTone] = density > 0.55 ? ['Dense', 'bad'] : density > 0.3 ? ['Busy', 'warn'] : ['Free', 'good'];
    return { ...z, people, density, level };
  });
}

export function CrowdScreen() {
  const zones = useCrowd();
  const map = { x: 52, y: 208, w: 1250, h: 470 };
  const [trend] = row(703, 275, 1, { width: 1250 });
  const side = { x: 1327, y: 208, w: 541, h: 770 };
  const dense = zones.filter((z) => z.level[1] === 'bad').length;

  return (
    <>
      <SiteMap frame={map} dim={0.35}>
        <defs>
          <radialGradient id="heat">
            <stop offset="0" stopColor="#d96b84" stopOpacity="0.85" />
            <stop offset="0.35" stopColor="#e8a98c" stopOpacity="0.55" />
            <stop offset="0.7" stopColor="#6174ff" stopOpacity="0.25" />
            <stop offset="1" stopColor="#6174ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {zones.map((z) => {
          const r = 90 + Math.sqrt(z.people) * 5.5;
          return (
            <g key={z.id}>
              <motion.circle cx={z.x} cy={z.y} r={r * 0.94} fill="url(#heat)" animate={{ r: [r * 0.94, r * 1.04, r * 0.94], opacity: 0.35 + Math.min(0.6, z.density) }} transition={{ r: { duration: 4, repeat: Infinity }, opacity: { duration: 1 } }} style={{ mixBlendMode: 'screen' }} />
              <text x={z.x} y={z.y + 8} fill="#ffffff" fontSize={28} textAnchor="middle" style={{ paintOrder: 'stroke', stroke: '#020102', strokeWidth: 7 }}>
                {fmt(z.people)}
              </text>
            </g>
          );
        })}
      </SiteMap>
      <div className="absolute left-[92px] top-[228px] flex items-center gap-[12px] rounded-full border border-white/15 bg-night-900/80 px-[16px] py-[6px] text-[13px] text-ink-2 backdrop-blur">
        Density
        <span className="h-[8px] w-[120px] rounded-full" style={{ background: 'linear-gradient(90deg, #6174ff, #e8a98c, #d96b84)' }} />
        people / m²
      </div>
      <TrendCard frame={trend} index={1} icon={<PeopleIcon />} title="Visitors On Site" subtitle="Counted by cameras at every entrance" sim="community.visitors" yTitle="Visitors" decimals={0} />
      <Panel frame={side} index={2} icon={<PeopleIcon />} title="Zones" subtitle={dense ? `${dense} dense zone${dense > 1 ? 's' : ''} · stewards alerted` : 'All zones within comfort limits'}>
        <div className="absolute inset-x-[20px] top-[10px] flex flex-col gap-[12px]">
          <div className="mb-[4px] flex items-baseline gap-[10px]">
            <span className="text-[48px] leading-none text-white">{fmt(zones.reduce((a, z) => a + z.people, 0))}</span>
            <span className="text-[16px] text-[#b09dc1]">people in monitored zones</span>
          </div>
          {zones.map((z) => (
            <div key={z.id} className="border-b border-white/[0.06] pb-[10px]">
              <div className="flex items-center justify-between text-[16px]">
                <span className="text-white">{z.name}</span>
                <Tag tone={z.level[1]}>{z.level[0]}</Tag>
              </div>
              <div className="mt-[6px] flex items-center justify-between text-[13px] text-ink-3">
                <Meter value={Math.min(100, (z.density / 0.8) * 100)} tone={z.level[1]} width={300} />
                <span>{z.density.toFixed(2)} / m²</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

/* =================================================================================================
 * Social media
 * ================================================================================================= */

const PLATFORMS = [
  { name: 'Instagram', color: '#e1306c' },
  { name: 'X', color: '#ffffff' },
  { name: 'Facebook', color: '#465bf5' },
  { name: 'TikTok', color: '#b071f8' },
];

const POST_TEXT: [string, 'Positive' | 'Neutral' | 'Negative'][] = [
  ['The light show at the mall tonight was amazing ✨', 'Positive'],
  ['Parking guidance screens made it so easy to find a spot', 'Positive'],
  ['Food court is packed, took 20 minutes to get a table', 'Negative'],
  ['New cinema screens are huge! Loved the experience', 'Positive'],
  ['Anyone know the opening hours for the kids zone?', 'Neutral'],
  ['Great offers in the app this weekend #MallLife', 'Positive'],
  ['AC on the second floor felt a bit warm today', 'Negative'],
  ['Meeting friends at the central boulevard, see you there', 'Neutral'],
  ['The rooftop garden is the best spot in New Cairo', 'Positive'],
  ['Long queue at gate G3 exit around 10 pm', 'Negative'],
];

const POSTS: StreamSpec<{ platform: (typeof PLATFORMS)[number]; handle: string; text: string; sentiment: 'Positive' | 'Neutral' | 'Negative'; likes: number }> = {
  id: 'social.posts',
  peakPerHour: 60,
  profile: 'retail',
  make: (_, rnd) => {
    // Mostly positive, like the mall's overall sentiment; then a post of that sentiment.
    const r = rnd(1);
    const want = r < 0.72 ? 'Positive' : r < 0.9 ? 'Neutral' : 'Negative';
    const [text, sentiment] = pickFrom(POST_TEXT.filter((p) => p[1] === want), rnd(6));
    return { platform: pickFrom(PLATFORMS, rnd(2)), handle: `@${pickFrom(['nour', 'omar', 'salma', 'karim', 'dina', 'youssef', 'mariam', 'ali'], rnd(3))}_${Math.floor(rnd(4) * 900 + 100)}`, text, sentiment, likes: Math.floor(rnd(5) ** 3 * 2400) };
  },
};

const HASHTAGS = ['#MallLife', '#NewCairo', '#WeekendVibes', '#FoodCourt', '#CinemaNight', '#RooftopGarden'];
const SENT_TONE = { Positive: 'good', Neutral: 'info', Negative: 'bad' } as const;

export function SocialScreen() {
  const posts = useEventStream(POSTS, 12);
  const today = useEventCountToday(POSTS);
  const [sent, trend] = row(208, 300, [600, 1191]);
  const [feed, tags] = row(533, 445, [1100, 691]);
  // The ring is today's sentiment model; the rest splits roughly 2:1 neutral to negative.
  const pos = useSignal('community.sentiment', 5000).value ?? 80;
  const neg = (100 - pos) / 3;
  const neu = 100 - pos - neg;
  const chat = <ChatIcon />;

  return (
    <>
      <Panel frame={sent} index={0} icon={chat} title="Sentiment" subtitle={`${fmt(today)} mentions today`}>
        <div className="flex h-full items-center">
          <div className="flex w-[48%] justify-center">
            <RingGauge value={`${Math.round(pos)}%`} unit="positive" segments={[{ value: pos, color: '#7fcf9d' }, { value: neu, color: '#b58ce3' }, { value: neg, color: '#d96b84' }]} />
          </div>
          <Hairline />
          <div className="flex flex-1 flex-col gap-[12px] pl-[40px]">
            <Tag tone="good">Positive · {Math.round(pos)}%</Tag>
            <Tag tone="info">Neutral · {Math.round(neu)}%</Tag>
            <Tag tone="bad">Negative · {Math.round(neg)}%</Tag>
          </div>
        </div>
      </Panel>
      <TrendCard frame={trend} index={1} icon={chat} title="Mentions" subtitle="Across Instagram, X, Facebook and TikTok" sim="community.mentions" yTitle="Mentions / hour" decimals={0} />
      <Panel frame={feed} index={2} icon={chat} title="Live Mentions" subtitle="Posts that mention the mall">
        <div className="pf-scroll absolute inset-x-[16px] bottom-[10px] top-[6px]">
          <AnimatePresence initial={false}>
            {posts.map((p) => (
              <motion.div key={p.key} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-[10px] flex gap-[14px] rounded-[8px] border border-white/[0.07] bg-white/[0.03] px-[14px] py-[10px]">
                <span className="mt-[4px] h-[10px] w-[10px] shrink-0 rounded-full" style={{ background: p.data.platform.color, boxShadow: `0 0 8px ${p.data.platform.color}` }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-[13px] text-ink-3">
                    <span>
                      <span className="text-white">{p.data.handle}</span> · {p.data.platform.name} · {clockTime(p.t)}
                    </span>
                    <Tag tone={SENT_TONE[p.data.sentiment]}>{p.data.sentiment}</Tag>
                  </div>
                  <p className="mt-[4px] text-[15px] text-ink-2">{p.data.text}</p>
                  <p className="mt-[2px] text-[12px] text-ink-4">♥ {fmt(p.data.likes)}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Panel>
      <Panel frame={tags} index={3} icon={chat} title="Trending Hashtags" subtitle="Last 24 hours">
        <div className="absolute inset-x-[24px] top-[16px] flex flex-col gap-[20px]">
          {HASHTAGS.map((h, i) => {
            const v = Math.round(1000 / (i + 1.2));
            return (
              <div key={h} className="flex items-center gap-[14px] text-[16px]">
                <span className="w-[170px] text-white">{h}</span>
                <div className="relative h-[8px] flex-1 overflow-hidden rounded-full bg-white/10">
                  <motion.span className="absolute inset-y-0 left-0 rounded-full bg-aqua" style={{ boxShadow: '0 0 8px #b58ce3' }} initial={{ width: 0 }} animate={{ width: `${(v / 833) * 100}%` }} transition={{ duration: 0.9, delay: i * 0.08 }} />
                </div>
                <span className="w-[48px] text-right tabular-nums text-ink-3">{fmt(v)}</span>
              </div>
            );
          })}
        </div>
      </Panel>
    </>
  );
}

