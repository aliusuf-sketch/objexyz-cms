'use client';
import { useEffect, useState, useMemo } from 'react';
import { formatPKR, formatDate } from '@/lib/utils';
import SortableHeader from '@/components/SortableHeader';
import { useSortable } from '@/hooks/useSortable';

interface LineItem { title: string; quantity: number; variant?: { price: string } }
interface Order {
  id: string;
  name: string;
  createdAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  totalPriceSet: { shopMoney: { amount: string } };
  subtotalPriceSet: { shopMoney: { amount: string } };
  totalOutstandingSet: { shopMoney: { amount: string } };
  lineItems: { edges: { node: LineItem }[] };
}

interface DashOrderRow {
  id: string; name: string; createdAt: string;
  financialStatus: string; fulfillmentStatus: string;
  amount: number; itemCount: number;
}

function StatCard({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="text-xs tracking-widest mb-2" style={{ color: 'var(--muted-2)' }}>{label}</div>
      <div className="text-xl font-bold" style={{ color: warn ? 'var(--warn)' : 'var(--text)' }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: 'var(--muted-2)' }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
      <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>{title}</h2>
    </div>
  );
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/shopify/dashboard')
      .then(r => r.json())
      .then(data => {
        const edges = data?.data?.orders?.edges || [];
        setOrders(edges.map((e: { node: Order }) => e.node));
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Derived stats ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((s, o) => s + Number(o.totalPriceSet?.shopMoney?.amount || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Fulfillment breakdown
    const fulfilled    = orders.filter(o => o.fulfillmentStatus === 'FULFILLED').length;
    const unfulfilled  = orders.filter(o => !o.fulfillmentStatus || o.fulfillmentStatus === 'UNFULFILLED').length;
    const inProgress   = orders.filter(o => o.fulfillmentStatus === 'IN_PROGRESS' || o.fulfillmentStatus === 'PARTIAL').length;
    const fulfillmentRate = totalOrders > 0 ? Math.round((fulfilled / totalOrders) * 100) : 0;

    // Financial breakdown
    const paid         = orders.filter(o => o.financialStatus === 'PAID');
    const pending      = orders.filter(o => o.financialStatus === 'PENDING' || o.financialStatus === 'PARTIALLY_PAID');
    const refunded     = orders.filter(o => o.financialStatus === 'REFUNDED' || o.financialStatus === 'PARTIALLY_REFUNDED');
    const paidAmount   = paid.reduce((s, o) => s + Number(o.totalPriceSet?.shopMoney?.amount || 0), 0);
    const pendingAmount = pending.reduce((s, o) => s + Number(o.totalOutstandingSet?.shopMoney?.amount || o.totalPriceSet?.shopMoney?.amount || 0), 0);
    const refundedAmount = refunded.reduce((s, o) => s + Number(o.totalPriceSet?.shopMoney?.amount || 0), 0);

    // Item stats
    const totalItems   = orders.reduce((s, o) => s + (o.lineItems?.edges?.reduce((a, e) => a + e.node.quantity, 0) || 0), 0);
    const avgItemsPerOrder = totalOrders > 0 ? (totalItems / totalOrders).toFixed(1) : '0';

    // Orders awaiting action: unfulfilled + paid
    const toProcess    = orders.filter(o =>
      (o.financialStatus === 'PAID') &&
      (!o.fulfillmentStatus || o.fulfillmentStatus === 'UNFULFILLED')
    ).length;

    return {
      totalOrders, totalRevenue, avgOrderValue,
      fulfilled, unfulfilled, inProgress, fulfillmentRate,
      paid: paid.length, pending: pending.length, refunded: refunded.length,
      paidAmount, pendingAmount, refundedAmount,
      totalItems, avgItemsPerOrder, toProcess,
    };
  }, [orders]);

  // ── Top products ───────────────────────────────────────────────
  const topProducts = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => o.lineItems?.edges?.forEach(({ node }) => {
      counts[node.title] = (counts[node.title] || 0) + node.quantity;
    }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [orders]);

  // ── Sortable recent orders ─────────────────────────────────────
  const dashRows: DashOrderRow[] = useMemo(() => orders.slice(0, 15).map(o => ({
    id: o.id,
    name: o.name,
    createdAt: o.createdAt,
    financialStatus: o.financialStatus || '',
    fulfillmentStatus: o.fulfillmentStatus || 'UNFULFILLED',
    amount: Number(o.totalPriceSet?.shopMoney?.amount || 0),
    itemCount: o.lineItems?.edges?.reduce((s, e) => s + e.node.quantity, 0) || 0,
  })), [orders]);

  const { sorted: sortedDash, sortKey: dsk, sortDir: dsd, toggle: dtoggle } = useSortable<DashOrderRow>(dashRows, 'createdAt', 'desc');
  const dsh = (label: string, key: keyof DashOrderRow) => (
    <SortableHeader label={label} sortKey={key as string} activeSortKey={dsk as string} sortDir={dsd} onSort={k => dtoggle(k as keyof DashOrderRow)} />
  );

  const badge = (text: string, type: 'paid' | 'pending' | 'fulfilled' | 'unfulfilled' | 'warn' | 'neutral') => {
    const styles: Record<string, { bg: string; color: string }> = {
      paid:        { bg: 'var(--accent-bg)',  color: 'var(--accent)' },
      fulfilled:   { bg: 'var(--accent-bg)',  color: 'var(--accent)' },
      pending:     { bg: 'var(--warn-bg)',    color: 'var(--warn)' },
      warn:        { bg: 'var(--warn-bg)',    color: 'var(--warn)' },
      unfulfilled: { bg: 'var(--neutral-bg)', color: 'var(--muted)' },
      neutral:     { bg: 'var(--neutral-bg)', color: 'var(--muted)' },
    };
    const s = styles[type] || styles.neutral;
    return <span className="px-2 py-0.5 rounded text-xs" style={{ background: s.bg, color: s.color }}>{text}</span>;
  };

  const financialBadge = (status: string) => {
    if (status === 'PAID') return badge(status, 'paid');
    if (status === 'PENDING' || status === 'PARTIALLY_PAID') return badge(status, 'pending');
    if (status === 'REFUNDED' || status === 'PARTIALLY_REFUNDED') return badge(status, 'warn');
    return badge(status || '—', 'neutral');
  };

  const fulfillmentBadge = (status: string) => {
    if (status === 'FULFILLED') return badge(status, 'fulfilled');
    if (status === 'IN_PROGRESS' || status === 'PARTIAL') return badge(status, 'pending');
    return badge(status || 'UNFULFILLED', 'unfulfilled');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-widest uppercase txt-heading">DASHBOARD</h1>
        <p className="text-xs mt-1 tracking-widest" style={{ color: 'var(--muted-2)' }}>OBJEXYZ STUDIO — OPS CENTER — SINCE 2026-05-09</p>
      </div>

      {loading ? (
        <div className="text-xs tracking-widest" style={{ color: 'var(--muted-2)' }}>LOADING OPERATIONS DATA...</div>
      ) : (
        <>
          {/* ── Row 1: Revenue & Volume ── */}
          <div className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--muted-2)' }}>Revenue & Volume</div>
          <div className="grid grid-cols-2 gap-3 mb-6 lg:grid-cols-4">
            <StatCard label="TOTAL REVENUE" value={formatPKR(stats.totalRevenue)} />
            <StatCard label="TOTAL ORDERS" value={String(stats.totalOrders)} sub={`${stats.totalItems} items total`} />
            <StatCard label="AVG ORDER VALUE" value={formatPKR(stats.avgOrderValue)} />
            <StatCard label="AVG ITEMS / ORDER" value={stats.avgItemsPerOrder} />
          </div>

          {/* ── Row 2: Payment Status ── */}
          <div className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--muted-2)' }}>Payment Status</div>
          <div className="grid grid-cols-2 gap-3 mb-6 lg:grid-cols-3">
            <StatCard label="CAPTURED (PAID)" value={formatPKR(stats.paidAmount)} sub={`${stats.paid} orders`} />
            <StatCard label="TO CAPTURE (PENDING)" value={formatPKR(stats.pendingAmount)} sub={`${stats.pending} orders`} warn={stats.pending > 0} />
            <StatCard label="REFUNDED" value={formatPKR(stats.refundedAmount)} sub={`${stats.refunded} orders`} warn={stats.refunded > 0} />
          </div>

          {/* ── Row 3: Fulfillment Status ── */}
          <div className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--muted-2)' }}>Fulfillment Status</div>
          <div className="grid grid-cols-2 gap-3 mb-8 lg:grid-cols-4">
            <StatCard label="AWAITING PROCESSING" value={String(stats.toProcess)} warn={stats.toProcess > 0} sub="Paid, not fulfilled" />
            <StatCard label="IN PROGRESS / PARTIAL" value={String(stats.inProgress)} />
            <StatCard label="FULFILLED" value={String(stats.fulfilled)} />
            <StatCard label="FULFILLMENT RATE" value={`${stats.fulfillmentRate}%`} sub={`${stats.unfulfilled} unfulfilled`} />
          </div>

          {/* ── Fulfillment breakdown bar ── */}
          {stats.totalOrders > 0 && (
            <div className="rounded-lg p-5 mb-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--muted)' }}>FULFILLMENT BREAKDOWN</div>
              <div className="flex rounded overflow-hidden h-3 mb-3">
                {stats.fulfilled > 0 && (
                  <div style={{ width: `${(stats.fulfilled / stats.totalOrders) * 100}%`, background: 'var(--accent)', opacity: 0.85 }} title={`Fulfilled: ${stats.fulfilled}`} />
                )}
                {stats.inProgress > 0 && (
                  <div style={{ width: `${(stats.inProgress / stats.totalOrders) * 100}%`, background: 'var(--warn)' }} title={`In Progress: ${stats.inProgress}`} />
                )}
                {stats.unfulfilled > 0 && (
                  <div style={{ width: `${(stats.unfulfilled / stats.totalOrders) * 100}%`, background: 'var(--border)' }} title={`Unfulfilled: ${stats.unfulfilled}`} />
                )}
              </div>
              <div className="flex gap-6 text-xs" style={{ color: 'var(--muted-2)' }}>
                <span style={{ color: 'var(--accent)' }}>■ Fulfilled ({stats.fulfilled})</span>
                <span style={{ color: 'var(--warn)' }}>■ In Progress ({stats.inProgress})</span>
                <span>■ Unfulfilled ({stats.unfulfilled})</span>
              </div>
            </div>
          )}

          {/* ── Recent Orders ── */}
          <div className="rounded-lg mb-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <SectionHeader title="RECENT ORDERS" />
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {dsh('ORDER', 'name')}
                    {dsh('DATE', 'createdAt')}
                    {dsh('FINANCIAL', 'financialStatus')}
                    {dsh('FULFILLMENT', 'fulfillmentStatus')}
                    {dsh('ITEMS', 'itemCount')}
                    {dsh('AMOUNT', 'amount')}
                  </tr>
                </thead>
                <tbody>
                  {sortedDash.map(order => (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-5 py-3 font-mono" style={{ color: 'var(--accent)' }}>{order.name}</td>
                      <td className="px-5 py-3" style={{ color: 'var(--muted)' }}>{formatDate(order.createdAt)}</td>
                      <td className="px-5 py-3">{financialBadge(order.financialStatus)}</td>
                      <td className="px-5 py-3">{fulfillmentBadge(order.fulfillmentStatus)}</td>
                      <td className="px-5 py-3 font-mono" style={{ color: 'var(--muted)' }}>{order.itemCount}</td>
                      <td className="px-5 py-3 font-mono" style={{ color: 'var(--text)' }}>{formatPKR(order.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Top Products ── */}
          <div className="rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <SectionHeader title="TOP PRODUCTS BY UNITS SOLD" />
            <div className="p-5 space-y-3">
              {topProducts.map(([title, qty], i) => {
                const max = topProducts[0]?.[1] || 1;
                return (
                  <div key={title}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs" style={{ color: 'var(--text)' }}>{title}</span>
                      <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{qty} units</span>
                    </div>
                    <div className="h-1 rounded" style={{ background: 'var(--border)' }}>
                      <div className="h-1 rounded" style={{ width: `${(qty / max) * 100}%`, background: i === 0 ? 'var(--text)' : 'var(--muted-2)' }} />
                    </div>
                  </div>
                );
              })}
              {topProducts.length === 0 && (
                <div className="text-xs" style={{ color: 'var(--muted-2)' }}>No product data yet</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
