'use client';
import { useMemo } from 'react';
import { useQueue, QueueItem } from '@/hooks/useQueue';
import SortableHeader from '@/components/SortableHeader';
import { useSortable } from '@/hooks/useSortable';
import { Package } from 'lucide-react';

interface PlanRow {
  key: string;
  imageUrl?: string;
  product: string;
  variant: string;
  toMake: number;
  orders: number;
  gramsEach: number;
  gramsTotal: number;
}

function grams(n: number) {
  if (!n) return '—';
  return n >= 1000 ? `${(n / 1000).toFixed(2)} kg` : `${n} g`;
}

export default function ProductionPage() {
  const { items, loading, error } = useQueue();

  const rows: PlanRow[] = useMemo(() => {
    // To-make = paid items not yet shipped.
    const toMake = items.filter(i => i.stage !== 'SHIPPED' && i.financialStatus === 'PAID');
    const groups = new Map<string, { item: QueueItem; qty: number; orders: Set<string> }>();
    toMake.forEach(i => {
      const k = `${i.productTitle}::${i.variantTitle}`;
      const g = groups.get(k);
      if (g) { g.qty += i.quantity; g.orders.add(i.orderId); }
      else groups.set(k, { item: i, qty: i.quantity, orders: new Set([i.orderId]) });
    });
    return Array.from(groups.entries()).map(([k, g]) => ({
      key: k,
      imageUrl: g.item.imageUrl,
      product: g.item.productTitle,
      variant: g.item.variantTitle,
      toMake: g.qty,
      orders: g.orders.size,
      gramsEach: g.item.grams,
      gramsTotal: g.item.grams * g.qty,
    }));
  }, [items]);

  const { sorted, sortKey, sortDir, toggle } = useSortable<PlanRow>(rows, 'toMake', 'desc');
  const sh = (label: string, key: keyof PlanRow) => (
    <SortableHeader label={label} sortKey={key as string} activeSortKey={sortKey as string} sortDir={sortDir} onSort={k => toggle(k as keyof PlanRow)} />
  );

  const totalUnits = rows.reduce((s, r) => s + r.toMake, 0);
  const totalGrams = rows.reduce((s, r) => s + r.gramsTotal, 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-widest uppercase txt-heading">PRODUCTION PLANNING</h1>
        <p className="text-xs mt-1 tracking-widest" style={{ color: 'var(--muted-2)' }}>WHAT TO MAKE — PAID, UNSHIPPED ORDERS</p>
      </div>

      {loading && <div className="text-xs tracking-widest" style={{ color: 'var(--muted-2)' }}>LOADING PRODUCTION DATA...</div>}
      {error && (
        <div className="rounded p-4 text-xs" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6 lg:grid-cols-3">
            <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs tracking-widest mb-2" style={{ color: 'var(--muted-2)' }}>UNIQUE ITEMS TO MAKE</div>
              <div className="text-xl font-bold" style={{ color: 'var(--text)' }}>{rows.length}</div>
            </div>
            <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs tracking-widest mb-2" style={{ color: 'var(--muted-2)' }}>TOTAL UNITS</div>
              <div className="text-xl font-bold" style={{ color: 'var(--text)' }}>{totalUnits}</div>
            </div>
            <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs tracking-widest mb-2" style={{ color: 'var(--muted-2)' }}>EST. MATERIAL</div>
              <div className="text-xl font-bold" style={{ color: 'var(--text)' }}>{grams(totalGrams)}</div>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left px-5 py-3 tracking-widest" style={{ color: 'var(--muted-2)', width: 56 }}></th>
                    {sh('PRODUCT', 'product')}
                    {sh('VARIANT', 'variant')}
                    {sh('TO MAKE', 'toMake')}
                    {sh('ORDERS', 'orders')}
                    {sh('MATERIAL EA', 'gramsEach')}
                    {sh('MATERIAL TOTAL', 'gramsTotal')}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(row => (
                    <tr key={row.key} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-5 py-3">
                        <div className="rounded overflow-hidden flex items-center justify-center"
                             style={{ width: 36, height: 36, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                          {row.imageUrl
                            ? <img src={row.imageUrl} alt={row.product} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <Package size={14} style={{ color: 'var(--muted-2)' }} />}
                        </div>
                      </td>
                      <td className="px-5 py-3" style={{ color: 'var(--text)' }}>{row.product}</td>
                      <td className="px-5 py-3 font-mono" style={{ color: 'var(--muted)' }}>{row.variant || '—'}</td>
                      <td className="px-5 py-3 font-mono font-bold" style={{ color: 'var(--accent)' }}>{row.toMake}</td>
                      <td className="px-5 py-3 font-mono" style={{ color: 'var(--muted)' }}>{row.orders}</td>
                      <td className="px-5 py-3 font-mono" style={{ color: 'var(--muted)' }}>{grams(row.gramsEach)}</td>
                      <td className="px-5 py-3 font-mono" style={{ color: 'var(--text)' }}>{grams(row.gramsTotal)}</td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-6 text-center" style={{ color: 'var(--muted-2)' }}>
                        Nothing to produce — all paid orders shipped.
                      </td>
                    </tr>
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
