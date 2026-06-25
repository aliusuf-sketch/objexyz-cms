'use client';
import { useEffect, useState } from 'react';
import { formatPKR, formatDate } from '@/lib/utils';

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

  const kpis = [
    { label: 'TOTAL REVENUE', value: formatPKR(totalRevenue), accent: true },
    { label: 'TOTAL ORDERS', value: totalOrders.toString(), accent: false },
    { label: 'AVG ORDER VALUE', value: formatPKR(avgOrderValue), accent: false },
    { label: 'FULFILLMENT RATE', value: `${fulfillmentRate}%`, accent: false },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-widest uppercase text-white">DASHBOARD</h1>
        <p className="text-xs mt-1 tracking-widest" style={{ color: '#555' }}>OBJEXYZ STUDIO — OPS CENTER — SINCE 2026-05-09</p>
      </div>

      {loading ? (
        <div className="text-xs tracking-widest" style={{ color: '#555' }}>LOADING OPERATIONS DATA...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
            {kpis.map(k => (
              <div key={k.label} className="rounded-lg p-5" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                <div className="text-xs tracking-widest mb-2" style={{ color: '#555' }}>{k.label}</div>
                <div className="text-2xl font-bold" style={{ color: k.accent ? '#4a7c3f' : '#e5e5e5' }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Recent Orders */}
          <div className="rounded-lg mb-8" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: '#2a2a2a' }}>
              <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: '#888' }}>RECENT ORDERS</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                    {['ORDER', 'DATE', 'FINANCIAL', 'FULFILLMENT', 'AMOUNT'].map(h => (
                      <th key={h} className="text-left px-5 py-3 tracking-widest" style={{ color: '#555' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 10).map(order => (
                    <tr key={order.id} style={{ borderBottom: '1px solid #1f1f1f' }}>
                      <td className="px-5 py-3 font-mono" style={{ color: '#4a7c3f' }}>{order.name}</td>
                      <td className="px-5 py-3" style={{ color: '#888' }}>{formatDate(order.createdAt)}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded text-xs" style={{
                          background: order.financialStatus === 'PAID' ? 'rgba(74,124,63,0.2)' : 'rgba(245,158,11,0.15)',
                          color: order.financialStatus === 'PAID' ? '#4a7c3f' : '#f59e0b'
                        }}>
                          {order.financialStatus}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded text-xs" style={{
                          background: order.fulfillmentStatus === 'FULFILLED' ? 'rgba(74,124,63,0.2)' : 'rgba(100,100,100,0.2)',
                          color: order.fulfillmentStatus === 'FULFILLED' ? '#4a7c3f' : '#888'
                        }}>
                          {order.fulfillmentStatus || 'UNFULFILLED'}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono" style={{ color: '#e5e5e5' }}>
                        {formatPKR(order.totalPriceSet?.shopMoney?.amount || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Products */}
          <div className="rounded-lg" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: '#2a2a2a' }}>
              <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: '#888' }}>TOP PRODUCTS</h2>
            </div>
            <div className="p-5 space-y-3">
              {topProducts.map(([title, qty]) => (
                <div key={title} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#e5e5e5' }}>{title}</span>
                  <span className="text-xs font-mono" style={{ color: '#4a7c3f' }}>{qty} units</span>
                </div>
              ))}
              {topProducts.length === 0 && (
                <div className="text-xs" style={{ color: '#555' }}>No product data yet</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
