import { NextResponse } from 'next/server';
import { shopifyFetch, QUEUE_QUERY } from '@/lib/shopify';

export async function GET() {
  try {
    // Only orders that are paid or partially paid are worth producing.
    const data = await shopifyFetch(QUEUE_QUERY, {
      ordersQuery: 'created_at:>2026-05-09',
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
