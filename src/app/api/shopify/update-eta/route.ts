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

export async function POST(request: NextRequest) {
  try {
    // ownerId may be a product or a variant GID. (productId kept for back-compat.)
    const body = await request.json();
    const ownerId: string | undefined = body.ownerId || body.productId || body.variantId;
    const { eta, etaNote, materialGrams } = body;

    if (!ownerId) {
      return NextResponse.json({ error: 'ownerId is required' }, { status: 400 });
    }

    const metafields = [];
    if (eta !== undefined) {
      metafields.push({ ownerId, namespace: 'custom', key: 'eta', value: eta, type: 'single_line_text_field' });
    }
    if (etaNote !== undefined) {
      metafields.push({ ownerId, namespace: 'custom', key: 'eta_note', value: etaNote, type: 'single_line_text_field' });
    }
    if (materialGrams !== undefined) {
      metafields.push({ ownerId, namespace: 'custom', key: 'material_grams', value: String(materialGrams || 0), type: 'number_decimal' });
    }

    const data = await shopifyFetch(SET_METAFIELDS, { metafields });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
