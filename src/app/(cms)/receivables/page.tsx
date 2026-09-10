'use client';
import { useMemo, useState } from 'react';
import { formatPKR, formatDate } from '@/lib/utils';
import { useReceivables } from '@/hooks/useReceivables';
import { ReceivableOrderVM, orderReceivableTotal } from '@/lib/receivables';
import LocalDataWarning from '@/components/LocalDataWarning';
import { exportRowsToXlsx, exportDateStamp } from '@/lib/exportExcel';
import {
  RefreshCw, Download, FileText, RotateCcw, X, Plus, Package, AlertTriangle,
} from 'lucide-react';
import {
  Card, PageHeading, Loading, ErrorNote, Badge, FinancialBadge, FulfillmentBadge, inputStyle,
} from '@/components/ui';

function AddItemRow({ onAdd }: { onAdd: (title: string, price: number) => void }) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  function submit() {
    const p = Number(price);
    if (!title.trim() || !p) return;
    onAdd(title.trim(), p);
    setTitle(''); setPrice('');
  }
  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        type="text" placeholder="Ad-hoc item name" value={title}
        onChange={e => setTitle(e.target.value)}
        className="flex-1 px-2 py-1 rounded text-xs outline-none" style={inputStyle}
      />
      <input
        type="number" placeholder="Price" value={price} min={0}
        onChange={e => setPrice(e.target.value)}
        className="w-24 px-2 py-1 rounded text-xs outline-none" style={inputStyle}
      />
      <button
        onClick={submit}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs tracking-widest uppercase"
        style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}
      >
        <Plus size={11} /> ADD
      </button>
    </div>
  );
}

