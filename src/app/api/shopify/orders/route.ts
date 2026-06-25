import { NextResponse } from 'next/server';
import { shopifyFetch, ORDERS_QUERY } from '@/lib/shopify';

export async function GET() {
  try {
    const data = await shopifyFetch(ORDERS_QUERY, {
      first: 50,
      query: 'created_at:>2026-05-09',
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
