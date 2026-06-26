'use client';
import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';

interface Product {
  id: string;
  title: string;
  status: string;
  metafields: { namespace: string; key: string; value: string }[];
}

interface ETARow {
  id: string;
  title: string;
  status: string;
  eta: string;
  etaNote: string;
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
        setRows(products.map(p => ({
          id: p.id,
          title: p.title,
          status: p.status,
          eta: p.metafields?.find(m => m.key === 'eta')?.value || '',
          etaNote: p.metafields?.find(m => m.key === 'eta_note')?.value || '',
          saving: false,
          saved: false,
        })));
      })
      .finally(() => setLoading(false));
  }, []);

  function updateRow(id: string, field: 'eta' | 'etaNote', value: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value, saved: false } : r));
  }

  async function saveRow(id: string) {
    const row = rows.find(r => r.id === id);
    if (!row) return;
    setRows(prev => prev.map(r => r.id === id ? { ...r, saving: true } : r));
    try {
      await fetch('/api/shopify/update-eta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: id, eta: row.eta, etaNote: row.etaNote }),
      });
      setRows(prev => prev.map(r => r.id === id ? { ...r, saving: false, saved: true } : r));
      setTimeout(() => setRows(prev => prev.map(r => r.id === id ? { ...r, saved: false } : r)), 2000);
    } catch {
      setRows(prev => prev.map(r => r.id === id ? { ...r, saving: false } : r));
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-widest uppercase txt-heading">ETA MANAGER</h1>
        <p className="text-xs mt-1 tracking-widest" style={{ color: 'var(--muted-2)' }}>MANAGE PRODUCT ETA METAFIELDS</p>
      </div>

      {loading ? (
        <div className="text-xs tracking-widest" style={{ color: 'var(--muted-2)' }}>LOADING PRODUCT DATA...</div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['PRODUCT', 'STATUS', 'ETA', 'ETA NOTE', 'SAVE'].map(h => (
                  <th key={h} className="text-left px-5 py-3 tracking-widest" style={{ color: 'var(--muted-2)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="px-5 py-3" style={{ color: 'var(--text)' }}>{row.title}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded" style={{
                      background: row.status === 'ACTIVE' ? 'var(--accent-bg)' : 'var(--neutral-bg)',
                      color: row.status === 'ACTIVE' ? 'var(--accent)' : 'var(--muted)'
                    }}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <input
                      type="text"
                      value={row.eta}
                      onChange={e => updateRow(row.id, 'eta', e.target.value)}
                      placeholder="e.g. 2-3 weeks"
                      className="px-2 py-1 rounded text-xs w-32 outline-none"
                      style={{ background: 'var(--bg)', border: '1px solid var(--input-border)', color: 'var(--text)' }}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <input
                      type="text"
                      value={row.etaNote}
                      onChange={e => updateRow(row.id, 'etaNote', e.target.value)}
                      placeholder="Additional note..."
                      className="px-2 py-1 rounded text-xs w-48 outline-none"
                      style={{ background: 'var(--bg)', border: '1px solid var(--input-border)', color: 'var(--text)' }}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => saveRow(row.id)}
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
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
