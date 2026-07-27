'use client';
import { useMemo, useState } from 'react';
import { formatDate, shipByDate, daysUntil } from '@/lib/utils';
import { useQueue, STAGES, STAGE_LABELS, QueueItem, Stage } from '@/hooks/useQueue';
import LocalDataWarning from '@/components/LocalDataWarning';
import { ChevronLeft, ChevronRight, Package, Sheet } from 'lucide-react';

function ShipBy({ item }: { item: QueueItem }) {
  const target = shipByDate(item.createdAt, item.eta);
  if (!target) return <span style={{ color: 'var(--muted-2)' }}>no ETA</span>;
  if (item.stage === 'SHIPPED') return <span style={{ color: 'var(--muted-2)' }}>{formatDate(target.toISOString())}</span>;
  const d = daysUntil(target);
  const overdue = d < 0;
  const soon = d >= 0 && d <= 3;
  return (
    <span style={{ color: overdue ? 'var(--danger)' : soon ? 'var(--warn)' : 'var(--muted)' }}>
      {formatDate(target.toISOString())}
      {overdue ? ` · ${Math.abs(d)}d late` : soon ? ` · ${d}d left` : ''}
    </span>
  );
}

function Card({ item, onMove }: { item: QueueItem; onMove: (i: QueueItem, s: Stage) => void }) {
  const idx = STAGES.indexOf(item.stage);
  return (
    <div className="rounded-lg p-3 mb-2" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
      <div className="flex gap-3">
        <div className="shrink-0 rounded overflow-hidden flex items-center justify-center"
             style={{ width: 44, height: 44, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          {item.imageUrl
            ? <img src={item.imageUrl} alt={item.productTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <Package size={16} style={{ color: 'var(--muted-2)' }} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{item.productTitle}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            {item.variantTitle && <span className="font-mono">{item.variantTitle}</span>} × {item.quantity}
          </div>
        </div>
      </div>
      <div className="mt-2 space-y-0.5 text-xs" style={{ color: 'var(--muted-2)' }}>
        <div className="flex justify-between items-center">
          <span className="font-mono" style={{ color: 'var(--accent)' }}>{item.orderName}</span>
          <span className="px-1.5 py-0.5 rounded" style={{
            background: item.financialStatus === 'PAID' ? 'var(--accent-bg)' : 'var(--warn-bg)',
            color: item.financialStatus === 'PAID' ? 'var(--accent)' : 'var(--warn)',
          }}>
            {item.financialStatus || 'UNPAID'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>customer</span>
          <span>{item.customer}</span>
        </div>
        <div className="flex justify-between">
          <span>placed {formatDate(item.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>ship by</span>
          <ShipBy item={item} />
        </div>
      </div>
      <div className="mt-2 flex justify-between items-center">
        <button
          onClick={() => idx > 0 && onMove(item, STAGES[idx - 1])}
          disabled={idx === 0}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs uppercase tracking-widest disabled:opacity-30"
          style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          <ChevronLeft size={11} /> Back
        </button>
        <button
          onClick={() => idx < STAGES.length - 1 && onMove(item, STAGES[idx + 1])}
          disabled={idx === STAGES.length - 1}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs uppercase tracking-widest disabled:opacity-30"
          style={{ color: 'var(--accent)', border: '1px solid var(--accent)' }}
        >
          Next <ChevronRight size={11} />
        </button>
      </div>
    </div>
  );
}

export default function QueuePage() {
  const { items, loading, error, localWarning, setStage } = useQueue();
  const [exportingXlsx, setExportingXlsx] = useState(false);

  const byStage = useMemo(() => {
    const map: Record<Stage, QueueItem[]> = { PRINT: [], PAINT: [], DECALS: [], READY: [], SHIPPED: [] };
    items.forEach(i => map[i.stage].push(i));
    // Within a column, sort by ship-by urgency (soonest first).
    STAGES.forEach(s => map[s].sort((a, b) => {
      const ta = shipByDate(a.createdAt, a.eta)?.getTime() ?? Infinity;
      const tb = shipByDate(b.createdAt, b.eta)?.getTime() ?? Infinity;
      return ta - tb;
    }));
    return map;
  }, [items]);

  async function exportExcel() {
    setExportingXlsx(true);
    try {
      const { Workbook } = await import('exceljs');
      const wb = new Workbook();
      const ws = wb.addWorksheet('Shipping Queue');
      ws.columns = STAGES.map(stage => ({ header: STAGE_LABELS[stage], key: stage, width: 38 }));
      ws.getRow(1).font = { bold: true };

      const countRow: Record<Stage, string> = {} as Record<Stage, string>;
      STAGES.forEach(stage => {
        countRow[stage] = `${byStage[stage].length} item${byStage[stage].length !== 1 ? 's' : ''}`;
      });
      const countExcelRow = ws.addRow(countRow);
      countExcelRow.font = { bold: true, italic: true };

      const cellText = (item: QueueItem) =>
        `${item.orderName} · ${item.productTitle}${item.variantTitle ? ` — ${item.variantTitle}` : ''} ×${item.quantity} · ${item.customer}`;

      const maxRows = Math.max(0, ...STAGES.map(s => byStage[s].length));
      for (let i = 0; i < maxRows; i++) {
        const row: Record<Stage, string> = {} as Record<Stage, string>;
        STAGES.forEach(stage => {
          row[stage] = byStage[stage][i] ? cellText(byStage[stage][i]) : '';
        });
        ws.addRow(row);
      }
      ws.eachRow(row => { row.alignment = { wrapText: true, vertical: 'top' }; });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `objexyz-shipping-queue-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingXlsx(false);
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-widest uppercase txt-heading">SHIPPING QUEUE</h1>
          <p className="text-xs mt-1 tracking-widest" style={{ color: 'var(--muted-2)' }}>PRODUCTION BOARD — PRINT → PAINT → READY → SHIPPED</p>
        </div>
        <button
          onClick={exportExcel}
          disabled={exportingXlsx || loading || items.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded text-xs tracking-widest uppercase"
          style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}
        >
          <Sheet size={12} /> {exportingXlsx ? 'EXPORTING...' : 'EXPORT XLSX'}
        </button>
      </div>

      {loading && <div className="text-xs tracking-widest" style={{ color: 'var(--muted-2)' }}>LOADING QUEUE...</div>}
      {error && (
        <div className="rounded p-4 text-xs" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}
      {!loading && localWarning && <LocalDataWarning />}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {STAGES.map(stage => (
            <div key={stage} className="rounded-lg overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="px-4 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                <span className="text-base font-bold tracking-widest uppercase" style={{ color: 'var(--text)' }}>{STAGE_LABELS[stage]}</span>
                <span className="text-base font-mono font-bold px-2.5 py-0.5 rounded-full min-w-[2rem] text-center" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                  {byStage[stage].length}
                </span>
              </div>
              <div className="p-3" style={{ minHeight: 120 }}>
                {byStage[stage].map(item => (
                  <Card key={item.key} item={item} onMove={setStage} />
                ))}
                {byStage[stage].length === 0 && (
                  <div className="text-xs text-center py-6" style={{ color: 'var(--muted-2)' }}>—</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
