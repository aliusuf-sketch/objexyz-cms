'use client';
import { useEffect, useMemo, useState } from 'react';
import { formatPKR } from '@/lib/utils';
import { Save, Package, X } from 'lucide-react';
import LocalDataWarning from '@/components/LocalDataWarning';
import { useProducts, Product } from '@/hooks/useProducts';
import { Card, PageHeading, Loading, Badge, inputStyle, inputStyleOnSurface } from '@/components/ui';

// Editable per-variant fields. This page absorbed the old ETA Manager —
// it was reading the same useProducts() data, writing the same
// /api/local/variant endpoint, and editing a subset of these same fields.
type EditableField = 'dimensions' | 'eta' | 'etaNote' | 'materialGrams';

interface VariantRow {
  variantId: string;
  title: string;
  price: string;
  dimensions: string;
  eta: string;
  etaNote: string;
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
  const { products, loading, localWarning } = useProducts();
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    setGroups(products.map((p: Product) => ({
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
        dimensions: ve.node.local?.dimensions || '',
        eta: ve.node.local?.eta || '',
        etaNote: ve.node.local?.etaNote || '',
        materialGrams: ve.node.local?.materialGrams || '',
        saving: false,
        saved: false,
      })),
    })));
  }, [products]);

  function patchVariant(productId: string, variantId: string, patch: Partial<VariantRow>) {
    setGroups(prev => prev.map(g => g.productId !== productId ? g : {
      ...g,
      variants: g.variants.map(v => v.variantId !== variantId ? v : { ...v, ...patch }),
    }));
  }

  function updateVariant(productId: string, variantId: string, field: EditableField, value: string) {
    patchVariant(productId, variantId, { [field]: value, saved: false });
  }

  async function saveVariant(productId: string, variantId: string) {
    const row = groups.find(g => g.productId === productId)?.variants.find(v => v.variantId === variantId);
    if (!row) return;
    patchVariant(productId, variantId, { saving: true });
    try {
      await fetch('/api/local/variant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId,
          dimensions: row.dimensions,
          eta: row.eta,
          etaNote: row.etaNote,
          materialGrams: row.materialGrams,
        }),
      });
      patchVariant(productId, variantId, { saving: false, saved: true });
      setTimeout(() => patchVariant(productId, variantId, { saved: false }), 2000);
    } catch {
      patchVariant(productId, variantId, { saving: false });
    }
  }

  const categories = useMemo(() => {
    const set = new Set(groups.map(g => g.productType).filter(Boolean));
    return Array.from(set).sort();
  }, [groups]);

  const visible = groups.filter(g => {
    if (statusFilter !== 'ALL' && g.status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && g.productType !== categoryFilter) return false;
    if (filter && !g.title.toLowerCase().includes(filter.toLowerCase()) && !g.productType.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  const hasActiveFilters = filter !== '' || statusFilter !== 'ALL' || categoryFilter !== 'ALL';
  function clearFilters() {
    setFilter('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
  }

  const th = (label: string) => (
    <th className="text-left px-5 py-2 tracking-widest" style={{ color: 'var(--muted-2)' }}>{label}</th>
  );

  return (
    <div>
      <PageHeading
        title="CATALOGUE"
        subtitle="FULL PRODUCT SPEC SHEET — IMAGE, VARIANTS, DIMENSIONS, ETA, MATERIAL"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Search product name..."
            className="px-3 py-2 rounded text-xs outline-none w-56"
            style={inputStyleOnSurface}
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded text-xs outline-none"
            style={inputStyleOnSurface}
          >
            <option value="ALL">ALL STATUS</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DRAFT">DRAFT</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded text-xs outline-none"
            style={inputStyleOnSurface}
          >
            <option value="ALL">ALL CATEGORIES</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2 py-2 rounded text-xs tracking-widest uppercase"
              style={{ color: 'var(--muted-2)' }}
            >
              <X size={12} /> CLEAR
            </button>
          )}
        </div>
      </PageHeading>

      {!loading && (
        <div className="text-xs mb-4 tracking-widest" style={{ color: 'var(--muted-2)' }}>
          {visible.length} of {groups.length} products
        </div>
      )}

      {loading ? (
        <Loading label="LOADING CATALOGUE..." />
      ) : (
        <>
          {localWarning && <LocalDataWarning />}
          <div className="space-y-4">
            {visible.map(group => (
              <Card key={group.productId} className="overflow-hidden">
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
                      <Badge text={group.status} tone={group.status === 'ACTIVE' ? 'accent' : 'neutral'} />
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--muted-2)' }}>
                      {group.productType || 'Uncategorized'}
                      {group.tags.length > 0 && ` · ${group.tags.join(', ')}`}
                    </div>
                  </div>
                </div>

                {/* Variant table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {th('VARIANT')}{th('PRICE')}{th('DIMENSIONS')}{th('ETA')}{th('ETA NOTE')}{th('MATERIAL (g)')}{th('SAVE')}
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
                              style={inputStyle}
                            />
                          </td>
                          <td className="px-5 py-2">
                            <input
                              type="text"
                              value={v.eta}
                              onChange={e => updateVariant(group.productId, v.variantId, 'eta', e.target.value)}
                              placeholder="e.g. 2-3 weeks"
                              className="px-2 py-1 rounded text-xs w-28 outline-none"
                              style={inputStyle}
                            />
                          </td>
                          <td className="px-5 py-2">
                            <input
                              type="text"
                              value={v.etaNote}
                              onChange={e => updateVariant(group.productId, v.variantId, 'etaNote', e.target.value)}
                              placeholder="Additional note..."
                              className="px-2 py-1 rounded text-xs w-40 outline-none"
                              style={inputStyle}
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
                              style={inputStyle}
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
                          <td colSpan={7} className="px-5 py-3 text-center" style={{ color: 'var(--muted-2)' }}>No variants.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
            {visible.length === 0 && (
              <div className="text-xs text-center py-10" style={{ color: 'var(--muted-2)' }}>No products match.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
