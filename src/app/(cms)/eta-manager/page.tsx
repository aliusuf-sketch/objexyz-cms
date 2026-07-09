'use client';
import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import SortableHeader from '@/components/SortableHeader';
import { useSortable } from '@/hooks/useSortable';

interface LocalData { eta?: string; etaNote?: string; materialGrams?: string; dimensions?: string }
interface Variant {
  id: string;
  title: string;
  price: string;
  local?: LocalData;
}
interface Product {
  id: string;
  title: string;
  status: string;
  variants: { edges: { node: Variant }[] };
}

interface ETARow {
  variantId: string;
  productTitle: string;
  productStatus: string;
  variantTitle: string;
  eta: string;
  etaNote: string;
  materialGrams: string;
  isFirstOfProduct: boolean;
  saving: boolean;
  saved: boolean;
}

export default function ETAManagerPage() {
  const [rows, setRows] = useState<ETARow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/shopify/products')
      .then(r => r.json())
      .then(data => {
        const edges = data?.data?.products?.edges || [];
        const products: Product[] = edges.map((e: { node: Product }) => e.node);
        const flat: ETARow[] = [];
        products.forEach(p => {
          const variants = p.variants?.edges || [];
          variants.forEach((ve, i) => {
            const v = ve.node;
            flat.push({
              variantId: v.id,
              productTitle: p.title,
              productStatus: p.status,
              variantTitle: v.title,
              eta: v.local?.eta || '',
              etaNote: v.local?.etaNote || '',
              materialGrams: v.local?.materialGrams || '',
              isFirstOfProduct: i === 0,
              saving: false,
              saved: false,
            });
          });
        });
        setRows(flat);
      })
      .finally(() => setLoading(false));
  }, []);

  function updateRow(variantId: string, field: 'eta' | 'etaNote' | 'materialGrams', value: string) {
    setRows(prev => prev.map(r => r.variantId === variantId ? { ...r, [field]: value, saved: false } : r));
  }

  async function saveRow(variantId: string) {
    const row = rows.find(r => r.variantId === variantId);
    if (!row) return;
    setRows(prev => prev.map(r => r.variantId === variantId ? { ...r, saving: true } : r));
    try {
      await fetch('/api/local/variant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId,
          eta: row.eta,
          etaNote: row.etaNote,
          materialGrams: row.materialGrams,
        }),
      });
      setRows(prev => prev.map(r => r.variantId === variantId ? { ...r, saving: false, saved: true } : r));
      setTimeout(() => setRows(prev => prev.map(r => r.variantId === variantId ? { ...r, saved: false } : r)), 2000);
    } catch {
      setRows(prev => prev.map(r => r.variantId === variantId ? { ...r, saving: false } : r));
    }
  }

  const { sorted, sortKey, sortDir, toggle } = useSortable<ETARow>(rows, 'productTitle', 'asc');
  const sh = (label: string, key: keyof ETARow) => (
    <SortableHeader label={label} sortKey={key as string} activeSortKey={sortKey as string} sortDir={sortDir} onSort={k => toggle(k as keyof ETARow)} />
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-widest uppercase txt-heading">ETA MANAGER</h1>
        <p className="text-xs mt-1 tracking-widest" style={{ color: 'var(--muted-2)' }}>PER-VARIANT BUILD TIME &amp; MATERIAL USAGE</p>
      </div>

      {loading ? (
        <div className="text-xs tracking-widest" style={{ color: 'var(--muted-2)' }}>LOADING PRODUCT DATA...</div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {sh('PRODUCT', 'productTitle')}
                  {sh('VARIANT', 'variantTitle')}
                  {sh('STATUS', 'productStatus')}
                  {sh('ETA', 'eta')}
                  <th className="text-left px-5 py-3 tracking-widest" style={{ color: 'var(--muted-2)' }}>ETA NOTE</th>
                  {sh('MATERIAL (g)', 'materialGrams')}
                  <th className="text-left px-5 py-3 tracking-widest" style={{ color: 'var(--muted-2)' }}>SAVE</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(row => (
                  <tr
                    key={row.variantId}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      borderTop: row.isFirstOfProduct ? '1px solid var(--border)' : undefined,
                    }}
                  >
                    <td className="px-5 py-3" style={{ color: 'var(--text)' }}>
                      {row.productTitle}
                    </td>
                    <td className="px-5 py-3 font-mono" style={{ color: 'var(--accent)' }}>{row.variantTitle}</td>
                    <td className="px-5 py-3">
                      {row.isFirstOfProduct && (
                        <span className="px-2 py-0.5 rounded" style={{
                          background: row.productStatus === 'ACTIVE' ? 'var(--accent-bg)' : 'var(--neutral-bg)',
                          color: row.productStatus === 'ACTIVE' ? 'var(--accent)' : 'var(--muted)'
                        }}>
                          {row.productStatus}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="text"
                        value={row.eta}
                        onChange={e => updateRow(row.variantId, 'eta', e.target.value)}
                        placeholder="e.g. 2-3 weeks"
                        className="px-2 py-1 rounded text-xs w-28 outline-none"
                        style={{ background: 'var(--bg)', border: '1px solid var(--input-border)', color: 'var(--text)' }}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="text"
                        value={row.etaNote}
                        onChange={e => updateRow(row.variantId, 'etaNote', e.target.value)}
                        placeholder="Additional note..."
                        className="px-2 py-1 rounded text-xs w-40 outline-none"
                        style={{ background: 'var(--bg)', border: '1px solid var(--input-border)', color: 'var(--text)' }}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={row.materialGrams}
                        onChange={e => updateRow(row.variantId, 'materialGrams', e.target.value)}
                        placeholder="e.g. 420"
                        className="px-2 py-1 rounded text-xs w-24 outline-none"
                        style={{ background: 'var(--bg)', border: '1px solid var(--input-border)', color: 'var(--text)' }}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => saveRow(row.variantId)}
                        disabled={row.saving}
                        className="flex items-center gap-1 px-3 py-1 rounded text-xs tracking-widest uppercase transition-colors"
                        style={{
                          background: row.saved ? 'var(--accent-border)' : 'var(--accent-bg)',
                          border: '1px solid var(--accent)',
                          color: 'var(--accent)',
                        }}
                      >
                        <Save size={11} />
                        {row.saving ? 'SAVING...' : row.saved ? 'SAVED' : 'SAVE'}
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-6 text-center" style={{ color: 'var(--muted-2)' }}>
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
