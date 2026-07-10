'use client';
import { useEffect, useState, useMemo } from 'react';
import { formatPKR, shipByDate, daysUntil } from '@/lib/utils';
import { useQueue } from '@/hooks/useQueue';
import { AlertTriangle } from 'lucide-react';

interface LineItem {
  title: string;
  quantity: number;
  fulfillableQuantity: number;
  variant?: { price: string };
  product?: { productType?: string } | null;
}
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

type PeriodType = '1w' | '2w' | '4w' | 'custom';
const PERIOD_DAYS: Record<Exclude<PeriodType, 'custom'>, number> = { '1w': 7, '2w': 14, '4w': 28 };
const PERIOD_STORAGE_KEY = 'dashboard_period';

function StatCard({ label, value, sub, warn, big }: { label: string; value: string; sub?: string; warn?: boolean; big?: boolean }) {
  return (
    <div className="rounded-lg px-4 flex flex-col justify-center h-full" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="text-xs tracking-widest mb-1 truncate" style={{ color: 'var(--muted-2)' }}>{label}</div>
      <div className={big ? 'text-2xl font-bold' : 'text-lg font-bold'} style={{ color: warn ? 'var(--warn)' : 'var(--text)' }}>{value}</div>
      {sub && <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted-2)' }}>{sub}</div>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg flex flex-col min-h-0" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="px-4 py-2.5 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>{title}</h2>
      </div>
      <div className="p-4 overflow-y-auto flex-1 min-h-0">{children}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodType, setPeriodType] = useState<PeriodType>('2w');
  const [customDays, setCustomDays] = useState(10);
  const { items: queueItems } = useQueue();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PERIOD_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.type) setPeriodType(saved.type);
        if (saved.customDays) setCustomDays(saved.customDays);
      }
    } catch { /* ignore */ }
  }, []);

  function updatePeriod(type: PeriodType, days?: number) {
    setPeriodType(type);
    if (days !== undefined) setCustomDays(days);
    localStorage.setItem(PERIOD_STORAGE_KEY, JSON.stringify({ type, customDays: days ?? customDays }));
  }

  useEffect(() => {
    fetch('/api/shopify/dashboard')
      .then(r => r.json())
      .then(data => {
        const edges = data?.data?.orders?.edges || [];
        setOrders(edges.map((e: { node: Order }) => e.node));
      })
      .finally(() => setLoading(false));
  }, []);

  const periodDays = periodType === 'custom' ? customDays : PERIOD_DAYS[periodType];

  // ── Overdue / due-soon alert (from Shipping Queue data) ──────────
  const alert = useMemo(() => {
    let overdue = 0, soon = 0;
    queueItems.forEach(it => {
      if (it.stage === 'SHIPPED') return;
      const target = shipByDate(it.createdAt, it.eta);
      if (!target) return;
      const d = daysUntil(target);
      if (d < 0) overdue++;
      else if (d <= 3) soon++;
    });
    return { overdue, soon };
  }, [queueItems]);

  // ── Derived stats ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((s, o) => s + Number(o.totalPriceSet?.shopMoney?.amount || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const fulfilled    = orders.filter(o => o.fulfillmentStatus === 'FULFILLED').length;
    const unfulfilled  = orders.filter(o => !o.fulfillmentStatus || o.fulfillmentStatus === 'UNFULFILLED').length;
    const inProgress   = orders.filter(o => o.fulfillmentStatus === 'IN_PROGRESS' || o.fulfillmentStatus === 'PARTIAL').length;
    const fulfillmentRate = totalOrders > 0 ? Math.round((fulfilled / totalOrders) * 100) : 0;

    const paid         = orders.filter(o => o.financialStatus === 'PAID');
    const pending      = orders.filter(o => o.financialStatus === 'PENDING' || o.financialStatus === 'PARTIALLY_PAID');
    const refunded     = orders.filter(o => o.financialStatus === 'REFUNDED' || o.financialStatus === 'PARTIALLY_REFUNDED');
    const paidAmount   = paid.reduce((s, o) => s + Number(o.totalPriceSet?.shopMoney?.amount || 0), 0);
    const pendingAmount = pending.reduce((s, o) => s + Number(o.totalOutstandingSet?.shopMoney?.amount || o.totalPriceSet?.shopMoney?.amount || 0), 0);
    const refundedAmount = refunded.reduce((s, o) => s + Number(o.totalPriceSet?.shopMoney?.amount || 0), 0);

    const totalItems   = orders.reduce((s, o) => s + (o.lineItems?.edges?.reduce((a, e) => a + e.node.quantity, 0) || 0), 0);
    const avgItemsPerOrder = totalOrders > 0 ? (totalItems / totalOrders).toFixed(1) : '0';

    // Backlog: still needs work, regardless of payment status.
    const backlog = orders.filter(o =>
      o.fulfillmentStatus !== 'FULFILLED'
    ).length;
    const unpaidUnfulfilled = orders.filter(o =>
      (o.financialStatus === 'PENDING' || o.financialStatus === 'PARTIALLY_PAID') &&
      o.fulfillmentStatus !== 'FULFILLED'
    ).length;

    return {
      totalOrders, totalRevenue, avgOrderValue,
      fulfilled, unfulfilled, inProgress, fulfillmentRate,
      paid: paid.length, pending: pending.length, refunded: refunded.length,
      paidAmount, pendingAmount, refundedAmount,
      totalItems, avgItemsPerOrder, backlog, unpaidUnfulfilled,
    };
  }, [orders]);

  // ── Items fulfilled in selected period ──────────────────────────
  const periodStat = useMemo(() => {
    const cutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000;
    let ordered = 0, fulfilledQty = 0;
    orders.forEach(o => {
      if (new Date(o.createdAt).getTime() < cutoff) return;
      o.lineItems?.edges?.forEach(({ node }) => {
        ordered += node.quantity;
        fulfilledQty += Math.max(0, node.quantity - (node.fulfillableQuantity ?? node.quantity));
      });
    });
    return { ordered, fulfilledQty, pct: ordered > 0 ? Math.round((fulfilledQty / ordered) * 100) : 0 };
  }, [orders, periodDays]);

  // ── Category breakdown ───────────────────────────────────────────
  const categoryStats = useMemo(() => {
    const map: Record<string, { units: number; revenue: number }> = {};
    orders.forEach(o => o.lineItems?.edges?.forEach(({ node }) => {
      const cat = node.product?.productType || 'Uncategorized';
      if (!map[cat]) map[cat] = { units: 0, revenue: 0 };
      map[cat].units += node.quantity;
      map[cat].revenue += node.quantity * Number(node.variant?.price || 0);
    }));
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue);
  }, [orders]);

  // ── Top products ───────────────────────────────────────────────
  const topProducts = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => o.lineItems?.edges?.forEach(({ node }) => {
      counts[node.title] = (counts[node.title] || 0) + node.quantity;
    }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [orders]);

  const selectStyle = {
    background: 'var(--bg)',
    border: '1px solid var(--input-border)',
    color: 'var(--text)',
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Header */}
      <div className="mb-3 shrink-0 flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-widest uppercase txt-heading">DASHBOARD</h1>
          <p className="text-xs mt-0.5 tracking-widest" style={{ color: 'var(--muted-2)' }}>OBJEXYZ STUDIO — OPS CENTER — SINCE 2026-05-09</p>
        </div>
      </div>

      {/* Alert bar */}
      {!loading && (alert.overdue > 0 || alert.soon > 0) && (
        <a href="/queue" className="mb-3 shrink-0 rounded-lg px-4 py-2.5 flex items-center gap-3 text-xs tracking-widest uppercase transition-opacity hover:opacity-90"
           style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)' }}>
          <AlertTriangle size={14} />
          {alert.overdue > 0 && <span><b>{alert.overdue}</b> item{alert.overdue !== 1 ? 's' : ''} overdue for shipping</span>}
          {alert.overdue > 0 && alert.soon > 0 && <span style={{ color: 'var(--muted-2)' }}>·</span>}
          {alert.soon > 0 && <span style={{ color: 'var(--warn)' }}><b>{alert.soon}</b> due in next 3 days</span>}
          <span className="ml-auto" style={{ color: 'var(--muted-2)' }}>VIEW QUEUE →</span>
        </a>
      )}

      {loading ? (
        <div className="text-xs tracking-widest" style={{ color: 'var(--muted-2)' }}>LOADING OPERATIONS DATA...</div>
      ) : (
        <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
          {/* Left column: all stat rows */}
          <div className="col-span-12 xl:col-span-7 flex flex-col gap-3 min-h-0">
            <div className="grid grid-cols-4 gap-3 shrink-0" style={{ height: 76 }}>
              <StatCard label="TOTAL REVENUE" value={formatPKR(stats.totalRevenue)} big />
              <StatCard label="TOTAL ORDERS" value={String(stats.totalOrders)} sub={`${stats.totalItems} items`} />
              <StatCard label="AVG ORDER VALUE" value={formatPKR(stats.avgOrderValue)} />
              <StatCard label="AVG ITEMS/ORDER" value={stats.avgItemsPerOrder} />
            </div>

            {/* Fulfilled-in-period stat with selector */}
            <div className="rounded-lg px-4 py-3 shrink-0 flex items-center justify-between gap-4 flex-wrap" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div>
                <div className="text-xs tracking-widest mb-1" style={{ color: 'var(--muted-2)' }}>ITEMS FULFILLED</div>
                <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                  {periodStat.fulfilledQty} <span style={{ color: 'var(--muted-2)', fontSize: '1rem' }}>of {periodStat.ordered}</span>
                  <span className="ml-2 text-sm font-mono" style={{ color: 'var(--accent)' }}>{periodStat.pct}%</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={periodType}
                  onChange={e => updatePeriod(e.target.value as PeriodType)}
                  className="px-2 py-1.5 rounded text-xs outline-none"
                  style={selectStyle}
                >
                  <option value="1w">LAST 1 WEEK</option>
                  <option value="2w">LAST 2 WEEKS</option>
                  <option value="4w">LAST 4 WEEKS</option>
                  <option value="custom">CUSTOM</option>
                </select>
                {periodType === 'custom' && (
                  <input
                    type="number"
                    min={1}
                    value={customDays}
                    onChange={e => updatePeriod('custom', Number(e.target.value) || 1)}
                    className="px-2 py-1.5 rounded text-xs outline-none w-16"
                    style={selectStyle}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 shrink-0" style={{ height: 68 }}>
              <StatCard label="CAPTURED" value={formatPKR(stats.paidAmount)} sub={`${stats.paid} orders`} />
              <StatCard label="TO CAPTURE" value={formatPKR(stats.pendingAmount)} sub={`${stats.pending} orders`} warn={stats.pending > 0} />
              <StatCard label="REFUNDED" value={formatPKR(stats.refundedAmount)} sub={`${stats.refunded} orders`} warn={stats.refunded > 0} />
            </div>

            <div className="grid grid-cols-4 gap-3 shrink-0" style={{ height: 68 }}>
              <StatCard label="BACKLOG" value={String(stats.backlog)} warn={stats.backlog > 0} sub="Not yet fulfilled" />
              <StatCard label="UNPAID BACKLOG" value={String(stats.unpaidUnfulfilled)} sub="Pending + unfulfilled" />
              <StatCard label="FULFILLED" value={String(stats.fulfilled)} />
              <StatCard label="FULFILLMENT RATE" value={`${stats.fulfillmentRate}%`} sub={`${stats.unfulfilled} unfulfilled`} />
            </div>

            {/* Fulfillment breakdown bar */}
            {stats.totalOrders > 0 && (
              <div className="rounded-lg px-4 py-3 shrink-0" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>FULFILLMENT BREAKDOWN</div>
                <div className="flex rounded overflow-hidden h-2.5 mb-2">
                  {stats.fulfilled > 0 && <div style={{ width: `${(stats.fulfilled / stats.totalOrders) * 100}%`, background: 'var(--accent)', opacity: 0.85 }} />}
                  {stats.inProgress > 0 && <div style={{ width: `${(stats.inProgress / stats.totalOrders) * 100}%`, background: 'var(--warn)' }} />}
                  {stats.unfulfilled > 0 && <div style={{ width: `${(stats.unfulfilled / stats.totalOrders) * 100}%`, background: 'var(--border)' }} />}
                </div>
                <div className="flex gap-5 text-xs" style={{ color: 'var(--muted-2)' }}>
                  <span style={{ color: 'var(--accent)' }}>■ Fulfilled ({stats.fulfilled})</span>
                  <span style={{ color: 'var(--warn)' }}>■ In Progress ({stats.inProgress})</span>
                  <span>■ Unfulfilled ({stats.unfulfilled})</span>
                </div>
              </div>
            )}
          </div>

          {/* Right column: category breakdown + top products */}
          <div className="col-span-12 xl:col-span-5 flex flex-col gap-3 min-h-0">
            <div className="flex-1 min-h-0">
              <Panel title="REVENUE BY CATEGORY">
                <div className="space-y-2.5">
                  {categoryStats.map(([cat, s], i) => {
                    const max = categoryStats[0]?.[1].revenue || 1;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs" style={{ color: 'var(--text)' }}>{cat}</span>
                          <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{formatPKR(s.revenue)} · {s.units}u</span>
                        </div>
                        <div className="h-1 rounded" style={{ background: 'var(--border)' }}>
                          <div className="h-1 rounded" style={{ width: `${(s.revenue / max) * 100}%`, background: i === 0 ? 'var(--text)' : 'var(--muted-2)' }} />
                        </div>
                      </div>
                    );
                  })}
                  {categoryStats.length === 0 && <div className="text-xs" style={{ color: 'var(--muted-2)' }}>No category data yet</div>}
                </div>
              </Panel>
            </div>
            <div className="flex-1 min-h-0">
              <Panel title="TOP PRODUCTS BY UNITS SOLD">
                <div className="space-y-2.5">
                  {topProducts.map(([title, qty], i) => {
                    const max = topProducts[0]?.[1] || 1;
                    return (
                      <div key={title}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs truncate pr-2" style={{ color: 'var(--text)' }}>{title}</span>
                          <span className="text-xs font-mono shrink-0" style={{ color: 'var(--muted)' }}>{qty} units</span>
                        </div>
                        <div className="h-1 rounded" style={{ background: 'var(--border)' }}>
                          <div className="h-1 rounded" style={{ width: `${(qty / max) * 100}%`, background: i === 0 ? 'var(--text)' : 'var(--muted-2)' }} />
                        </div>
                      </div>
                    );
                  })}
                  {topProducts.length === 0 && <div className="text-xs" style={{ color: 'var(--muted-2)' }}>No product data yet</div>}
                </div>
              </Panel>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
