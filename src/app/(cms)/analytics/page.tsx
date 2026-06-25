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
        <h1 className="text-xl font-bold tracking-widest uppercase text-white">ANALYTICS</h1>
        <p className="text-xs mt-1 tracking-widest" style={{ color: '#555' }}>PERFORMANCE SINCE 2026-05-09</p>
      </div>

      {loading && <div className="text-xs tracking-widest" style={{ color: '#555' }}>RUNNING SHOPIFYQL QUERIES...</div>}
      {error && (
        <div className="rounded p-4 mb-6 text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
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
              <div key={k.label} className="rounded-lg p-5" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                <div className="text-xs tracking-widest mb-2" style={{ color: '#555' }}>{k.label}</div>
                <div className="text-2xl font-bold text-white">{k.value}</div>
              </div>
            ))}
          </div>

          {/* Revenue Over Time */}
          <div className="rounded-lg mb-6" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: '#2a2a2a' }}>
              <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: '#888' }}>REVENUE OVER TIME</h2>
            </div>
            <div className="p-5">
              {revenueRows.length === 0 ? (
                <div className="text-xs" style={{ color: '#555' }}>No revenue data in range</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                      <th className="text-left py-2 tracking-widest" style={{ color: '#555' }}>DATE</th>
                      <th className="text-left py-2 tracking-widest" style={{ color: '#555' }}>REVENUE</th>
                      <th className="text-left py-2 tracking-widest" style={{ color: '#555' }}>ORDERS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueRows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1f1f1f' }}>
                        <td className="py-2" style={{ color: '#888' }}>{row['day'] || row['date'] || ''}</td>
                        <td className="py-2 font-mono" style={{ color: '#4a7c3f' }}>{formatPKR(row['total_sales'] || 0)}</td>
                        <td className="py-2 font-mono" style={{ color: '#888' }}>{row['orders'] || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="rounded-lg mb-6" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: '#2a2a2a' }}>
              <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: '#888' }}>TOP 10 PRODUCTS BY GROSS SALES</h2>
            </div>
            <div className="p-5">
              {productRows.length === 0 ? (
                <div className="text-xs" style={{ color: '#555' }}>No product sales data yet</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                      <th className="text-left py-2 tracking-widest" style={{ color: '#555' }}>PRODUCT</th>
                      <th className="text-left py-2 tracking-widest" style={{ color: '#555' }}>GROSS SALES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productRows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1f1f1f' }}>
                        <td className="py-2" style={{ color: '#e5e5e5' }}>{row['product_title'] || '—'}</td>
                        <td className="py-2 font-mono" style={{ color: '#4a7c3f' }}>{formatPKR(row['gross_sales'] || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Sessions Over Time */}
          <div className="rounded-lg" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: '#2a2a2a' }}>
              <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: '#888' }}>SESSIONS OVER TIME</h2>
            </div>
            <div className="p-5">
              {sessionRows.length === 0 ? (
                <div className="text-xs" style={{ color: '#555' }}>No session data in range</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                      <th className="text-left py-2 tracking-widest" style={{ color: '#555' }}>DATE</th>
                      <th className="text-left py-2 tracking-widest" style={{ color: '#555' }}>SESSIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionRows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1f1f1f' }}>
                        <td className="py-2" style={{ color: '#888' }}>{row['day'] || row['date'] || ''}</td>
                        <td className="py-2 font-mono" style={{ color: '#4a7c3f' }}>{row['sessions'] || 0}</td>
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
