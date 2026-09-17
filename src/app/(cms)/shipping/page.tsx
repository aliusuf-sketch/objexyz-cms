'use client';
import { useMemo, useState } from 'react';
import { formatPKR, formatDate } from '@/lib/utils';
import { useShipping } from '@/hooks/useShipping';
import {
  Shipment, ShipmentLine, ShippableOrder, ShipmentLineOutcome, ResolvedShipmentOrder,
  resolveShipment, shipmentProgress, isAddressIncomplete,
} from '@/lib/shipments';
import {
  Card, PageHeading, Loading, ErrorNote, Badge, FinancialBadge, FulfillmentBadge, inputStyle,
} from '@/components/ui';
import {
  Plus, FileText, Tag, Trash2, X, AlertTriangle, PackageCheck, ChevronDown, ChevronRight,
} from 'lucide-react';

type SelectionMap = Record<string, Set<string>>; // orderId -> selected line item keys

async function renderPdf(
  make: () => Promise<{ blob: Blob; filename: string }>,
) {
  const { blob, filename } = await make();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Builder ───────────────────────────────────────────────────────────

function ShipmentBuilder({
  orders, onCancel, onCreate,
}: {
  orders: ShippableOrder[];
  onCancel: () => void;
  onCreate: (lines: ShipmentLine[], note: string) => Promise<void>;
}) {
  const [selection, setSelection] = useState<SelectionMap>({});
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  function toggleOrder(order: ShippableOrder) {
    setSelection(prev => {
      const next = { ...prev };
      if (next[order.id]) delete next[order.id];
      // Selecting an order defaults to shipping everything on it — the
      // common case; unticking individual items is the exception.
      else next[order.id] = new Set(order.items.map(i => i.key));
      return next;
    });
  }

  function toggleItem(order: ShippableOrder, key: string) {
    setSelection(prev => {
      const next = { ...prev };
      const set = new Set(next[order.id] || []);
      if (set.has(key)) set.delete(key); else set.add(key);
      if (set.size === 0) delete next[order.id];
      else next[order.id] = set;
      return next;
    });
  }

  const lines: ShipmentLine[] = useMemo(
    () => Object.entries(selection).map(([orderId, keys]) => ({ orderId, lineItemKeys: Array.from(keys) })),
    [selection]
  );
  const unitCount = useMemo(() => {
    let n = 0;
    orders.forEach(o => {
      const set = selection[o.id];
      if (!set) return;
      o.items.forEach(i => { if (set.has(i.key)) n += i.quantity; });
    });
    return n;
  }, [orders, selection]);

  const visible = orders.filter(o =>
    o.shippable &&
    (!search ||
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.customer.toLowerCase().includes(search.toLowerCase()))
  );

  async function save() {
    if (lines.length === 0) return;
    setSaving(true);
    try {
      await onCreate(lines, note.trim());
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-6">
      <div className="px-4 py-3 border-b flex items-center justify-between flex-wrap gap-3"
           style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--text)' }}>
          NEW SHIPPING ORDER
        </span>
        <div className="flex items-center gap-2">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filter by order # or customer..."
            className="px-2 py-1.5 rounded text-xs outline-none w-56" style={inputStyle}
          />
          <button onClick={onCancel} className="flex items-center gap-1 px-2 py-1.5 rounded text-xs tracking-widest uppercase"
                  style={{ color: 'var(--muted-2)' }}>
            <X size={12} /> CANCEL
          </button>
        </div>
      </div>

      <div className="p-4 space-y-2" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
        {visible.map(order => {
          const set = selection[order.id];
          const selected = Boolean(set);
          const incomplete = isAddressIncomplete(order.address);
          return (
            <div key={order.id} className="rounded"
                 style={{ border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`, background: 'var(--bg)' }}>
              <label className="flex items-center gap-3 px-3 py-2 cursor-pointer flex-wrap">
                <input type="checkbox" checked={selected} onChange={() => toggleOrder(order)} />
                <span className="font-mono text-xs font-bold" style={{ color: 'var(--accent)' }}>{order.name}</span>
                <span className="text-xs" style={{ color: 'var(--text)' }}>{order.customer}</span>
                <span className="text-xs" style={{ color: 'var(--muted-2)' }}>{formatDate(order.date)}</span>
                <FinancialBadge status={order.financialStatus} />
                <FulfillmentBadge status={order.fulfillmentStatus} />
                {incomplete && <Badge text="NO ADDRESS" tone="danger" />}
                {order.outstanding > 0 && (
                  <span className="text-xs font-mono ml-auto" style={{ color: 'var(--warn)' }}>
                    collect {formatPKR(order.outstanding)}
                  </span>
                )}
              </label>

              {selected && (
                <div className="px-3 pb-2 pl-10 space-y-1">
                  {order.items.map(item => (
                    <label key={item.key} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={set!.has(item.key)}
                        onChange={() => toggleItem(order, item.key)}
                      />
                      <span style={{ color: set!.has(item.key) ? 'var(--text)' : 'var(--muted-2)' }}>
                        {item.title}
                        {item.variant && <span className="font-mono" style={{ color: 'var(--muted-2)' }}> · {item.variant}</span>}
                        {item.quantity > 1 && <span style={{ color: 'var(--muted)' }}> ×{item.quantity}</span>}
                      </span>
                      <span className="ml-auto font-mono" style={{ color: 'var(--muted-2)' }}>{formatPKR(item.price)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {visible.length === 0 && (
          <div className="text-xs text-center py-8" style={{ color: 'var(--muted-2)' }}>
            Nothing left to ship — every order is fulfilled.
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t flex items-center justify-between flex-wrap gap-3" style={{ borderColor: 'var(--border)' }}>
        <input
          type="text" value={note} onChange={e => setNote(e.target.value)}
          placeholder="Optional note (courier, dispatch batch...)"
          className="px-2 py-1.5 rounded text-xs outline-none flex-1 min-w-[12rem]" style={inputStyle}
        />
        <span className="text-xs" style={{ color: 'var(--muted-2)' }}>
          {lines.length} order{lines.length !== 1 ? 's' : ''} · {unitCount} unit{unitCount !== 1 ? 's' : ''}
        </span>
        <button
          onClick={save}
          disabled={lines.length === 0 || saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-medium tracking-widest uppercase disabled:opacity-40"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          <PackageCheck size={12} /> {saving ? 'CREATING...' : 'CREATE SHIPPING ORDER'}
        </button>
      </div>
    </Card>
  );
}

// ── Per-order delivery / collection feedback ──────────────────────────

function OutcomeRow({
  resolved, onChange,
}: {
  resolved: ResolvedShipmentOrder;
  onChange: (patch: Partial<ShipmentLineOutcome>, immediate?: boolean) => void;
}) {
  const { order, unitCount, outcome } = resolved;
  const unitsDelivered = outcome.unitsDelivered ?? unitCount;
  const shortUnits = outcome.delivered && unitsDelivered < unitCount;
  const shortCash = outcome.collected && outcome.amountCollected < order.outstanding;

  return (
    <div className="px-4 py-2.5 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>{order.name}</span>
        <span className="text-xs" style={{ color: 'var(--text)' }}>
          {order.address?.name || order.customer}
        </span>
        <span className="text-xs" style={{ color: 'var(--muted-2)' }}>{unitCount}u shipped</span>

        {/* Delivered */}
        <label className="flex items-center gap-1.5 text-xs ml-auto" style={{ color: 'var(--muted)' }}>
          <input
            type="checkbox"
            checked={outcome.delivered}
            onChange={e => onChange({
              delivered: e.target.checked,
              // Default to "all of it arrived" — the common case.
              ...(e.target.checked && outcome.unitsDelivered === undefined
                ? { unitsDelivered: unitCount } : {}),
            })}
          />
          DELIVERED
        </label>
        {outcome.delivered && (
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted-2)' }}>
            <input
              type="number" min={0} max={unitCount}
              value={unitsDelivered}
              onChange={e => onChange({ unitsDelivered: Number(e.target.value) || 0 }, false)}
              className="w-14 px-2 py-1 rounded text-xs outline-none" style={inputStyle}
            />
            <span>of {unitCount} models</span>
          </div>
        )}

        {/* Collected */}
        <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
          <input
            type="checkbox"
            checked={outcome.collected}
            onChange={e => onChange({
              collected: e.target.checked,
              // Default to the full outstanding balance on first tick.
              ...(e.target.checked && !outcome.amountCollected
                ? { amountCollected: order.outstanding } : {}),
            })}
          />
          COLLECTED
        </label>
        {outcome.collected && (
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted-2)' }}>
            <input
              type="number" min={0}
              value={outcome.amountCollected || ''}
              onChange={e => onChange({ amountCollected: Number(e.target.value) || 0 }, false)}
              className="w-24 px-2 py-1 rounded text-xs outline-none" style={inputStyle}
            />
            <span>of {formatPKR(order.outstanding)}</span>
          </div>
        )}
      </div>

      {(shortUnits || shortCash) && (
        <div className="flex items-center gap-3 flex-wrap mt-1.5 pl-1">
          {shortUnits && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--warn)' }}>
              <AlertTriangle size={10} /> {unitCount - unitsDelivered} not delivered
            </span>
          )}
          {shortCash && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--warn)' }}>
              <AlertTriangle size={10} /> short by {formatPKR(order.outstanding - outcome.amountCollected)}
            </span>
          )}
        </div>
      )}

      {(outcome.delivered || outcome.collected) && (
        <input
          type="text"
          value={outcome.note || ''}
          onChange={e => onChange({ note: e.target.value }, false)}
          placeholder="Feedback / issue note (optional)"
          className="mt-1.5 px-2 py-1 rounded text-xs outline-none w-full"
          style={inputStyle}
        />
      )}
    </div>
  );
}

// ── Saved shipment row ────────────────────────────────────────────────

function ShipmentRow({
  shipment, orders, onDelete, onOutcome,
}: {
  shipment: Shipment;
  orders: ShippableOrder[];
  onDelete: () => void;
  onOutcome: (orderId: string, patch: Partial<ShipmentLineOutcome>, immediate?: boolean) => void;
}) {
  const [busy, setBusy] = useState('');
  const [open, setOpen] = useState(false);
  const resolved = useMemo(() => resolveShipment(shipment, orders), [shipment, orders]);
  const p = useMemo(() => shipmentProgress(resolved), [resolved]);
  const stale = resolved.length < shipment.lines.length;

  async function makeDoc(kind: 'manager' | 'courier' | 'labels') {
    setBusy(kind);
    try {
      const [{ pdf }, docMod, labelMod] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/ShipmentDocument'),
        import('@/components/BoxLabelDocument'),
      ]);
      const ShipmentDocument = docMod.default;
      const BoxLabelDocument = labelMod.default;

      await renderPdf(async () => {
        if (kind === 'labels') {
          const blob = await pdf(<BoxLabelDocument shipment={shipment} resolved={resolved} />).toBlob();
          return { blob, filename: `${shipment.reference}_Labels.pdf` };
        }
        const withAmounts = kind === 'manager';
        const blob = await pdf(
          <ShipmentDocument shipment={shipment} resolved={resolved} withAmounts={withAmounts} />
        ).toBlob();
        return {
          blob,
          filename: `${shipment.reference}_${withAmounts ? 'Manager' : 'Dispatch'}.pdf`,
        };
      });
    } finally {
      setBusy('');
    }
  }

  const btn = { border: '1px solid var(--accent)', color: 'var(--accent)' };

  return (
    <Card>
      <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setOpen(o => !o)} className="p-0.5" style={{ color: 'var(--muted-2)' }}>
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
          <span className="font-mono text-sm font-bold" style={{ color: 'var(--accent)' }}>{shipment.reference}</span>
          <span className="text-xs" style={{ color: 'var(--muted-2)' }}>{formatDate(shipment.createdAt)}</span>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            {p.orderCount} order{p.orderCount !== 1 ? 's' : ''} · {p.unitCount} unit{p.unitCount !== 1 ? 's' : ''}
          </span>

          {p.complete
            ? <Badge text="COMPLETE" tone="accent" />
            : p.started
              ? <Badge text={`${p.deliveredOrders}/${p.orderCount} DELIVERED`} tone="warn" />
              : <Badge text="DISPATCHED" tone="neutral" />}

          {p.toCollect > 0 && (
            <span className="text-xs font-mono" style={{ color: p.outstandingAfter > 0 ? 'var(--warn)' : 'var(--accent)' }}>
              collected {formatPKR(p.amountCollected)} / {formatPKR(p.toCollect)}
            </span>
          )}
          {stale && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--warn)' }}>
              <AlertTriangle size={11} /> some orders no longer resolvable
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => makeDoc('manager')} disabled={!!busy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs tracking-widest uppercase" style={btn}>
            <FileText size={11} /> {busy === 'manager' ? '...' : 'MANAGER PDF'}
          </button>
          <button onClick={() => makeDoc('courier')} disabled={!!busy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs tracking-widest uppercase" style={btn}>
            <FileText size={11} /> {busy === 'courier' ? '...' : 'DISPATCH PDF'}
          </button>
          <button onClick={() => makeDoc('labels')} disabled={!!busy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs tracking-widest uppercase" style={btn}>
            <Tag size={11} /> {busy === 'labels' ? '...' : 'BOX LABELS'}
          </button>
          <button onClick={onDelete} title="Delete shipping order"
                  className="p-1.5 rounded" style={{ color: 'var(--muted-2)' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {shipment.note && (
        <div className="px-4 pb-3 text-xs" style={{ color: 'var(--muted-2)' }}>{shipment.note}</div>
      )}

      {open ? (
        <>
          {resolved.map(r => (
            <OutcomeRow
              key={r.order.id}
              resolved={r}
              onChange={(patch, immediate) => onOutcome(r.order.id, patch, immediate)}
            />
          ))}
          <div className="px-4 py-2.5 border-t flex items-center gap-4 flex-wrap text-xs"
               style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--muted-2)' }}>
            <span>{p.unitsDelivered} of {p.unitCount} models delivered</span>
            <span>{p.collectedOrders} of {p.orderCount} orders collected</span>
            <span className="font-mono" style={{ color: 'var(--text)' }}>
              {formatPKR(p.amountCollected)} collected
            </span>
            {p.outstandingAfter > 0 && (
              <span className="font-mono" style={{ color: 'var(--warn)' }}>
                {formatPKR(p.outstandingAfter)} still outstanding
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="px-4 pb-3 flex flex-wrap gap-x-4 gap-y-1">
          {resolved.map(({ order, unitCount, outcome }) => (
            <span key={order.id} className="text-xs" style={{ color: 'var(--muted-2)' }}>
              <span className="font-mono" style={{ color: 'var(--muted)' }}>{order.name}</span>
              {' '}{order.address?.name || order.customer} · {unitCount}u
              {outcome.delivered && <span style={{ color: 'var(--accent)' }}> ✓</span>}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function ShippingPage() {
  const { orders, shipments, loading, error, createShipment, removeShipment, setOutcome } = useShipping();
  const [building, setBuilding] = useState(false);

  return (
    <div>
      <PageHeading
        title="SHIPPING ORDERS"
        subtitle="BUILD A DISPATCH — MANAGER COPY, COURIER COPY, BOX LABELS"
      >
        {!building && (
          <button
            onClick={() => setBuilding(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-medium tracking-widest uppercase"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <Plus size={12} /> NEW SHIPPING ORDER
          </button>
        )}
      </PageHeading>

      {loading && <Loading label="LOADING SHIPPING DATA..." />}
      {error && <ErrorNote message={error} />}

      {!loading && !error && (
        <>
          {building && (
            <ShipmentBuilder
              orders={orders}
              onCancel={() => setBuilding(false)}
              onCreate={async (lines, note) => {
                await createShipment(lines, note);
                setBuilding(false);
              }}
            />
          )}

          <div className="space-y-3">
            {shipments.map(s => (
              <ShipmentRow
                key={s.id}
                shipment={s}
                orders={orders}
                onDelete={() => removeShipment(s.id)}
                onOutcome={(orderId, patch, immediate) => setOutcome(s.id, orderId, patch, immediate)}
              />
            ))}
            {shipments.length === 0 && !building && (
              <div className="text-xs text-center py-10 rounded-lg"
                   style={{ color: 'var(--muted-2)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                No shipping orders yet — create one to generate dispatch documents.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
