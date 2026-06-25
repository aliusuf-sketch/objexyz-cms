import { NextRequest, NextResponse } from 'next/server';
import { shopifyFetch } from '@/lib/shopify';

const UPDATE_METAFIELD = `
  mutation UpdateProductMetafields($input: ProductInput!) {
    productUpdate(input: $input) {
      product { id }
      userErrors { field message }
    }
  }
`;

export async function POST(request: NextRequest) {
  try {
    const { productId, eta, etaNote } = await request.json();
    const metafields = [];
    if (eta !== undefined) {
      metafields.push({ namespace: 'custom', key: 'eta', value: eta, type: 'single_line_text_field' });
    }
    if (etaNote !== undefined) {
      metafields.push({ namespace: 'custom', key: 'eta_note', value: etaNote, type: 'single_line_text_field' });
    }
    const data = await shopifyFetch(UPDATE_METAFIELD, {
      input: { id: productId, metafields },
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
