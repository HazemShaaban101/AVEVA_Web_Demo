import { Panel } from '@/components/frame/Panel';
import { CardIcon } from '@/components/icons/UiIcons';
import { DataTable, Tag, type TagTone } from '@/components/data/DataTable';
import { RingGauge } from '@/components/gauges/Gauges';
import { KpiBody } from '@/widgets/Widgets';
import { row, stack } from '@/screens/layout';
import { useNow } from '@/sim/clock';
import { hashString, rand01 } from '@/sim/noise';
import { BUILDINGS } from '@/model/site';
import { useScope, scopeLabel } from '@/sim/scope';
import { fmt } from '@/utils/format';

/** Tariffs (EGP) used for the simulated bills. */
const TARIFF = { kWh: 2.35, m3: 9.5, btu: 0.62, service: 58 };

const TENANTS = [
  'Zara', 'Carrefour Express', 'Starbucks', 'Vodafone Store', 'Adidas', 'Apple Premium Reseller', 'Cinema Plus', 'Sephora', 'Kids Kingdom', 'Pharmacy 19011', 'Burger Lab', 'H&M',
  'Lacoste', 'IKEA Studio', 'Samsung Experience', 'Costa Coffee', 'Nike', 'Bath & Body', 'Chili’s', 'Swatch', 'Mothercare', 'Virgin Megastore', 'Tommy Hilfiger', 'B.Tech',
];

type Status = 'Paid' | 'Due' | 'Overdue';
const STATUS_TONE: Record<Status, TagTone> = { Paid: 'good', Due: 'warn', Overdue: 'bad' };

/**
 * Metering › Billing: this month's utility bills per tenant, from the metered kWh, m³ and BTU,
 * with collection status. Scoped like every KPI: the whole project, or one building's tenants.
 */
