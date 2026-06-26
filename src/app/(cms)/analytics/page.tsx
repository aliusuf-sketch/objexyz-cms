'use client';
import { useEffect, useState } from 'react';
import { formatPKR } from '@/lib/utils';

interface AnalyticsData {
  revenueData: { data?: { shopifyqlQuery?: { tableData?: { rowData: string[][], columns: { name: string }[] } } } };
  productData: { data?: { shopifyqlQuery?: { tableData?: { rowData: string[][], columns: { name: string }[] } } } };
  sessionData: { data?: { shopifyqlQuery?: { tableData?: { rowData: string[][], columns: { name: string }[] } } } };
}

function parseShopifyQL(result: AnalyticsData['revenueData']) {
  const tableData = result?.data?.shopifyqlQuery?.tableData;
  if (!tableData) return [];
  const { rowData, columns } = tableData;
  return rowData.map(row => {
    const obj: Record<string, string> = {};
    columns.forEach((col, i) => { obj[col.name] = row[i]; });
    return obj;
  });
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/shopify/analytics')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const revenueRows = data ? parseShopifyQL(data.revenueData) : [];
  const productRows = data ? parseShopifyQL(data.productData) : [];
  const sessionRows = data ? parseShopifyQL(data.sessionData) : [];

  const totalRevenue = revenueRows.reduce((s, r) => s + Number(r['total_sales'] || 0), 0);
  const totalOrders = revenueRows.reduce((s, r) => s + Number(r['orders'] || 0), 0);
  const totalSessions = sessionRows.reduce((s, r) => s + Number(r['sessions'] || 0), 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-widest uppercase txt-heading">ANALYTICS</h1>
        <p className="text-xs mt-1 tracking-widest" style={{ color: 'var(--muted-2)' }}>PERFORMANCE SINCE 2026-05-09</p>
      </div>

      {loading && <div className="text-xs tracking-widest" style={{ color: 'var(--muted-2)' }}>RUNNING SHOPIFYQL QUERIES...</div>}
      {error && (
        <div className="rounded p-4 mb-6 text-xs" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)' }}>
          ShopifyQL Error: {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'TOTAL REVENUE', value: formatPKR(totalRevenue) },
              { label: 'TOTAL ORDERS', value: totalOrders.toString() },
              { label: 'TOTAL SESSIONS', value: totalSessions.toString() },
            ].map(k => (
              <div key={k.label} className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="text-xs tracking-widest mb-2" style={{ color: 'var(--muted-2)' }}>{k.label}</div>
                <div className="text-2xl font-bold txt-heading">{k.value}</div>
              </div>
            ))}
          </div>

          {/* Revenue Over Time */}
          <div className="rounded-lg mb-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>REVENUE OVER TIME</h2>
            </div>
            <div className="p-5">
              {revenueRows.length === 0 ? (
                <div className="text-xs" style={{ color: 'var(--muted-2)' }}>No revenue data in range</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th className="text-left py-2 tracking-widest" style={{ color: 'var(--muted-2)' }}>DATE</th>
                      <th className="text-left py-2 tracking-widest" style={{ color: 'var(--muted-2)' }}>REVENUE</th>
                      <th className="text-left py-2 tracking-widest" style={{ color: 'var(--muted-2)' }}>ORDERS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueRows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td className="py-2" style={{ color: 'var(--muted)' }}>{row['day'] || row['date'] || ''}</td>
                        <td className="py-2 font-mono" style={{ color: 'var(--accent)' }}>{formatPKR(row['total_sales'] || 0)}</td>
                        <td className="py-2 font-mono" style={{ color: 'var(--muted)' }}>{row['orders'] || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="rounded-lg mb-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>TOP 10 PRODUCTS BY GROSS SALES</h2>
            </div>
            <div className="p-5">
              {productRows.length === 0 ? (
                <div className="text-xs" style={{ color: 'var(--muted-2)' }}>No product sales data yet</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th className="text-left py-2 tracking-widest" style={{ color: 'var(--muted-2)' }}>PRODUCT</th>
                      <th className="text-left py-2 tracking-widest" style={{ color: 'var(--muted-2)' }}>GROSS SALES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productRows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td className="py-2" style={{ color: 'var(--text)' }}>{row['product_title'] || '—'}</td>
                        <td className="py-2 font-mono" style={{ color: 'var(--accent)' }}>{formatPKR(row['gross_sales'] || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Sessions Over Time */}
          <div className="rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>SESSIONS OVER TIME</h2>
            </div>
            <div className="p-5">
              {sessionRows.length === 0 ? (
                <div className="text-xs" style={{ color: 'var(--muted-2)' }}>No session data in range</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th className="text-left py-2 tracking-widest" style={{ color: 'var(--muted-2)' }}>DATE</th>
                      <th className="text-left py-2 tracking-widest" style={{ color: 'var(--muted-2)' }}>SESSIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionRows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td className="py-2" style={{ color: 'var(--muted)' }}>{row['day'] || row['date'] || ''}</td>
                        <td className="py-2 font-mono" style={{ color: 'var(--accent)' }}>{row['sessions'] || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
