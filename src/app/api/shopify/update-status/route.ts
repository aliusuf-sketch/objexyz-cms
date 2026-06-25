import { NextRequest, NextResponse } from 'next/server';
import { shopifyFetch } from '@/lib/shopify';

const UPDATE_STATUS = `
  mutation UpdateProductStatus($input: ProductInput!) {
    productUpdate(input: $input) {
      product { id status }
      userErrors { field message }
    }
  }
`;

export async function POST(request: NextRequest) {
  try {
    const { productId, status } = await request.json();
    const data = await shopifyFetch(UPDATE_STATUS, {
      input: { id: productId, status },
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