export function BillingScreen() {
  const scope = useScope();
  const now = useNow(60_000);
  const day = new Date(now).getDate();
  const month = new Date(now).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const bills = TENANTS.map((name, i) => {
    const b = BUILDINGS[i % BUILDINGS.length];
    const r = (s: number) => rand01(hashString(name) + s, 42);
    const area = 120 + Math.round(r(1) * 1400);
    const kwh = Math.round(area * (55 + r(2) * 40) * (day / 30));
    const m3 = Math.round(area * (0.3 + r(3) * 0.5) * (day / 30));
    const btu = Math.round(area * (18 + r(4) * 10) * (day / 30));
    const amount = kwh * TARIFF.kWh + m3 * TARIFF.m3 + btu * TARIFF.btu + area * TARIFF.service;
    const s = r(5);
    const status: Status = s < 0.6 ? 'Paid' : s < 0.9 ? 'Due' : 'Overdue';
    return { name, building: b, unit: `${b.label}-${String(10 + Math.floor(r(6) * 80))}`, kwh, m3, btu, amount, status };
  }).filter((x) => scope === 'project' || x.building.id === scope);

  const total = bills.reduce((a, b) => a + b.amount, 0);
  const paid = bills.filter((b) => b.status === 'Paid').reduce((a, b) => a + b.amount, 0);
  const overdue = bills.filter((b) => b.status === 'Overdue').reduce((a, b) => a + b.amount, 0);
  const byUtility = [
    { name: 'Electricity', value: bills.reduce((a, b) => a + b.kwh * TARIFF.kWh, 0), color: '#9d78ff' },
    { name: 'Chilled Water', value: bills.reduce((a, b) => a + b.btu * TARIFF.btu, 0), color: '#5b7cff' },
    { name: 'Water', value: bills.reduce((a, b) => a + b.m3 * TARIFF.m3, 0), color: '#b58ce3' },
    { name: 'Service Charge', value: total - bills.reduce((a, b) => a + b.kwh * TARIFF.kWh + b.btu * TARIFF.btu + b.m3 * TARIFF.m3, 0), color: '#7fcf9d' },
  ];

  const kpis = row(208, 150, 4);
  const [table, side] = row(383, 595, [1180, 611]);
  const [ring, notes] = stack(side.x, side.w, 383, [340, 230]);
  const egp = (v: number) => `EGP ${fmt(v)}`;

  return (
    <>
      <Panel frame={kpis[0]} index={0} icon={<CardIcon />} title="Billed" subtitle={`${month} · to date`}>
        <KpiBody source={{ fixed: total / 1000 }} decimals={0} unit="k EGP" note={scopeLabel(scope)} />
      </Panel>
      <Panel frame={kpis[1]} index={1} icon={<CardIcon />} title="Collected" subtitle="Share of billed">
        <KpiBody source={{ fixed: total ? (paid / total) * 100 : 0 }} decimals={0} unit="%" note={egp(paid)} />
      </Panel>
      <Panel frame={kpis[2]} index={2} icon={<CardIcon />} title="Overdue" subtitle="Past due date">
        <KpiBody source={{ fixed: overdue / 1000 }} decimals={0} unit="k EGP" note={<Tag tone={overdue ? 'bad' : 'good'}>{bills.filter((b) => b.status === 'Overdue').length} tenants</Tag>} />
      </Panel>
      <Panel frame={kpis[3]} index={3} icon={<CardIcon />} title="Tenants" subtitle="Metered accounts">
        <KpiBody source={{ fixed: bills.length }} decimals={0} unit="" note="kWh · m³ · BTU" />
      </Panel>

      <Panel frame={table} index={4} icon={<CardIcon />} title="Tenant Bills" subtitle={`Metered consumption, ${month}`}>
        <div className="absolute inset-x-[4px] bottom-[10px] top-[8px]">
          <DataTable
            dense
            rows={bills}
            rowKey={(b) => b.name}
            highlight={(b) => (b.status === 'Overdue' ? 'alarm' : null)}
            columns={[
              { key: 'n', header: 'Tenant', render: (b) => <span className="text-white">{b.name}</span> },
              { key: 'u', header: 'Unit', width: 80, render: (b) => b.unit },
              { key: 'k', header: 'kWh', width: 90, align: 'right', render: (b) => fmt(b.kwh) },
              { key: 'm', header: 'm³', width: 70, align: 'right', render: (b) => fmt(b.m3) },
              { key: 'b', header: 'kBTU', width: 90, align: 'right', render: (b) => fmt(b.btu) },
              { key: 'a', header: 'Amount', width: 130, align: 'right', render: (b) => <span className="text-white">{egp(b.amount)}</span> },
              { key: 's', header: 'Status', width: 110, render: (b) => <Tag tone={STATUS_TONE[b.status]}>{b.status}</Tag> },
            ]}
          />
        </div>
      </Panel>
      <Panel frame={ring} index={5} icon={<CardIcon />} title="Revenue By Utility" subtitle="This month">
        <div className="flex h-full items-center pb-[10px]">
          <div className="flex w-[48%] justify-center">
            <RingGauge value={`${fmt(total / 1_000_000, 2)}M`} unit="EGP" segments={byUtility.map((u) => ({ value: u.value, color: u.color }))} size={200} />
          </div>
          <ul className="flex flex-1 flex-col gap-[12px] text-[15px] text-ink-2">
            {byUtility.map((u) => (
              <li key={u.name} className="flex items-center gap-[8px]">
                <span className="h-[8px] w-[8px] rounded-full" style={{ background: u.color, boxShadow: `0 0 6px ${u.color}` }} />
                {u.name}
                <span className="ml-auto pr-[20px] text-ink-3">{fmt((u.value / Math.max(1, total)) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>
      <Panel frame={notes} index={6} icon={<CardIcon />} title="Tariffs" subtitle="Applied to metered readings">
        <dl className="absolute inset-x-[20px] top-[10px] grid grid-cols-2 gap-y-[10px] text-[15px]">
          <dt className="text-ink-3">Electricity</dt>
          <dd className="text-right text-white">EGP {TARIFF.kWh} / kWh</dd>
          <dt className="text-ink-3">Water</dt>
          <dd className="text-right text-white">EGP {TARIFF.m3} / m³</dd>
          <dt className="text-ink-3">Chilled water</dt>
          <dd className="text-right text-white">EGP {TARIFF.btu} / kBTU</dd>
          <dt className="text-ink-3">Service charge</dt>
          <dd className="text-right text-white">EGP {TARIFF.service} / m²</dd>
        </dl>
      </Panel>
    </>
  );
}
