import { NextResponse } from 'next/server';
import { shopifyFetch, PRODUCTS_QUERY } from '@/lib/shopify';

export async function GET() {
  try {
    const data = await shopifyFetch(PRODUCTS_QUERY, { first: 50 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
