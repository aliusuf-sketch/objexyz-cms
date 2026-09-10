'use client';
import { useMemo, useState } from 'react';
import { formatPKR } from '@/lib/utils';
import { calcCost, CostRates, UsageInput, EMPTY_USAGE } from '@/lib/costCalc';
import { Card, inputStyle, marginColor as toneFor } from '@/components/ui';
import { numInput } from './numInput';

export default function SingleItemCalculator({ rates }: { rates: CostRates }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [usage, setUsage] = useState<UsageInput>(EMPTY_USAGE);

  const c = useMemo(() => calcCost(usage, rates, price), [usage, rates, price]);
  const marginColor = toneFor(c.marginPct);

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
      <Card className="p-5">
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
      </Card>

      <Card className="p-5">
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
      </Card>
    </div>
  );
}

