'use client';
import { useEffect, useState, useMemo } from 'react';
import { formatPKR, formatDate } from '@/lib/utils';
import SortableHeader from '@/components/SortableHeader';
import { useSortable } from '@/hooks/useSortable';

interface Order {
  id: string;
  name: string;
  createdAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  totalPriceSet: { shopMoney: { amount: string } };
  lineItems: { edges: { node: { title: string; quantity: number } }[] };
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

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalPriceSet?.shopMoney?.amount || 0), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const fulfilled = orders.filter(o => o.fulfillmentStatus === 'FULFILLED').length;
  const fulfillmentRate = totalOrders > 0 ? Math.round((fulfilled / totalOrders) * 100) : 0;

  // Revenue by day
  const revenueByDay: Record<string, number> = {};
  orders.forEach(o => {
    const day = o.createdAt?.slice(0, 10);
    if (day) revenueByDay[day] = (revenueByDay[day] || 0) + Number(o.totalPriceSet?.shopMoney?.amount || 0);
  });

  // Top products
  const productCounts: Record<string, number> = {};
  orders.forEach(o => {
    o.lineItems?.edges?.forEach(({ node }) => {
      productCounts[node.title] = (productCounts[node.title] || 0) + node.quantity;
    });
  });
  const topProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  interface DashOrderRow { id: string; name: string; createdAt: string; financialStatus: string; fulfillmentStatus: string; amount: number; }
  const dashRows: DashOrderRow[] = useMemo(() => orders.slice(0, 10).map(o => ({
    id: o.id,
    name: o.name,
    createdAt: o.createdAt,
    financialStatus: o.financialStatus || '',
    fulfillmentStatus: o.fulfillmentStatus || 'UNFULFILLED',
    amount: Number(o.totalPriceSet?.shopMoney?.amount || 0),
  })), [orders]);
  const { sorted: sortedDash, sortKey: dsk, sortDir: dsd, toggle: dtoggle } = useSortable<DashOrderRow>(dashRows, 'createdAt', 'desc');
  const dsh = (label: string, key: keyof DashOrderRow) => (
    <SortableHeader label={label} sortKey={key as string} activeSortKey={dsk as string} sortDir={dsd} onSort={k => dtoggle(k as keyof DashOrderRow)} />
  );

  const kpis = [
    { label: 'TOTAL REVENUE', value: formatPKR(totalRevenue), accent: true },
    { label: 'TOTAL ORDERS', value: totalOrders.toString(), accent: false },
    { label: 'AVG ORDER VALUE', value: formatPKR(avgOrderValue), accent: false },
    { label: 'FULFILLMENT RATE', value: `${fulfillmentRate}%`, accent: false },
  ];

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
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
            {kpis.map(k => (
              <div key={k.label} className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="text-xs tracking-widest mb-2" style={{ color: 'var(--muted-2)' }}>{k.label}</div>
                <div className="text-2xl font-bold" style={{ color: k.accent ? 'var(--accent)' : 'var(--text)' }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Recent Orders */}
          <div className="rounded-lg mb-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>RECENT ORDERS</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {dsh('ORDER', 'name')}
                    {dsh('DATE', 'createdAt')}
                    {dsh('FINANCIAL', 'financialStatus')}
                    {dsh('FULFILLMENT', 'fulfillmentStatus')}
                    {dsh('AMOUNT', 'amount')}
                  </tr>
                </thead>
                <tbody>
                  {sortedDash.map(order => (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-5 py-3 font-mono" style={{ color: 'var(--accent)' }}>{order.name}</td>
                      <td className="px-5 py-3" style={{ color: 'var(--muted)' }}>{formatDate(order.createdAt)}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded text-xs" style={{
                          background: order.financialStatus === 'PAID' ? 'var(--accent-bg)' : 'var(--warn-bg)',
                          color: order.financialStatus === 'PAID' ? 'var(--accent)' : 'var(--warn)'
                        }}>
                          {order.financialStatus}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded text-xs" style={{
                          background: order.fulfillmentStatus === 'FULFILLED' ? 'var(--accent-bg)' : 'var(--neutral-bg)',
                          color: order.fulfillmentStatus === 'FULFILLED' ? 'var(--accent)' : 'var(--muted)'
                        }}>
                          {order.fulfillmentStatus}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono" style={{ color: 'var(--text)' }}>
                        {formatPKR(order.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Products */}
          <div className="rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>TOP PRODUCTS</h2>
            </div>
            <div className="p-5 space-y-3">
              {topProducts.map(([title, qty]) => (
                <div key={title} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text)' }}>{title}</span>
                  <span className="text-xs font-mono" style={{ color: 'var(--accent)' }}>{qty} units</span>
                </div>
              ))}
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
