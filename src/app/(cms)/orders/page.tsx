'use client';
import { useEffect, useState, useMemo } from 'react';
import { formatPKR, formatDate } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';
import SortableHeader from '@/components/SortableHeader';
import { useSortable } from '@/hooks/useSortable';

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

interface OrderRow {
  id: string;
  name: string;
  createdAt: string;
  customer: string;
  financialStatus: string;
  fulfillmentStatus: string;
  amount: number;
  _raw: Order;
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

  const rows: OrderRow[] = useMemo(() => orders.map(o => ({
    id: o.id,
    name: o.name,
    createdAt: o.createdAt,
    customer: o.customer ? `${o.customer.firstName} ${o.customer.lastName}` : 'Guest',
    financialStatus: o.financialStatus || '',
    fulfillmentStatus: o.fulfillmentStatus || 'UNFULFILLED',
    amount: Number(o.totalPriceSet?.shopMoney?.amount || 0),
    _raw: o,
  })), [orders]);

  const { sorted, sortKey, sortDir, toggle } = useSortable<OrderRow>(rows, 'createdAt', 'desc');

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

  const sh = (label: string, key: keyof OrderRow) => (
    <SortableHeader
      label={label}
      sortKey={key as string}
      activeSortKey={sortKey as string}
      sortDir={sortDir}
      onSort={k => toggle(k as keyof OrderRow)}
      className="px-4"
    />
  );

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
                {sh('ORDER', 'name')}
                {sh('DATE', 'createdAt')}
                {sh('CUSTOMER', 'customer')}
                {sh('FINANCIAL', 'financialStatus')}
                {sh('FULFILLMENT', 'fulfillmentStatus')}
                {sh('AMOUNT', 'amount')}
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => (
                <>
                  <tr
                    key={row.id}
                    className="cursor-pointer"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onClick={() => toggleExpand(row.id)}
                  >
                    <td className="px-4 py-3" style={{ color: 'var(--muted-2)' }}>
                      {expanded === row.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--accent)' }}>{row.name}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{row.customer}</td>
                    <td className="px-4 py-3">
                      {(() => { const s = statusStyle(row.financialStatus, 'financial'); return (
                        <span className="px-2 py-0.5 rounded" style={{ background: s.bg, color: s.color }}>
                          {row.financialStatus}
                        </span>
                      ); })()}
                    </td>
                    <td className="px-4 py-3">
                      {(() => { const s = statusStyle(row.fulfillmentStatus, 'fulfillment'); return (
                        <span className="px-2 py-0.5 rounded" style={{ background: s.bg, color: s.color }}>
                          {row.fulfillmentStatus}
                        </span>
                      ); })()}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--text)' }}>
                      {formatPKR(row.amount)}
                    </td>
                  </tr>
                  {expanded === row.id && (
                    <tr key={`${row.id}-detail`} style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                      <td colSpan={7} className="px-8 py-4">
                        <div className="text-xs mb-2 tracking-widest uppercase" style={{ color: 'var(--muted-2)' }}>Line Items</div>
                        {row._raw.lineItems?.edges?.map(({ node }, i) => (
                          <div key={i} className="flex justify-between py-1" style={{ color: 'var(--muted)' }}>
                            <span>{node.title} × {node.quantity}</span>
                            {node.variant?.price && <span className="font-mono">{formatPKR(node.variant.price)}</span>}
                          </div>
                        ))}
                        {row._raw.customer?.email && (
                          <div className="mt-2 text-xs" style={{ color: 'var(--muted-2)' }}>
                            {row._raw.customer.email}
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
