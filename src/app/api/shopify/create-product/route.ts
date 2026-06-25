import { NextRequest, NextResponse } from 'next/server';
import { shopifyFetch } from '@/lib/shopify';

const CREATE_PRODUCT = `
  mutation CreateProduct($input: ProductInput!) {
    productCreate(input: $input) {
      product { id title }
      userErrors { field message }
    }
  }
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, productType, status, tags, eta, price8in, price16in, priceCustom } = body;

    const variants = [];
    if (price8in) variants.push({ title: '8in', price: price8in });
    if (price16in) variants.push({ title: '16in', price: price16in });
    if (priceCustom) variants.push({ title: 'Custom Size', price: priceCustom });

    const metafields = [];
    if (eta) metafields.push({ namespace: 'custom', key: 'eta', value: eta, type: 'single_line_text_field' });

    const data = await shopifyFetch(CREATE_PRODUCT, {
      input: {
        title,
        productType,
        status: status.toUpperCase(),
        tags: tags ? tags.split(',').map((t: string) => t.trim()) : [],
        variants: variants.length > 0 ? variants : undefined,
        metafields: metafields.length > 0 ? metafields : undefined,
      },
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
