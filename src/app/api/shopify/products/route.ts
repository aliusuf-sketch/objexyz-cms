import { NextResponse } from 'next/server';
import { shopifyFetch, PRODUCTS_QUERY } from '@/lib/shopify';
import { getAllVariantData, VariantDataMap } from '@/lib/db';

export async function GET() {
  try {
    const data = await shopifyFetch(PRODUCTS_QUERY, { first: 50 });

    // CMS-local enrichment (ETA/material/dimensions/cost usage) is a
    // nice-to-have overlay, not a hard dependency — if Redis is
    // unreachable/misconfigured, never let that take down real Shopify
    // data. Fall back to an empty overlay instead of failing the request.
    let localData: VariantDataMap = {};
    let localDataError = false;
    try {
      localData = await getAllVariantData();
    } catch (err) {
      localDataError = true;
      console.error('getAllVariantData failed, continuing without local overlay:', err);
    }

    const edges = data?.data?.products?.edges;
    if (Array.isArray(edges)) {
      for (const edge of edges) {
        const vEdges = edge?.node?.variants?.edges;
        if (Array.isArray(vEdges)) {
          for (const v of vEdges) {
            v.node.local = localData[v.node.id] || {};
          }
        }
      }
    }
    return NextResponse.json({ ...data, localDataError });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
