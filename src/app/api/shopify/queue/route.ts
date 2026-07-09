import { NextResponse } from 'next/server';
import { shopifyFetch, QUEUE_QUERY } from '@/lib/shopify';
import { getAllVariantData, getAllOrderStages } from '@/lib/db';

export async function GET() {
  try {
    const [data, variantData, orderStages] = await Promise.all([
      shopifyFetch(QUEUE_QUERY, { ordersQuery: 'created_at:>2026-05-09' }),
      getAllVariantData(),
      getAllOrderStages(),
    ]);

    const edges = data?.data?.orders?.edges;
    if (Array.isArray(edges)) {
      for (const edge of edges) {
        const order = edge?.node;
        if (!order) continue;
        order.productionStages = orderStages[order.id] || {};
        const liEdges = order.lineItems?.edges;
        if (Array.isArray(liEdges)) {
          for (const li of liEdges) {
            const variant = li?.node?.variant;
            if (variant) {
              variant.local = variantData[variant.id] || {};
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
