'use client';
import { useCallback, useEffect, useState } from 'react';

// Canonical shape of `variant.local` — the CMS-owned overlay merged
// server-side by /api/shopify/products (see src/lib/db.ts VariantData).
// This is a superset; individual pages only read the fields they need.
export interface VariantLocal {
  eta?: string;
  etaNote?: string;
  materialGrams?: string;
  dimensions?: string;
  resinMl?: number;
  printerRuntimeHrs?: number;
  sandingHrs?: number;
  paintingHrs?: number;
  finishingHrs?: number;
  packagingHrs?: number;
}

export interface ProductVariant {
  id: string;
  title: string;
  price: string;
  local?: VariantLocal;
}

export interface Product {
  id: string;
  title: string;
  status: string;
  productType: string;
  tags: string[];
  featuredImage?: { url: string; altText?: string } | null;
  variants: { edges: { node: ProductVariant }[] };
}

// Shared fetch for every page that reads the Shopify product catalogue
// (Products, Catalogue, ETA Manager, Cost Calculator). Centralizes the
// /api/shopify/products call, response shape, and the localDataError ->
// warning flag (see LocalDataWarning) so all four stay in sync instead of
// each re-implementing the same fetch/parse logic.
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [localWarning, setLocalWarning] = useState(false);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    return fetch('/api/shopify/products')
      .then(r => r.json())
      .then(data => {
        if (data.localDataError) setLocalWarning(true);
        const edges = data?.data?.products?.edges || [];
        setProducts(edges.map((e: { node: Product }) => e.node));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  return { products, loading, localWarning, refetch: fetchProducts };
}
