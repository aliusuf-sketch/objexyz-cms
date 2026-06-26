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
        PAID: { bg: 'var(--accent-bg)', color: 'var(--accent)' },
        PENDING: { bg: 'var(--warn-bg)', color: 'var(--warn)' },
        REFUNDED: { bg: 'var(--danger-bg)', color: 'var(--danger)' },
      };
      return map[status] || { bg: 'var(--neutral-bg)', color: 'var(--muted)' };
    }
    const map: Record<string, { bg: string; color: string }> = {
      FULFILLED: { bg: 'var(--accent-bg)', color: 'var(--accent)' },
      UNFULFILLED: { bg: 'var(--neutral-bg)', color: 'var(--muted)' },
      PARTIAL: { bg: 'var(--warn-bg)', color: 'var(--warn)' },
    };
    return map[status] || { bg: 'var(--neutral-bg)', color: 'var(--muted)' };
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-widest uppercase txt-heading">ORDERS</h1>
        <p className="text-xs mt-1 tracking-widest" style={{ color: 'var(--muted-2)' }}>ALL ORDERS FROM 2026-05-09</p>
      </div>

      {loading ? (
        <div className="text-xs tracking-widest" style={{ color: 'var(--muted-2)' }}>LOADING ORDER MANIFEST...</div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="w-8 px-4 py-3"></th>
                {['ORDER', 'DATE', 'CUSTOMER', 'FINANCIAL', 'FULFILLMENT', 'AMOUNT'].map(h => (
                  <th key={h} className="text-left px-4 py-3 tracking-widest" style={{ color: 'var(--muted-2)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <>
                  <tr
                    key={order.id}
                    className="cursor-pointer"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onClick={() => toggleExpand(order.id)}
                  >
                    <td className="px-4 py-3" style={{ color: 'var(--muted-2)' }}>
                      {expanded === order.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--accent)' }}>{order.name}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>
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
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--text)' }}>
                      {formatPKR(order.totalPriceSet?.shopMoney?.amount || 0)}
                    </td>
                  </tr>
                  {expanded === order.id && (
                    <tr key={`${order.id}-detail`} style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                      <td colSpan={7} className="px-8 py-4">
                        <div className="text-xs mb-2 tracking-widest uppercase" style={{ color: 'var(--muted-2)' }}>Line Items</div>
                        {order.lineItems?.edges?.map(({ node }, i) => (
                          <div key={i} className="flex justify-between py-1" style={{ color: 'var(--muted)' }}>
                            <span>{node.title} × {node.quantity}</span>
                            {node.variant?.price && <span className="font-mono">{formatPKR(node.variant.price)}</span>}
                          </div>
                        ))}
                        {order.customer?.email && (
                          <div className="mt-2 text-xs" style={{ color: 'var(--muted-2)' }}>
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
