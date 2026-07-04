'use client';
import { useEffect, useState, useMemo } from 'react';
import { formatPKR } from '@/lib/utils';
import SortableHeader from '@/components/SortableHeader';
import { useSortable } from '@/hooks/useSortable';

interface Metafield { namespace: string; key: string; value: string }
interface Variant { id: string; title: string; price: string; metafields: Metafield[]; }
interface Product {
  id: string;
  title: string;
  status: string;
  productType: string;
  tags: string[];
  variants: { edges: { node: Variant }[] };
  metafields: Metafield[];
}

interface ProductRow {
  id: string;
  title: string;
  status: string;
  productType: string;
  price8in: number;
  price16in: number;
  priceCustom: number;
  eta: string;
  _raw: Product;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => { fetchProducts(); }, []);

  function fetchProducts() {
    setLoading(true);
    fetch('/api/shopify/products')
      .then(r => r.json())
      .then(data => {
        const edges = data?.data?.products?.edges || [];
        setProducts(edges.map((e: { node: Product }) => e.node));
      })
      .finally(() => setLoading(false));
  }

  async function toggleStatus(product: Product) {
    const newStatus = product.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    setToggling(product.id);
    try {
      await fetch('/api/shopify/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, status: newStatus }),
      });
      fetchProducts();
    } finally {
      setToggling(null);
    }
  }

  function variantPrice(p: Product, title: string) {
    const v = p.variants?.edges?.find(e => e.node.title.toLowerCase().includes(title));
    return v ? Number(v.node.price) : 0;
  }

  function variantEtaSummary(p: Product) {
    const parts = (p.variants?.edges || [])
      .map(e => {
        const eta = e.node.metafields?.find(m => m.key === 'eta')?.value;
        return eta ? `${e.node.title}: ${eta}` : null;
      })
      .filter(Boolean);
    return parts.length ? parts.join(' · ') : '—';
  }

  const rows: ProductRow[] = useMemo(() => products.map(p => ({
    id: p.id,
    title: p.title,
    status: p.status,
    productType: p.productType || '',
    price8in: variantPrice(p, '8in'),
    price16in: variantPrice(p, '16in'),
    priceCustom: variantPrice(p, 'custom'),
    eta: variantEtaSummary(p),
    _raw: p,
  })), [products]);

  const { sorted, sortKey, sortDir, toggle } = useSortable<ProductRow>(rows, 'title', 'asc');

  const sh = (label: string, key: keyof ProductRow) => (
    <SortableHeader
      label={label}
      sortKey={key as string}
      activeSortKey={sortKey as string}
      sortDir={sortDir}
      onSort={k => toggle(k as keyof ProductRow)}
    />
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-widest uppercase txt-heading">PRODUCTS</h1>
        <p className="text-xs mt-1 tracking-widest" style={{ color: 'var(--muted-2)' }}>PRODUCT CATALOG MANAGEMENT</p>
      </div>

      {loading ? (
        <div className="text-xs tracking-widest" style={{ color: 'var(--muted-2)' }}>LOADING PRODUCT CATALOG...</div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {sh('PRODUCT', 'title')}
                  {sh('STATUS', 'status')}
                  {sh('8IN', 'price8in')}
                  {sh('16IN', 'price16in')}
                  {sh('CUSTOM', 'priceCustom')}
                  {sh('ETA', 'eta')}
                  <th className="text-left px-5 py-3 tracking-widest" style={{ color: 'var(--muted-2)' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="px-5 py-3">
                      <div className="font-medium" style={{ color: 'var(--text)' }}>{row.title}</div>
                      {row.productType && (
                        <div className="text-xs mt-0.5" style={{ color: 'var(--muted-2)' }}>{row.productType}</div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded" style={{
                        background: row.status === 'ACTIVE' ? 'var(--accent-bg)' : 'var(--neutral-bg)',
                        color: row.status === 'ACTIVE' ? 'var(--accent)' : 'var(--muted)',
                      }}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono" style={{ color: 'var(--muted)' }}>
                      {row.price8in ? formatPKR(row.price8in) : '—'}
                    </td>
                    <td className="px-5 py-3 font-mono" style={{ color: 'var(--muted)' }}>
                      {row.price16in ? formatPKR(row.price16in) : '—'}
                    </td>
                    <td className="px-5 py-3 font-mono" style={{ color: 'var(--muted)' }}>
                      {row.priceCustom ? formatPKR(row.priceCustom) : '—'}
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--muted)' }}>{row.eta}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleStatus(row._raw)}
                        disabled={toggling === row.id}
                        className="px-3 py-1 rounded text-xs tracking-widest uppercase transition-colors"
                        style={{
                          background: 'transparent',
                          border: `1px solid ${row.status === 'ACTIVE' ? 'var(--muted-2)' : 'var(--accent)'}`,
                          color: row.status === 'ACTIVE' ? 'var(--muted-2)' : 'var(--accent)',
                        }}
                      >
                        {toggling === row.id ? '...' : row.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVATE'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