function OrderCard({
  order, onToggle, onRemove, onAdd, onDisputedChange, onNoteChange, onAmountChange, onReset,
}: {
  order: ReceivableOrderVM;
  onToggle: (key: string) => void;
  onRemove: (key: string) => void;
  onAdd: (title: string, price: number) => void;
  onDisputedChange: (v: boolean) => void;
  onNoteChange: (v: string) => void;
  onAmountChange: (v: number) => void;
  onReset: () => void;
}) {
  const { amount: contribution, clamped } = orderReceivableTotal(order);
  const itemsLocked = order.locked && !order.disputed;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between flex-wrap gap-2" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-sm font-bold" style={{ color: 'var(--accent)' }}>{order.name}</span>
          <span className="text-xs" style={{ color: 'var(--muted-2)' }}>{formatDate(order.date)}</span>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>{order.customer}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <FinancialBadge status={order.financialStatus} />
          <FulfillmentBadge status={order.fulfillmentStatus} />
          {order.shippedWithoutPayment && <Badge text="SHIPPED WITHOUT PAYMENT" tone="danger" />}
          {order.disputed && <Badge text="DISPUTED" tone="danger" />}
          <button onClick={onReset} title="Reset this order" className="p-1 rounded" style={{ color: 'var(--muted-2)' }}>
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="p-4">
        {order.items.map(item => (
          <div key={item.key} className="flex items-center gap-3 py-1.5">
            <input
              type="checkbox"
              checked={item.checked}
              disabled={itemsLocked}
              onChange={() => onToggle(item.key)}
              className="shrink-0"
            />
            <div className="shrink-0 rounded overflow-hidden flex items-center justify-center"
                 style={{ width: 32, height: 32, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              {item.imageUrl
                ? <img src={item.imageUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Package size={13} style={{ color: 'var(--muted-2)' }} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs truncate" style={{ color: item.checked ? 'var(--text)' : 'var(--muted-2)' }}>
                {item.title}{item.variant && <span className="font-mono" style={{ color: 'var(--muted-2)' }}> · {item.variant}</span>}
                {item.isCustom && <span className="ml-1 text-xs" style={{ color: 'var(--warn)' }}>(ad-hoc)</span>}
              </div>
            </div>
            <span className="text-xs font-mono shrink-0" style={{
              color: item.checked ? 'var(--text)' : 'var(--muted-2)',
              textDecoration: item.checked ? 'none' : 'line-through',
            }}>
              {formatPKR(item.price)}
            </span>
            {!itemsLocked && (
              <button onClick={() => onRemove(item.key)} className="shrink-0 p-0.5" style={{ color: 'var(--muted-2)' }}>
                <X size={13} />
              </button>
            )}
          </div>
        ))}

        {order.shipping && (
          <div className="flex items-center gap-3 py-1.5">
            <input
              type="checkbox"
              checked={order.shipping.checked}
              disabled={itemsLocked}
              onChange={() => onToggle(order.shipping!.key)}
              className="shrink-0"
            />
            <div className="shrink-0" style={{ width: 32 }} />
            <div className="min-w-0 flex-1 text-xs" style={{ color: order.shipping.checked ? 'var(--text)' : 'var(--muted-2)' }}>Shipping</div>
            <span className="text-xs font-mono shrink-0" style={{
              color: order.shipping.checked ? 'var(--text)' : 'var(--muted-2)',
              textDecoration: order.shipping.checked ? 'none' : 'line-through',
            }}>
              {formatPKR(order.shipping.price)}
            </span>
            {!itemsLocked && (
              <button onClick={() => onRemove(order.shipping!.key)} className="shrink-0 p-0.5" style={{ color: 'var(--muted-2)' }}>
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {!itemsLocked && <AddItemRow onAdd={onAdd} />}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t flex items-center justify-between flex-wrap gap-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
            <input type="checkbox" checked={order.disputed} onChange={e => onDisputedChange(e.target.checked)} />
            DISPUTED
          </label>

          {order.disputed ? (
            <>
              <input
                type="text" placeholder="Dispute note" value={order.disputeNote}
                onChange={e => onNoteChange(e.target.value)}
                className="px-2 py-1 rounded text-xs outline-none w-44" style={inputStyle}
              />
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
                Received
                <input
                  type="number" min={0} value={order.amountReceived || ''}
                  onChange={e => onAmountChange(Number(e.target.value) || 0)}
                  className="w-24 px-2 py-1 rounded text-xs outline-none" style={inputStyle}
                />
              </div>
              {clamped && (
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--warn)' }}>
                  <AlertTriangle size={11} /> received exceeds total
                </span>
              )}
            </>
          ) : itemsLocked ? (
            <span className="text-xs" style={{ color: 'var(--accent)' }}>Already paid — excluded from receivable</span>
          ) : (
            <span className="text-xs" style={{ color: 'var(--warn)' }}>Awaiting payment</span>
          )}
        </div>

        <span className="text-sm font-mono font-bold" style={{ color: itemsLocked ? 'var(--muted-2)' : 'var(--text)' }}>
          {formatPKR(contribution)}
        </span>
      </div>
    </Card>
  );
}

export default function ReceivablesPage() {
  const {
    orders, loading, syncing, error, localWarning, sync,
    toggleItem, removeItem, addItem, setDisputed, setDisputeNote, setAmountReceived, resetOrder,
  } = useReceivables();
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const grandTotal = useMemo(
    () => orders.reduce((s, o) => s + orderReceivableTotal(o).amount, 0),
    [orders]
  );

  function exportRows() {
    const rows: { order: string; date: string; customer: string; item: string; amount: number }[] = [];
    orders.forEach(o => {
      if (o.locked) return;
      o.items.filter(i => i.checked).forEach(i => {
        rows.push({ order: o.name, date: formatDate(o.date), customer: o.customer, item: i.title, amount: i.price });
      });
      if (o.shipping?.checked) {
        rows.push({ order: o.name, date: formatDate(o.date), customer: o.customer, item: 'Shipping', amount: o.shipping.price });
      }
    });
    return rows;
  }

  async function exportExcel() {
    setExportingXlsx(true);
    try {
      const rows = exportRows();
      await exportRowsToXlsx({
        sheetName: 'Pending Receivables',
        filename: `OBJEXYZ_Receivables_${exportDateStamp()}.xlsx`,
        columns: [
          { header: 'Order', key: 'order', width: 12 },
          { header: 'Date', key: 'date', width: 14 },
          { header: 'Customer', key: 'customer', width: 24 },
          { header: 'Item', key: 'item', width: 34 },
          { header: 'Amount (PKR)', key: 'amount', width: 16, numFmt: '#,##0' },
        ],
        rows,
        totalRow: { order: 'TOTAL', amount: rows.reduce((s, r) => s + r.amount, 0) },
      });
    } finally {
      setExportingXlsx(false);
    }
  }

  async function exportPdf() {
    setExportingPdf(true);
    try {
      const [{ pdf }, { default: ReceivablesDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/ReceivablesDocument'),
      ]);
      const rows = exportRows();
      const blob = await pdf(<ReceivablesDocument rows={rows} total={rows.reduce((s, r) => s + r.amount, 0)} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OBJEXYZ_Receivables_${exportDateStamp()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingPdf(false);
    }
  }

  function resetAll() {
    orders.forEach(o => resetOrder(o));
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 4rem)' }}>
      <PageHeading
        title="PENDING RECEIVABLES"
        subtitle="UNPAID · PARTIAL · UNFULFILLED · DISPUTED — SINCE 2026-05-09"
      >
        <button
          onClick={sync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-2 rounded text-xs tracking-widest uppercase"
          style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
        >
          <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'SYNCING...' : 'SYNC FROM SHOPIFY'}
        </button>
      </PageHeading>

      {loading && <Loading label="LOADING RECEIVABLES..." />}
      {error && (
        <ErrorNote message={error} />
      )}
      {!loading && localWarning && <LocalDataWarning />}

      {!loading && !error && (
        <>
          <div className="flex-1 space-y-3 mb-4">
            {orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onToggle={key => toggleItem(order, key)}
                onRemove={key => removeItem(order, key)}
                onAdd={(title, price) => addItem(order, title, price)}
                onDisputedChange={v => setDisputed(order, v)}
                onNoteChange={v => setDisputeNote(order, v)}
                onAmountChange={v => setAmountReceived(order, v)}
                onReset={() => resetOrder(order)}
              />
            ))}
            {orders.length === 0 && (
              <div className="text-xs text-center py-10 rounded-lg" style={{ color: 'var(--muted-2)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                Nothing pending — every order is paid and fulfilled.
              </div>
            )}
          </div>

          {/* Sticky summary bar */}
          <div className="sticky bottom-0 rounded-lg px-4 py-3 flex items-center justify-between flex-wrap gap-3"
               style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div>
              <div className="text-xs tracking-widest" style={{ color: 'var(--muted-2)' }}>TOTAL RECEIVABLE</div>
              <div className="text-xl font-bold font-mono" style={{ color: 'var(--text)' }}>{formatPKR(grandTotal)}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={resetAll} className="flex items-center gap-1.5 px-3 py-2 rounded text-xs tracking-widest uppercase" style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
                <RotateCcw size={12} /> RESET ALL
              </button>
              <button onClick={exportExcel} disabled={exportingXlsx} className="flex items-center gap-1.5 px-3 py-2 rounded text-xs tracking-widest uppercase" style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                <Download size={12} /> {exportingXlsx ? 'EXPORTING...' : 'EXPORT XLSX'}
              </button>
              <button onClick={exportPdf} disabled={exportingPdf} className="flex items-center gap-1.5 px-3 py-2 rounded text-xs tracking-widest uppercase" style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                <FileText size={12} /> {exportingPdf ? 'EXPORTING...' : 'EXPORT PDF'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
