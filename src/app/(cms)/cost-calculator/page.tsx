'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatPKR } from '@/lib/utils';
import { calcCost, calcUnitCost, deriveRates, CostRates, DEFAULT_COST_RATES, UsageInput, EMPTY_USAGE } from '@/lib/costCalc';
import { useQueue } from '@/hooks/useQueue';
import { Save, Settings2, Download, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

// ── Shopify data shapes ────────────────────────────────────────────────
interface LocalData {
  resinMl?: number; printerRuntimeHrs?: number; sandingHrs?: number;
  paintingHrs?: number; finishingHrs?: number; packagingHrs?: number;
}
interface Variant { id: string; title: string; price: string; local?: LocalData }
interface Product { id: string; title: string; productType: string; variants: { edges: { node: Variant }[] } }

interface CatalogRow {
  key: string;
  productId: string;
  productTitle: string;
  productType: string;
  variantId: string;
  variantTitle: string;
  sizeLabel: 'SMALL' | 'LARGE' | 'SINGLE';
  price: number;
  usage: UsageInput;
  saving: boolean;
  saved: boolean;
}

const inputStyle = { background: 'var(--bg)', border: '1px solid var(--input-border)', color: 'var(--text)' };

function numInput(value: number, onChange: (v: number) => void, width = 64) {
  return (
    <input
      type="number"
      min={0}
      step="any"
      value={value || ''}
      onChange={e => onChange(Number(e.target.value) || 0)}
      className="px-2 py-1 rounded text-xs outline-none"
      style={{ ...inputStyle, width }}
      placeholder="0"
    />
  );
}

// ── Rate field metadata for the settings form ───────────────────────────
const RATE_SECTIONS: { title: string; fields: { key: keyof CostRates; label: string; unit: string }[] }[] = [
  {
    title: 'Materials', fields: [
      { key: 'resinPerMl', label: 'Resin', unit: 'PKR/ml' },
      { key: 'cleanPerUnit', label: 'Cleaning', unit: 'PKR/unit' },
      { key: 'sandPerUnit', label: 'Sanding material', unit: 'PKR/unit' },
      { key: 'paintMaterialPerUnit', label: 'Paint material', unit: 'PKR/unit' },
      { key: 'finishMaterialPerUnit', label: 'Finish material', unit: 'PKR/unit' },
      { key: 'packPerUnit', label: 'Packaging material', unit: 'PKR/unit' },
    ],
  },
  {
    title: 'Labor', fields: [
      { key: 'laborSanding', label: 'Sanding', unit: 'PKR/hr' },
      { key: 'laborPainting', label: 'Painting', unit: 'PKR/hr' },
      { key: 'laborFinishing', label: 'Finishing', unit: 'PKR/hr' },
      { key: 'laborPacking', label: 'Packing', unit: 'PKR/hr' },
    ],
  },
  {
    title: 'Equipment', fields: [
      { key: 'printerCost', label: 'Printer cost', unit: 'PKR' },
      { key: 'printerLifespanValue', label: 'Printer lifespan', unit: '' },
      { key: 'avgPrinterHoursPerDay', label: 'Avg hours/day', unit: 'hrs/day' },
      { key: 'maintenancePerHr', label: 'Maintenance', unit: 'PKR/hr' },
      { key: 'electricityTariff', label: 'Electricity tariff', unit: 'PKR/kWh' },
      { key: 'printerWatts', label: 'Printer wattage', unit: 'W' },
      { key: 'curingWatts', label: 'Curing wattage', unit: 'W' },
    ],
  },
  {
    title: 'Fulfillment', fields: [
      { key: 'courierCost', label: 'Courier cost', unit: 'PKR/order' },
      { key: 'failureRatePct', label: 'Failure rate', unit: '%' },
    ],
  },
];

export default function CostCalculatorPage() {
  const [tab, setTab] = useState<'catalog' | 'single' | 'monthly'>('catalog');
  const [rates, setRates] = useState<CostRates>(DEFAULT_COST_RATES);
  const [savedRates, setSavedRates] = useState<CostRates>(DEFAULT_COST_RATES);
  const [ratesOpen, setRatesOpen] = useState(false);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesSaving, setRatesSaving] = useState(false);

  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Load rates ──────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/local/rates')
      .then(r => r.json())
      .then(d => {
        if (d.rates) { setRates(d.rates); setSavedRates(d.rates); }
      })
      .finally(() => setRatesLoading(false));
  }, []);

  async function saveRates() {
    setRatesSaving(true);
    try {
      const res = await fetch('/api/local/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rates),
      });
      const d = await res.json();
      if (d.rates) { setRates(d.rates); setSavedRates(d.rates); }
      setRatesOpen(false);
    } finally {
      setRatesSaving(false);
    }
  }

  function updateRate(key: keyof CostRates, value: number | string) {
    setRates(prev => ({ ...prev, [key]: value }));
  }

  const ratesDirty = JSON.stringify(rates) !== JSON.stringify(savedRates);
  const derived = useMemo(() => deriveRates(rates), [rates]);

  // ── Load catalog ────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/shopify/products')
      .then(r => r.json())
      .then(data => {
        const edges = data?.data?.products?.edges || [];
        const products: Product[] = edges.map((e: { node: Product }) => e.node);
        const flat: CatalogRow[] = [];
        products.forEach(p => {
          const realVariants = (p.variants?.edges || [])
            .map(e => e.node)
            .filter(v => !v.title.toLowerCase().includes('custom'));
          const sorted = [...realVariants].sort((a, b) => Number(a.price) - Number(b.price));

          sorted.forEach((v, i) => {
            const sizeLabel: CatalogRow['sizeLabel'] = sorted.length === 1 ? 'SINGLE' : i === 0 ? 'SMALL' : 'LARGE';
            flat.push({
              key: v.id,
              productId: p.id,
              productTitle: p.title,
              productType: p.productType || 'Uncategorized',
              variantId: v.id,
              variantTitle: v.title,
              sizeLabel,
              price: Number(v.price),
              usage: {
                resinMl: v.local?.resinMl || 0,
                printerRuntimeHrs: v.local?.printerRuntimeHrs || 0,
                sandingHrs: v.local?.sandingHrs || 0,
                paintingHrs: v.local?.paintingHrs || 0,
                finishingHrs: v.local?.finishingHrs || 0,
                packagingHrs: v.local?.packagingHrs || 0,
              },
              saving: false,
              saved: false,
            });
          });
        });
        setRows(flat);
      })
      .finally(() => setLoading(false));
  }, []);

  function updateUsage(variantId: string, field: keyof UsageInput, value: number) {
    setRows(prev => prev.map(r => r.variantId !== variantId ? r : { ...r, usage: { ...r.usage, [field]: value }, saved: false }));

    if (saveTimers.current[variantId]) clearTimeout(saveTimers.current[variantId]);
    saveTimers.current[variantId] = setTimeout(() => saveRow(variantId), 500);
  }

  async function saveRow(variantId: string) {
    setRows(prev => prev.map(r => r.variantId !== variantId ? r : { ...r, saving: true }));
    const row = rows.find(r => r.variantId === variantId);
    if (!row) return;
    // Read latest usage from state at call time (closures in setTimeout may be stale otherwise).
    setRows(prev => {
      const current = prev.find(r => r.variantId === variantId);
      if (current) {
        fetch('/api/local/variant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variantId, ...current.usage }),
        }).then(() => {
          setRows(p => p.map(r => r.variantId !== variantId ? r : { ...r, saving: false, saved: true }));
          setTimeout(() => setRows(p => p.map(r => r.variantId !== variantId ? r : { ...r, saved: false })), 1500);
        }).catch(() => {
          setRows(p => p.map(r => r.variantId !== variantId ? r : { ...r, saving: false }));
        });
      }
      return prev;
    });
  }

  // ── Grouped rows + computed costs ──────────────────────────────
  const grouped = useMemo(() => {
    const map: Record<string, CatalogRow[]> = {};
    rows.forEach(r => {
      if (!map[r.productType]) map[r.productType] = [];
      map[r.productType].push(r);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const summary = useMemo(() => {
    let totalCost = 0, totalRevenue = 0, totalProfit = 0, marginSum = 0, marginCount = 0;
    rows.forEach(r => {
      const c = calcCost(r.usage, rates, r.price);
      totalCost += c.totalCost;
      totalRevenue += r.price;
      totalProfit += c.profit;
      if (r.price > 0) { marginSum += c.marginPct; marginCount++; }
    });
    return { totalCost, totalRevenue, totalProfit, avgMargin: marginCount > 0 ? marginSum / marginCount : 0 };
  }, [rows, rates]);

  function exportCSV() {
    const header = ['Category', 'Product', 'Size', 'Price', 'Resin(ml)', 'Printer(hrs)', 'Sanding(hrs)', 'Painting(hrs)', 'Finishing(hrs)', 'Packaging(hrs)', 'Cost', 'Profit', 'Margin%'];
    const lines = [header.join(',')];
    rows.forEach(r => {
      const c = calcCost(r.usage, rates, r.price);
      lines.push([
        r.productType, `"${r.productTitle}"`, r.variantTitle, r.price.toFixed(0),
        r.usage.resinMl, r.usage.printerRuntimeHrs, r.usage.sandingHrs, r.usage.paintingHrs, r.usage.finishingHrs, r.usage.packagingHrs,
        c.totalCost.toFixed(0), c.profit.toFixed(0), c.marginPct.toFixed(1),
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'objexyz-cost-calculator.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const marginColor = (pct: number) => pct < 0 ? 'var(--danger)' : pct < 20 ? 'var(--warn)' : 'var(--accent)';

  return (
    <div>
      <div className="mb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-widest uppercase txt-heading">COST CALCULATOR</h1>
          <p className="text-xs mt-1 tracking-widest" style={{ color: 'var(--muted-2)' }}>REAL COST, PROFIT &amp; MARGIN PER PRODUCT</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('catalog')}
            className="px-3 py-1.5 rounded text-xs tracking-widest uppercase"
            style={{ background: tab === 'catalog' ? 'var(--accent-bg)' : 'transparent', border: '1px solid var(--border)', color: tab === 'catalog' ? 'var(--accent)' : 'var(--muted)' }}
          >CATALOG</button>
          <button
            onClick={() => setTab('single')}
            className="px-3 py-1.5 rounded text-xs tracking-widest uppercase"
            style={{ background: tab === 'single' ? 'var(--accent-bg)' : 'transparent', border: '1px solid var(--border)', color: tab === 'single' ? 'var(--accent)' : 'var(--muted)' }}
          >SINGLE ITEM</button>
          <button
            onClick={() => setTab('monthly')}
            className="px-3 py-1.5 rounded text-xs tracking-widest uppercase"
            style={{ background: tab === 'monthly' ? 'var(--accent-bg)' : 'transparent', border: '1px solid var(--border)', color: tab === 'monthly' ? 'var(--accent)' : 'var(--muted)' }}
          >MONTHLY P&amp;L</button>
        </div>
      </div>

      {/* Rate settings panel */}
      <div className="rounded-lg mb-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <button
          onClick={() => setRatesOpen(o => !o)}
          className="w-full px-4 py-3 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <Settings2 size={14} style={{ color: 'var(--muted)' }} />
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>COST RATES</span>
            {ratesDirty && <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--warn-bg)', color: 'var(--warn)' }}>UNSAVED</span>}
          </div>
          {ratesOpen ? <ChevronUp size={14} style={{ color: 'var(--muted-2)' }} /> : <ChevronDown size={14} style={{ color: 'var(--muted-2)' }} />}
        </button>

        {!ratesOpen && !ratesLoading && (
          <div className="px-4 pb-4 flex flex-wrap gap-2">
            {[
              { l: 'Resin', v: `PKR ${rates.resinPerMl}/ml` },
              { l: 'Printer/hr', v: formatPKR(derived.printerPerHr) },
              { l: 'Elec/hr', v: formatPKR(derived.elecPerHr) },
              { l: 'Courier', v: formatPKR(rates.courierCost) },
              { l: 'Failure rate', v: `${rates.failureRatePct}%` },
            ].map(chip => (
              <span key={chip.l} className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--neutral-bg)', color: 'var(--muted)' }}>
                {chip.l}: <b style={{ color: 'var(--text)' }}>{chip.v}</b>
              </span>
            ))}
          </div>
        )}

        {ratesOpen && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
              {RATE_SECTIONS.map(section => (
                <div key={section.title} className="rounded-lg p-3" style={{ background: 'var(--bg)', border: '1px solid var(--border-subtle)' }}>
                  <div className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: 'var(--muted-2)' }}>{section.title}</div>
                  <div className="space-y-2">
                    {section.fields.map(f => (
                      <div key={f.key} className="flex items-center justify-between gap-2">
                        <label className="text-xs" style={{ color: 'var(--muted)' }}>{f.label}</label>
                        <div className="flex items-center gap-1">
                          {numInput(rates[f.key] as number, v => updateRate(f.key, v), 72)}
                          <span className="text-xs" style={{ color: 'var(--faint)' }}>{f.unit}</span>
                        </div>
                      </div>
                    ))}
                    {section.title === 'Equipment' && (
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs" style={{ color: 'var(--muted)' }}>Lifespan unit</label>
                        <select
                          value={rates.printerLifespanUnit}
                          onChange={e => updateRate('printerLifespanUnit', e.target.value)}
                          className="px-2 py-1 rounded text-xs outline-none"
                          style={inputStyle}
                        >
                          <option value="years">Years</option>
                          <option value="days">Days</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={saveRates}
                disabled={ratesSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-medium tracking-widest uppercase"
                style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                <Save size={12} /> {ratesSaving ? 'SAVING...' : 'SAVE RATES'}
              </button>
              <span className="text-xs" style={{ color: 'var(--muted-2)' }}>
                Derived: printer {formatPKR(derived.printerPerHr)}/hr · electricity {formatPKR(derived.elecPerHr)}/hr · lifespan {derived.lifespanHours.toFixed(0)} hrs
              </span>
            </div>
          </div>
        )}
      </div>

      {tab === 'catalog' ? (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs tracking-widest mb-1" style={{ color: 'var(--muted-2)' }}>TOTAL COST</div>
              <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{formatPKR(summary.totalCost)}</div>
            </div>
            <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs tracking-widest mb-1" style={{ color: 'var(--muted-2)' }}>TOTAL REVENUE</div>
              <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{formatPKR(summary.totalRevenue)}</div>
            </div>
            <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs tracking-widest mb-1" style={{ color: 'var(--muted-2)' }}>TOTAL PROFIT</div>
              <div className="text-lg font-bold" style={{ color: marginColor(summary.totalProfit >= 0 ? 100 : -1) }}>{formatPKR(summary.totalProfit)}</div>
            </div>
            <div className="rounded-lg p-4 flex items-center justify-between" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div>
                <div className="text-xs tracking-widest mb-1" style={{ color: 'var(--muted-2)' }}>AVG MARGIN</div>
                <div className="text-lg font-bold" style={{ color: marginColor(summary.avgMargin) }}>{summary.avgMargin.toFixed(1)}%</div>
              </div>
              <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs tracking-widest uppercase"
                style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
                <Download size={12} /> CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-xs tracking-widest" style={{ color: 'var(--muted-2)' }}>LOADING CATALOG...</div>
          ) : (
            <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['PRODUCT', 'SIZE', 'PRICE', 'RESIN(ML)', 'PRINTER(HRS)', 'SANDING(HRS)', 'PAINTING(HRS)', 'FINISHING(HRS)', 'PACKAGING(HRS)', 'COST', 'PROFIT', 'MARGIN', ''].map(h => (
                        <th key={h} className="text-left px-3 py-2 tracking-widest whitespace-nowrap" style={{ color: 'var(--muted-2)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.map(([category, catRows]) => (
                      <>
                        <tr key={`h-${category}`} style={{ background: 'var(--surface-2)' }}>
                          <td colSpan={13} className="px-3 py-1.5 text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>{category}</td>
                        </tr>
                        {catRows.map(row => {
                          const c = calcCost(row.usage, rates, row.price);
                          return (
                            <tr key={row.key} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--text)' }}>{row.productTitle}</td>
                              <td className="px-3 py-2 font-mono" style={{ color: 'var(--accent)' }}>{row.variantTitle}</td>
                              <td className="px-3 py-2 font-mono" style={{ color: 'var(--muted)' }}>{formatPKR(row.price)}</td>
                              <td className="px-3 py-2">{numInput(row.usage.resinMl, v => updateUsage(row.variantId, 'resinMl', v))}</td>
                              <td className="px-3 py-2">{numInput(row.usage.printerRuntimeHrs, v => updateUsage(row.variantId, 'printerRuntimeHrs', v))}</td>
                              <td className="px-3 py-2">{numInput(row.usage.sandingHrs, v => updateUsage(row.variantId, 'sandingHrs', v))}</td>
                              <td className="px-3 py-2">{numInput(row.usage.paintingHrs, v => updateUsage(row.variantId, 'paintingHrs', v))}</td>
                              <td className="px-3 py-2">{numInput(row.usage.finishingHrs, v => updateUsage(row.variantId, 'finishingHrs', v))}</td>
                              <td className="px-3 py-2">{numInput(row.usage.packagingHrs, v => updateUsage(row.variantId, 'packagingHrs', v))}</td>
                              <td className="px-3 py-2 font-mono" style={{ color: 'var(--text)' }}>{formatPKR(c.totalCost)}</td>
                              <td className="px-3 py-2 font-mono" style={{ color: c.profit >= 0 ? 'var(--text)' : 'var(--danger)' }}>{formatPKR(c.profit)}</td>
                              <td className="px-3 py-2 font-mono font-bold" style={{ color: marginColor(c.marginPct) }}>{c.marginPct.toFixed(1)}%</td>
                              <td className="px-3 py-2">
                                {row.saving && <span className="text-xs" style={{ color: 'var(--muted-2)' }}>…</span>}
                                {row.saved && <span className="text-xs" style={{ color: 'var(--accent)' }}>✓</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    ))}
                    {rows.length === 0 && (
                      <tr><td colSpan={13} className="px-3 py-6 text-center" style={{ color: 'var(--muted-2)' }}>No products found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : tab === 'single' ? (
        <SingleItemCalculator rates={rates} />
      ) : (
        <MonthlyProfitPanel rates={rates} />
      )}
    </div>
  );
}

// ── Single / Custom item calculator ────────────────────────────────────
function SingleItemCalculator({ rates }: { rates: CostRates }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [usage, setUsage] = useState<UsageInput>(EMPTY_USAGE);

  const c = useMemo(() => calcCost(usage, rates, price), [usage, rates, price]);
  const marginColor = c.marginPct < 0 ? 'var(--danger)' : c.marginPct < 20 ? 'var(--warn)' : 'var(--accent)';

  function update(field: keyof UsageInput, value: number) {
    setUsage(prev => ({ ...prev, [field]: value }));
  }

  const fields: { key: keyof UsageInput; label: string }[] = [
    { key: 'resinMl', label: 'Resin (ml)' },
    { key: 'printerRuntimeHrs', label: 'Printer runtime (hrs)' },
    { key: 'sandingHrs', label: 'Sanding (hrs)' },
    { key: 'paintingHrs', label: 'Painting (hrs)' },
    { key: 'finishingHrs', label: 'Finishing (hrs)' },
    { key: 'packagingHrs', label: 'Packaging (hrs)' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
      <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: 'var(--muted)' }}>ITEM DETAILS</div>
        <div className="space-y-3">
          <div>
            <label className="text-xs tracking-widest uppercase block mb-1" style={{ color: 'var(--muted-2)' }}>PRODUCT / QUOTE NAME</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Custom 24in Al-Khalid"
              className="w-full px-3 py-2 rounded text-sm outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs tracking-widest uppercase block mb-1" style={{ color: 'var(--muted-2)' }}>SELLING PRICE (PKR)</label>
            <input type="number" min={0} value={price || ''} onChange={e => setPrice(Number(e.target.value) || 0)} placeholder="0"
              className="w-full px-3 py-2 rounded text-sm outline-none" style={inputStyle} />
          </div>
          {fields.map(f => (
            <div key={f.key} className="flex items-center justify-between gap-2">
              <label className="text-xs" style={{ color: 'var(--muted-2)' }}>{f.label}</label>
              {numInput(usage[f.key], v => update(f.key, v), 90)}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: 'var(--muted)' }}>
          {name || 'COST BREAKDOWN'}
        </div>
        <div className="space-y-2 text-xs">
          {[
            { l: 'Material cost', v: c.materialCost },
            { l: 'Labor cost', v: c.laborCost },
            { l: 'Equipment cost', v: c.equipmentCost },
            { l: 'Subtotal', v: c.subtotal },
            { l: `Failure buffer (${rates.failureRatePct}%)`, v: c.failureCost },
            { l: 'Courier', v: rates.courierCost },
          ].map(row => (
            <div key={row.l} className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--muted)' }}>{row.l}</span>
              <span className="font-mono" style={{ color: 'var(--text)' }}>{formatPKR(row.v)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 mt-1" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="font-bold" style={{ color: 'var(--text)' }}>TOTAL COST</span>
            <span className="font-mono font-bold" style={{ color: 'var(--text)' }}>{formatPKR(c.totalCost)}</span>
          </div>
          <div className="rounded-lg p-4 mt-3" style={{ background: 'var(--bg)', border: `1px solid ${marginColor}` }}>
            <div className="flex justify-between items-center">
              <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted-2)' }}>
                {c.profit >= 0 ? 'PROFIT' : 'LOSS'}
              </span>
              <span className="text-xl font-bold font-mono" style={{ color: marginColor }}>{formatPKR(c.profit)}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted-2)' }}>MARGIN</span>
              <span className="text-sm font-mono font-bold" style={{ color: marginColor }}>{c.marginPct.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Monthly P&L ──────────────────────────────────────────────────────
// Groups all orders by the month they were placed (createdAt), regardless
// of payment status. Courier is charged once per ORDER (not per unit) —
// material/labor/equipment scale with quantity per line item.
interface MonthRow {
  month: string; // "2026-07"
  label: string; // "Jul 2026"
  orders: number;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
  missingUsageUnits: number;
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function MonthlyProfitPanel({ rates }: { rates: CostRates }) {
  const { items, loading, error } = useQueue();

  const monthRows: MonthRow[] = useMemo(() => {
    interface Acc { orderIds: Set<string>; units: number; revenue: number; unitCostSum: number; missingUsageUnits: number }
    const byMonth = new Map<string, Acc>();

    items.forEach(it => {
      const key = monthKey(it.createdAt);
      if (!byMonth.has(key)) byMonth.set(key, { orderIds: new Set(), units: 0, revenue: 0, unitCostSum: 0, missingUsageUnits: 0 });
      const acc = byMonth.get(key)!;
      acc.orderIds.add(it.orderId);
      acc.units += it.quantity;
      acc.revenue += it.price * it.quantity;

      const u = it.usage;
      const hasUsage = u.resinMl > 0 || u.printerRuntimeHrs > 0 || u.sandingHrs > 0 || u.paintingHrs > 0 || u.finishingHrs > 0 || u.packagingHrs > 0;
      if (!hasUsage) acc.missingUsageUnits += it.quantity;

      const unit = calcUnitCost(u, rates);
      acc.unitCostSum += unit.costExclCourier * it.quantity;
    });

    return Array.from(byMonth.entries())
      .map(([key, acc]) => {
        const courierTotal = rates.courierCost * acc.orderIds.size;
        const cost = acc.unitCostSum + courierTotal;
        const profit = acc.revenue - cost;
        return {
          month: key,
          label: monthLabel(key),
          orders: acc.orderIds.size,
          units: acc.units,
          revenue: acc.revenue,
          cost,
          profit,
          marginPct: acc.revenue > 0 ? (profit / acc.revenue) * 100 : 0,
          missingUsageUnits: acc.missingUsageUnits,
        };
      })
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [items, rates]);

  const totals = useMemo(() => monthRows.reduce((acc, r) => ({
    orders: acc.orders + r.orders,
    units: acc.units + r.units,
    revenue: acc.revenue + r.revenue,
    cost: acc.cost + r.cost,
    profit: acc.profit + r.profit,
    missingUsageUnits: acc.missingUsageUnits + r.missingUsageUnits,
  }), { orders: 0, units: 0, revenue: 0, cost: 0, profit: 0, missingUsageUnits: 0 }), [monthRows]);

  const marginColor = (pct: number) => pct < 0 ? 'var(--danger)' : pct < 20 ? 'var(--warn)' : 'var(--accent)';
  const totalMissing = totals.missingUsageUnits;

  return (
    <div>
      {loading && <div className="text-xs tracking-widest" style={{ color: 'var(--muted-2)' }}>LOADING ORDER DATA...</div>}
      {error && (
        <div className="rounded p-4 text-xs" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)' }}>{error}</div>
      )}

      {!loading && !error && (
        <>
          {totalMissing > 0 && (
            <div className="mb-4 rounded-lg px-4 py-2.5 flex items-center gap-2 text-xs" style={{ background: 'var(--warn-bg)', border: '1px solid var(--border)', color: 'var(--warn)' }}>
              <AlertTriangle size={13} />
              <span><b>{totalMissing}</b> units sold have no usage data entered in Cost Calculator yet — their cost is understated (fixed material fees only, no resin/labor/equipment). Fill them in on the CATALOG tab for accurate figures.</span>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs tracking-widest mb-1" style={{ color: 'var(--muted-2)' }}>TOTAL ORDERS</div>
              <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{totals.orders}</div>
            </div>
            <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs tracking-widest mb-1" style={{ color: 'var(--muted-2)' }}>TOTAL REVENUE</div>
              <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{formatPKR(totals.revenue)}</div>
            </div>
            <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs tracking-widest mb-1" style={{ color: 'var(--muted-2)' }}>TOTAL COST</div>
              <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{formatPKR(totals.cost)}</div>
            </div>
            <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs tracking-widest mb-1" style={{ color: 'var(--muted-2)' }}>TOTAL PROFIT</div>
              <div className="text-lg font-bold" style={{ color: marginColor(totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0) }}>{formatPKR(totals.profit)}</div>
            </div>
            <div className="rounded-lg p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-xs tracking-widest mb-1" style={{ color: 'var(--muted-2)' }}>OVERALL MARGIN</div>
              <div className="text-lg font-bold" style={{ color: marginColor(totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0) }}>
                {totals.revenue > 0 ? ((totals.profit / totals.revenue) * 100).toFixed(1) : '0.0'}%
              </div>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['MONTH', 'ORDERS', 'UNITS SOLD', 'REVENUE', 'COST', 'PROFIT', 'MARGIN'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 tracking-widest" style={{ color: 'var(--muted-2)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthRows.map(row => (
                    <tr key={row.month} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text)' }}>
                        {row.label}
                        {row.missingUsageUnits > 0 && (
                          <span className="ml-2 text-xs" style={{ color: 'var(--warn)' }} title={`${row.missingUsageUnits} units missing usage data`}>⚠</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--muted)' }}>{row.orders}</td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--muted)' }}>{row.units}</td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--text)' }}>{formatPKR(row.revenue)}</td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--muted)' }}>{formatPKR(row.cost)}</td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: row.profit >= 0 ? 'var(--text)' : 'var(--danger)' }}>{formatPKR(row.profit)}</td>
                      <td className="px-4 py-2.5 font-mono font-bold" style={{ color: marginColor(row.marginPct) }}>{row.marginPct.toFixed(1)}%</td>
                    </tr>
                  ))}
                  {monthRows.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-6 text-center" style={{ color: 'var(--muted-2)' }}>No orders yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
