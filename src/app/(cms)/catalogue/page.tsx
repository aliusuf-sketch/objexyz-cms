'use client';
import { useEffect, useState } from 'react';
import { formatPKR } from '@/lib/utils';
import { Save, Package } from 'lucide-react';

interface Metafield { namespace: string; key: string; value: string }
interface Variant {
  id: string;
  title: string;
  price: string;
  metafields: Metafield[];
}
interface Product {
  id: string;
  title: string;
  status: string;
  productType: string;
  tags: string[];
  featuredImage?: { url: string; altText?: string } | null;
  variants: { edges: { node: Variant }[] };
}

interface VariantRow {
  variantId: string;
  title: string;
  price: string;
  dimensions: string;
  eta: string;
  materialGrams: string;
  saving: boolean;
  saved: boolean;
}

interface ProductGroup {
  productId: string;
  title: string;
  status: string;
  productType: string;
  tags: string[];
  imageUrl?: string;
  variants: VariantRow[];
}

export default function CataloguePage() {
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { fetchCatalogue(); }, []);

  function fetchCatalogue() {
    setLoading(true);
    fetch('/api/shopify/products')
      .then(r => r.json())
      .then(data => {
        const edges = data?.data?.products?.edges || [];
        const products: Product[] = edges.map((e: { node: Product }) => e.node);
        setGroups(products.map(p => ({
          productId: p.id,
          title: p.title,
          status: p.status,
          productType: p.productType || '',
          tags: p.tags || [],
          imageUrl: p.featuredImage?.url,
          variants: (p.variants?.edges || []).map(ve => ({
            variantId: ve.node.id,
            title: ve.node.title,
            price: ve.node.price,
            dimensions: ve.node.metafields?.find(m => m.key === 'dimensions')?.value || '',
            eta: ve.node.metafields?.find(m => m.key === 'eta')?.value || '',
            materialGrams: ve.node.metafields?.find(m => m.key === 'material_grams')?.value || '',
            saving: false,
            saved: false,
          })),
        })));
      })
      .finally(() => setLoading(false));
  }

  function updateVariant(productId: string, variantId: string, field: 'dimensions' | 'eta' | 'materialGrams', value: string) {
    setGroups(prev => prev.map(g => g.productId !== productId ? g : {
      ...g,
      variants: g.variants.map(v => v.variantId !== variantId ? v : { ...v, [field]: value, saved: false }),
    }));
  }

  async function saveVariant(productId: string, variantId: string) {
    const group = groups.find(g => g.productId === productId);
    const row = group?.variants.find(v => v.variantId === variantId);
    if (!row) return;
    setGroups(prev => prev.map(g => g.productId !== productId ? g : {
      ...g,
      variants: g.variants.map(v => v.variantId !== variantId ? v : { ...v, saving: true }),
    }));
    try {
      await fetch('/api/shopify/update-eta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: variantId,
          dimensions: row.dimensions,
          eta: row.eta,
          materialGrams: row.materialGrams,
        }),
      });
      setGroups(prev => prev.map(g => g.productId !== productId ? g : {
        ...g,
        variants: g.variants.map(v => v.variantId !== variantId ? v : { ...v, saving: false, saved: true }),
      }));
      setTimeout(() => {
        setGroups(prev => prev.map(g => g.productId !== productId ? g : {
          ...g,
          variants: g.variants.map(v => v.variantId !== variantId ? v : { ...v, saved: false }),
        }));
      }, 2000);
    } catch {
      setGroups(prev => prev.map(g => g.productId !== productId ? g : {
        ...g,
        variants: g.variants.map(v => v.variantId !== variantId ? v : { ...v, saving: false }),
      }));
    }
  }

  const visible = groups.filter(g =>
    !filter || g.title.toLowerCase().includes(filter.toLowerCase()) || g.productType.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-widest uppercase txt-heading">CATALOGUE</h1>
          <p className="text-xs mt-1 tracking-widest" style={{ color: 'var(--muted-2)' }}>FULL PRODUCT SPEC SHEET — IMAGE, VARIANTS, DIMENSIONS, ETA, MATERIAL</p>
        </div>
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by product name or type..."
          className="px-3 py-2 rounded text-xs outline-none w-64"
          style={{ background: 'var(--surface)', border: '1px solid var(--input-border)', color: 'var(--text)' }}
        />
      </div>

      {loading ? (
        <div className="text-xs tracking-widest" style={{ color: 'var(--muted-2)' }}>LOADING CATALOGUE...</div>
      ) : (
        <div className="space-y-4">
          {visible.map(group => (
            <div key={group.productId} className="rounded-lg overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {/* Product header */}
              <div className="flex items-center gap-4 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="shrink-0 rounded overflow-hidden flex items-center justify-center"
                     style={{ width: 56, height: 56, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  {group.imageUrl
                    ? <img src={group.imageUrl} alt={group.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Package size={20} style={{ color: 'var(--muted-2)' }} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>{group.title}</span>
                    <span className="px-2 py-0.5 rounded text-xs" style={{
                      background: group.status === 'ACTIVE' ? 'var(--accent-bg)' : 'var(--neutral-bg)',
                      color: group.status === 'ACTIVE' ? 'var(--accent)' : 'var(--muted)',
                    }}>
                      {group.status}
                    </span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted-2)' }}>
                    {group.productType || 'Uncategorized'}
                    {group.tags.length > 0 && ` · ${group.tags.join(', ')}`}
                  </div>
                </div>
              </div>

              {/* Variant table */}
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left px-5 py-2 tracking-widest" style={{ color: 'var(--muted-2)' }}>VARIANT</th>
                    <th className="text-left px-5 py-2 tracking-widest" style={{ color: 'var(--muted-2)' }}>PRICE</th>
                    <th className="text-left px-5 py-2 tracking-widest" style={{ color: 'var(--muted-2)' }}>DIMENSIONS</th>
                    <th className="text-left px-5 py-2 tracking-widest" style={{ color: 'var(--muted-2)' }}>ETA</th>
                    <th className="text-left px-5 py-2 tracking-widest" style={{ color: 'var(--muted-2)' }}>MATERIAL (g)</th>
                    <th className="text-left px-5 py-2 tracking-widest" style={{ color: 'var(--muted-2)' }}>SAVE</th>
                  </tr>
                </thead>
                <tbody>
                  {group.variants.map(v => (
                    <tr key={v.variantId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-5 py-2 font-mono" style={{ color: 'var(--accent)' }}>{v.title}</td>
                      <td className="px-5 py-2 font-mono" style={{ color: 'var(--muted)' }}>{formatPKR(v.price)}</td>
                      <td className="px-5 py-2">
                        <input
                          type="text"
                          value={v.dimensions}
                          onChange={e => updateVariant(group.productId, v.variantId, 'dimensions', e.target.value)}
                          placeholder="e.g. 280×180×150mm"
                          className="px-2 py-1 rounded text-xs w-36 outline-none"
                          style={{ background: 'var(--bg)', border: '1px solid var(--input-border)', color: 'var(--text)' }}
                        />
                      </td>
                      <td className="px-5 py-2">
                        <input
                          type="text"
                          value={v.eta}
                          onChange={e => updateVariant(group.productId, v.variantId, 'eta', e.target.value)}
                          placeholder="e.g. 2-3 weeks"
                          className="px-2 py-1 rounded text-xs w-28 outline-none"
                          style={{ background: 'var(--bg)', border: '1px solid var(--input-border)', color: 'var(--text)' }}
                        />
                      </td>
                      <td className="px-5 py-2">
                        <input
                          type="number"
                          min="0"
                          value={v.materialGrams}
                          onChange={e => updateVariant(group.productId, v.variantId, 'materialGrams', e.target.value)}
                          placeholder="e.g. 420"
                          className="px-2 py-1 rounded text-xs w-20 outline-none"
                          style={{ background: 'var(--bg)', border: '1px solid var(--input-border)', color: 'var(--text)' }}
                        />
                      </td>
                      <td className="px-5 py-2">
                        <button
                          onClick={() => saveVariant(group.productId, v.variantId)}
                          disabled={v.saving}
                          className="flex items-center gap-1 px-3 py-1 rounded text-xs tracking-widest uppercase transition-colors"
                          style={{
                            background: v.saved ? 'var(--accent-border)' : 'var(--accent-bg)',
                            border: '1px solid var(--accent)',
                            color: 'var(--accent)',
                          }}
                        >
                          <Save size={11} />
                          {v.saving ? 'SAVING...' : v.saved ? 'SAVED' : 'SAVE'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {group.variants.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-3 text-center" style={{ color: 'var(--muted-2)' }}>No variants.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
          {visible.length === 0 && (
            <div className="text-xs text-center py-10" style={{ color: 'var(--muted-2)' }}>No products match.</div>
          )}
        </div>
      )}
    </div>
  );
}
