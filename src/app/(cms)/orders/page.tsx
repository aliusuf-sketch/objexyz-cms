'use client';
import { useEffect, useState, useMemo } from 'react';
import { formatPKR, formatDate } from '@/lib/utils';
import { ChevronDown, ChevronRight, FileDown, Sheet } from 'lucide-react';
import SortableHeader from '@/components/SortableHeader';
import { useSortable } from '@/hooks/useSortable';
import type { InvoiceData } from '@/components/InvoiceDocument';

interface LineItem { title: string; quantity: number; variant?: { title?: string; price: string } }
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
  const [generating, setGenerating] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<'7d' | '30d' | '90d' | '180d' | 'custom'>('30d');
  const [customDays, setCustomDays] = useState(30);
  const [exportingXlsx, setExportingXlsx] = useState(false);

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

  async function downloadInvoice(row: OrderRow, e: React.MouseEvent) {
    e.stopPropagation();
    setGenerating(row.id);
    try {
      const [{ pdf }, { default: InvoiceDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/InvoiceDocument'),
      ]);
      const invoiceNumber = `INV-${row.name.replace('#', '')}`;
      const data: InvoiceData = {
        invoiceNumber,
        orderName: row.name,
        invoiceDate: formatDate(row.createdAt),
        customerName: row.customer,
        customerEmail: row._raw.customer?.email,
        currency: row._raw.totalPriceSet?.shopMoney?.currencyCode || 'PKR',
        lineItems: (row._raw.lineItems?.edges || []).map(({ node }) => ({
          title: node.title,
          variantTitle: node.variant?.title,
          quantity: node.quantity,
          rate: Number(node.variant?.price || 0),
        })),
      };
      const blob = await pdf(<InvoiceDocument data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(null);
    }
  }

  const PERIOD_DAYS: Record<Exclude<typeof periodType, 'custom'>, number> = { '7d': 7, '30d': 30, '90d': 90, '180d': 180 };
  const periodDays = periodType === 'custom' ? customDays : PERIOD_DAYS[periodType];
  const periodLabel = periodType === 'custom' ? `${customDays}d` : periodType;

  async function exportExcel() {
    setExportingXlsx(true);
    try {
      const { Workbook } = await import('exceljs');
      const cutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000;
      const filtered = orders
        .filter(o => new Date(o.createdAt).getTime() >= cutoff)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const wb = new Workbook();
      const ws = wb.addWorksheet('Orders');
      ws.columns = [
        { header: 'Order No', key: 'orderNo', width: 14 },
        { header: 'Date', key: 'date', width: 14 },
        { header: 'No of Items', key: 'items', width: 14 },
        { header: 'Total Amount (PKR)', key: 'amount', width: 20 },
      ];
      ws.getRow(1).font = { bold: true };

      let totalItems = 0, totalAmount = 0;
      filtered.forEach(o => {
        const items = o.lineItems?.edges?.reduce((s, e) => s + e.node.quantity, 0) || 0;
        const amount = Number(o.totalPriceSet?.shopMoney?.amount || 0);
        totalItems += items;
        totalAmount += amount;
        ws.addRow({ orderNo: o.name, date: formatDate(o.createdAt), items, amount });
      });

      ws.addRow({});
      const totalRow = ws.addRow({ orderNo: 'TOTAL', items: totalItems, amount: totalAmount });
      totalRow.font = { bold: true };
      ws.getColumn('amount').numFmt = '#,##0';

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `objexyz-orders-${periodLabel}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingXlsx(false);
    }
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
      <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-widest uppercase txt-heading">ORDERS</h1>
          <p className="text-xs mt-1 tracking-widest" style={{ color: 'var(--muted-2)' }}>ALL ORDERS FROM 2026-05-09</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={periodType}
            onChange={e => setPeriodType(e.target.value as typeof periodType)}
            className="px-2 py-2 rounded text-xs outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--input-border)', color: 'var(--text)' }}
          >
            <option value="7d">LAST 7 DAYS</option>
            <option value="30d">LAST 1 MONTH</option>
            <option value="90d">LAST 3 MONTHS</option>
            <option value="180d">LAST 6 MONTHS</option>
            <option value="custom">CUSTOM DAYS</option>
          </select>
          {periodType === 'custom' && (
            <input
              type="number"
              min={1}
              value={customDays}
              onChange={e => setCustomDays(Number(e.target.value) || 1)}
              className="px-2 py-2 rounded text-xs outline-none w-16"
              style={{ background: 'var(--surface)', border: '1px solid var(--input-border)', color: 'var(--text)' }}
            />
          )}
          <button
            onClick={exportExcel}
            disabled={exportingXlsx || loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-xs tracking-widest uppercase"
            style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}
          >
            <Sheet size={12} /> {exportingXlsx ? 'EXPORTING...' : 'EXPORT XLSX'}
          </button>
        </div>
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
                <th className="text-left px-4 py-3 tracking-widest" style={{ color: 'var(--muted-2)' }}>INVOICE</th>
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
                    <td className="px-4 py-3">
                      <button
                        onClick={e => downloadInvoice(row, e)}
                        disabled={generating === row.id}
                        className="flex items-center gap-1 px-2.5 py-1 rounded text-xs tracking-widest uppercase transition-colors"
                        style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}
                      >
                        <FileDown size={11} />
                        {generating === row.id ? '...' : 'PDF'}
                      </button>
                    </td>
                  </tr>
                  {expanded === row.id && (
                    <tr key={`${row.id}-detail`} style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                      <td colSpan={8} className="px-8 py-4">
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
