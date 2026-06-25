'use client';
import { useEffect, useState } from 'react';
import { formatPKR, formatDate } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface LineItem { title: string; quantity: number; variant?: { price: string } }
interface Order {
  id: string;
  name: string;
  createdAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  customer?: { firstName: string; lastName: string; email: string };
  lineItems: { edges: { node: LineItem }[] };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/shopify/orders')
      .then(r => r.json())
      .then(data => {
        const edges = data?.data?.orders?.edges || [];
        setOrders(edges.map((e: { node: Order }) => e.node));
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleExpand(id: string) {
    setExpanded(prev => prev === id ? null : id);
  }

  const statusStyle = (status: string, type: 'financial' | 'fulfillment') => {
    if (type === 'financial') {
      const map: Record<string, { bg: string; color: string }> = {
        PAID: { bg: 'rgba(74,124,63,0.2)', color: '#4a7c3f' },
        PENDING: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
        REFUNDED: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
      };
      return map[status] || { bg: 'rgba(100,100,100,0.15)', color: '#888' };
    }
    const map: Record<string, { bg: string; color: string }> = {
      FULFILLED: { bg: 'rgba(74,124,63,0.2)', color: '#4a7c3f' },
      UNFULFILLED: { bg: 'rgba(100,100,100,0.15)', color: '#888' },
      PARTIAL: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    };
    return map[status] || { bg: 'rgba(100,100,100,0.15)', color: '#888' };
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-widest uppercase text-white">ORDERS</h1>
        <p className="text-xs mt-1 tracking-widest" style={{ color: '#555' }}>ALL ORDERS FROM 2026-05-09</p>
      </div>

      {loading ? (
        <div className="text-xs tracking-widest" style={{ color: '#555' }}>LOADING ORDER MANIFEST...</div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                <th className="w-8 px-4 py-3"></th>
                {['ORDER', 'DATE', 'CUSTOMER', 'FINANCIAL', 'FULFILLMENT', 'AMOUNT'].map(h => (
                  <th key={h} className="text-left px-4 py-3 tracking-widest" style={{ color: '#555' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <>
                  <tr
                    key={order.id}
                    className="cursor-pointer"
                    style={{ borderBottom: '1px solid #1f1f1f' }}
                    onClick={() => toggleExpand(order.id)}
                  >
                    <td className="px-4 py-3" style={{ color: '#555' }}>
                      {expanded === order.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: '#4a7c3f' }}>{order.name}</td>
                    <td className="px-4 py-3" style={{ color: '#888' }}>{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3" style={{ color: '#888' }}>
                      {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Guest'}
                    </td>
                    <td className="px-4 py-3">
                      {(() => { const s = statusStyle(order.financialStatus, 'financial'); return (
                        <span className="px-2 py-0.5 rounded" style={{ background: s.bg, color: s.color }}>
                          {order.financialStatus}
                        </span>
                      ); })()}
                    </td>
                    <td className="px-4 py-3">
                      {(() => { const s = statusStyle(order.fulfillmentStatus || 'UNFULFILLED', 'fulfillment'); return (
                        <span className="px-2 py-0.5 rounded" style={{ background: s.bg, color: s.color }}>
                          {order.fulfillmentStatus || 'UNFULFILLED'}
                        </span>
                      ); })()}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: '#e5e5e5' }}>
                      {formatPKR(order.totalPriceSet?.shopMoney?.amount || 0)}
                    </td>
                  </tr>
                  {expanded === order.id && (
                    <tr key={`${order.id}-detail`} style={{ background: '#141414', borderBottom: '1px solid #2a2a2a' }}>
                      <td colSpan={7} className="px-8 py-4">
                        <div className="text-xs mb-2 tracking-widest uppercase" style={{ color: '#555' }}>Line Items</div>
                        {order.lineItems?.edges?.map(({ node }, i) => (
                          <div key={i} className="flex justify-between py-1" style={{ color: '#888' }}>
                            <span>{node.title} × {node.quantity}</span>
                            {node.variant?.price && <span className="font-mono">{formatPKR(node.variant.price)}</span>}
                          </div>
                        ))}
                        {order.customer?.email && (
                          <div className="mt-2 text-xs" style={{ color: '#555' }}>
                            {order.customer.email}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
