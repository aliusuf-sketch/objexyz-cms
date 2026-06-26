import { NextResponse } from 'next/server';
import { shopifyFetch, PRODUCTS_QUERY } from '@/lib/shopify';

export async function GET() {
  try {
    const data = await shopifyFetch(PRODUCTS_QUERY, { first: 50 });
    // Flatten the metafields connection into a flat array so the frontend
    // can do metafields.find(m => m.key === ...).
    const edges = data?.data?.products?.edges;
    if (Array.isArray(edges)) {
      for (const edge of edges) {
        const mfEdges = edge?.node?.metafields?.edges;
        if (Array.isArray(mfEdges)) {
          edge.node.metafields = mfEdges.map((e: { node: unknown }) => e.node);
        }
        // Flatten each variant's metafields too.
        const vEdges = edge?.node?.variants?.edges;
        if (Array.isArray(vEdges)) {
          for (const v of vEdges) {
            const vmf = v?.node?.metafields?.edges;
            if (Array.isArray(vmf)) {
              v.node.metafields = vmf.map((e: { node: unknown }) => e.node);
            }
          }
        }
      }
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
