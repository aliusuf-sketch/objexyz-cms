'use client';
import { useMemo } from 'react';
import { formatPKR } from '@/lib/utils';
import { calcUnitCost, CostRates } from '@/lib/costCalc';
import { useQueue } from '@/hooks/useQueue';
import { Loading, ErrorNote, marginColor } from '@/components/ui';
import { AlertTriangle } from 'lucide-react';

// Groups all orders by the month they were placed (createdAt), regardless
// of payment status. Courier is charged once per ORDER (not per unit) —
// material/labor/equipment scale with quantity per line item.
interface MonthRow {
  month: string; // "2026-07"
  label: string; // "Jul 2026"
  orders: number;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
  missingUsageUnits: number;
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function MonthlyProfitPanel({ rates }: { rates: CostRates }) {
  const { items, loading, error } = useQueue();

  const monthRows: MonthRow[] = useMemo(() => {
    interface Acc { orderIds: Set<string>; units: number; revenue: number; unitCostSum: number; missingUsageUnits: number }
    const byMonth = new Map<string, Acc>();

    items.forEach(it => {
      const key = monthKey(it.createdAt);
      if (!byMonth.has(key)) byMonth.set(key, { orderIds: new Set(), units: 0, revenue: 0, unitCostSum: 0, missingUsageUnits: 0 });
      const acc = byMonth.get(key)!;
      acc.orderIds.add(it.orderId);
      acc.units += it.quantity;
      acc.revenue += it.price * it.quantity;

      const u = it.usage;
      const hasUsage = u.resinMl > 0 || u.printerRuntimeHrs > 0 || u.sandingHrs > 0 || u.paintingHrs > 0 || u.finishingHrs > 0 || u.packagingHrs > 0;
      if (!hasUsage) acc.missingUsageUnits += it.quantity;

      const unit = calcUnitCost(u, rates);
      acc.unitCostSum += unit.costExclCourier * it.quantity;
    });

    return Array.from(byMonth.entries())
      .map(([key, acc]) => {
        const courierTotal = rates.courierCost * acc.orderIds.size;
        const cost = acc.unitCostSum + courierTotal;
        const profit = acc.revenue - cost;
        return {
          month: key,
          label: monthLabel(key),
          orders: acc.orderIds.size,
          units: acc.units,
          revenue: acc.revenue,
          cost,
          profit,
          marginPct: acc.revenue > 0 ? (profit / acc.revenue) * 100 : 0,
          missingUsageUnits: acc.missingUsageUnits,
        };
      })
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [items, rates]);

  const totals = useMemo(() => monthRows.reduce((acc, r) => ({
    orders: acc.orders + r.orders,
    units: acc.units + r.units,
    revenue: acc.revenue + r.revenue,
    cost: acc.cost + r.cost,
    profit: acc.profit + r.profit,
    missingUsageUnits: acc.missingUsageUnits + r.missingUsageUnits,
  }), { orders: 0, units: 0, revenue: 0, cost: 0, profit: 0, missingUsageUnits: 0 }), [monthRows]);

  const totalMissing = totals.missingUsageUnits;

  return (
    <div>
      {loading && <Loading label="LOADING ORDER DATA..." />}
      {error && (
        <ErrorNote message={error} />
      )}

      {!loading && !error && (
        <>
          {totalMissing > 0 && (
            <div className="mb-4 rounded-lg px-4 py-2.5 flex items-center gap-2 text-xs" style={{ background: 'var(--warn-bg)', border: '1px solid var(--border)', color: 'var(--warn)' }}>
              <AlertTriangle size={13} />
              <span><b>{totalMissing}</b> units sold have no usage data entered in Cost Calculator yet — their cost is understated (fixed material fees only, no resin/labor/equipment). Fill them in on the CATALOG tab for accurate figures.</span>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs tracking-widest mb-1" style={{ color: 'var(--muted-2)' }}>TOTAL ORDERS</div>
              <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{totals.orders}</div>
            </div>
            <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs tracking-widest mb-1" style={{ color: 'var(--muted-2)' }}>TOTAL REVENUE</div>
              <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{formatPKR(totals.revenue)}</div>
            </div>
            <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs tracking-widest mb-1" style={{ color: 'var(--muted-2)' }}>TOTAL COST</div>
              <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{formatPKR(totals.cost)}</div>
            </div>
            <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs tracking-widest mb-1" style={{ color: 'var(--muted-2)' }}>TOTAL PROFIT</div>
              <div className="text-lg font-bold" style={{ color: marginColor(totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0) }}>{formatPKR(totals.profit)}</div>
            </div>
            <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs tracking-widest mb-1" style={{ color: 'var(--muted-2)' }}>OVERALL MARGIN</div>
              <div className="text-lg font-bold" style={{ color: marginColor(totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0) }}>
                {totals.revenue > 0 ? ((totals.profit / totals.revenue) * 100).toFixed(1) : '0.0'}%
              </div>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['MONTH', 'ORDERS', 'UNITS SOLD', 'REVENUE', 'COST', 'PROFIT', 'MARGIN'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 tracking-widest" style={{ color: 'var(--muted-2)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthRows.map(row => (
                    <tr key={row.month} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text)' }}>
                        {row.label}
                        {row.missingUsageUnits > 0 && (
                          <span className="ml-2 text-xs" style={{ color: 'var(--warn)' }} title={`${row.missingUsageUnits} units missing usage data`}>⚠</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--muted)' }}>{row.orders}</td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--muted)' }}>{row.units}</td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--text)' }}>{formatPKR(row.revenue)}</td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--muted)' }}>{formatPKR(row.cost)}</td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: row.profit >= 0 ? 'var(--text)' : 'var(--danger)' }}>{formatPKR(row.profit)}</td>
                      <td className="px-4 py-2.5 font-mono font-bold" style={{ color: marginColor(row.marginPct) }}>{row.marginPct.toFixed(1)}%</td>
                    </tr>
                  ))}
                  {monthRows.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-6 text-center" style={{ color: 'var(--muted-2)' }}>No orders yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
