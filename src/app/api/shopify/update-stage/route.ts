import { NextRequest, NextResponse } from 'next/server';
import { shopifyFetch } from '@/lib/shopify';

const SET_METAFIELDS = `
  mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id key value }
      userErrors { field message }
    }
  }
`;

// Body: { orderId, stages: { [lineItemId]: "PRINT" | "PAINT" | "READY" | "SHIPPED" } }
// The full stages map for the order is written back as a JSON metafield.
export async function POST(request: NextRequest) {
  try {
    const { orderId, stages } = await request.json();
    if (!orderId || typeof stages !== 'object') {
      return NextResponse.json({ error: 'orderId and stages are required' }, { status: 400 });
    }

    const data = await shopifyFetch(SET_METAFIELDS, {
      metafields: [{
        ownerId: orderId,
        namespace: 'custom',
        key: 'production_stages',
        value: JSON.stringify(stages),
        type: 'json',
      }],
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
