'use client';
import { useEffect, useState } from 'react';
import { formatPKR } from '@/lib/utils';

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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

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

  function getVariantPrice(product: Product, variantTitle: string) {
    const v = product.variants?.edges?.find(e => e.node.title.toLowerCase().includes(variantTitle.toLowerCase()));
    return v ? formatPKR(v.node.price) : '—';
  }

  function getVariantEta(product: Product) {
    const parts = (product.variants?.edges || [])
      .map(e => {
        const eta = e.node.metafields?.find(m => m.key === 'eta')?.value;
        return eta ? `${e.node.title}: ${eta}` : null;
      })
      .filter(Boolean);
    return parts.length ? parts.join(' · ') : '—';
  }

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
                  {['PRODUCT', 'STATUS', '8IN', '16IN', 'CUSTOM', 'ETA', 'ACTION'].map(h => (
                    <th key={h} className="text-left px-5 py-3 tracking-widest" style={{ color: 'var(--muted-2)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="px-5 py-3">
                      <div className="font-medium" style={{ color: 'var(--text)' }}>{product.title}</div>
                      {product.productType && (
                        <div className="text-xs mt-0.5" style={{ color: 'var(--muted-2)' }}>{product.productType}</div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded" style={{
                        background: product.status === 'ACTIVE' ? 'var(--accent-bg)' : 'var(--neutral-bg)',
                        color: product.status === 'ACTIVE' ? 'var(--accent)' : 'var(--muted)'
                      }}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono" style={{ color: 'var(--muted)' }}>{getVariantPrice(product, '8in')}</td>
                    <td className="px-5 py-3 font-mono" style={{ color: 'var(--muted)' }}>{getVariantPrice(product, '16in')}</td>
                    <td className="px-5 py-3 font-mono" style={{ color: 'var(--muted)' }}>{getVariantPrice(product, 'custom')}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--muted)' }}>{getVariantEta(product)}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleStatus(product)}
                        disabled={toggling === product.id}
                        className="px-3 py-1 rounded text-xs tracking-widest uppercase transition-colors"
                        style={{
                          background: 'transparent',
                          border: `1px solid ${product.status === 'ACTIVE' ? 'var(--muted-2)' : 'var(--accent)'}`,
                          color: product.status === 'ACTIVE' ? 'var(--muted-2)' : 'var(--accent)',
                        }}
                      >
                        {toggling === product.id ? '...' : product.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVATE'}
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
