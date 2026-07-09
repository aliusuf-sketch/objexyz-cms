import { NextResponse } from 'next/server';
import { shopifyFetch, PRODUCTS_QUERY } from '@/lib/shopify';
import { getAllVariantData } from '@/lib/db';

export async function GET() {
  try {
    const [data, localData] = await Promise.all([
      shopifyFetch(PRODUCTS_QUERY, { first: 50 }),
      getAllVariantData(),
    ]);

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
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
