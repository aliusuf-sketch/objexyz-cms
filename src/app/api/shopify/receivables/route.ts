import { NextResponse } from 'next/server';
import { shopifyFetch, RECEIVABLES_QUERY, RECEIVABLES_BY_ID_QUERY } from '@/lib/shopify';
import { getAllReceivableOverrides } from '@/lib/db';
import { buildReceivableOrder, RawReceivableOrder, ReceivableOverrideMap } from '@/lib/receivables';

// Same launch-date baseline used everywhere else in this CMS (Dashboard,
// Production, Queue all filter from 2026-05-09) — keep it consistent so
// this page's order set never quietly disagrees with the rest of the app.
const ORDERS_FILTER =
  "created_at:>=2026-05-09 AND (financial_status:pending OR financial_status:partially_paid " +
  'OR fulfillment_status:unfulfilled OR fulfillment_status:partial OR fulfillment_status:on_hold) ' +
  'AND -financial_status:voided AND -financial_status:refunded';

export async function GET() {
  try {
    // Paginate through every matching order — the filtered set can exceed
    // 50 as the store grows, never silently truncate.
    const rawOrders: RawReceivableOrder[] = [];
    let cursor: string | null = null;
    let hasNext = true;
    while (hasNext) {
      const data = await shopifyFetch(RECEIVABLES_QUERY, { ordersQuery: ORDERS_FILTER, cursor });
      const conn = data?.data?.orders;
      const edges: { node: RawReceivableOrder }[] = conn?.edges || [];
      edges.forEach((e) => rawOrders.push(e.node));
      hasNext = Boolean(conn?.pageInfo?.hasNextPage) && Boolean(conn?.pageInfo?.endCursor);
      cursor = conn?.pageInfo?.endCursor || null;
    }

    // CMS-local overrides (disputed flags, checked/removed/custom items) —
    // a Redis failure must never hide real Shopify data.
    let overrides: ReceivableOverrideMap = {};
    let localDataError = false;
    try {
      overrides = await getAllReceivableOverrides();
    } catch (err) {
      localDataError = true;
      console.error('getAllReceivableOverrides failed, continuing without overrides:', err);
    }

    // Orders locally flagged disputed but no longer matching the live
    // filter (e.g. Shopify now shows PAID) still need to appear.
    const fetchedIds = new Set(rawOrders.map(o => o.id));
    const missingDisputedIds = Object.entries(overrides)
      .filter(([id, o]) => o.disputed && !fetchedIds.has(id))
      .map(([id]) => id);

    if (missingDisputedIds.length > 0) {
      const data = await shopifyFetch(RECEIVABLES_BY_ID_QUERY, { ids: missingDisputedIds });
      const nodes: (RawReceivableOrder | null)[] = data?.data?.nodes || [];
      nodes.forEach(n => { if (n) rawOrders.push(n); });
    }

    // Defensive: a genuinely cancelled order should never appear as a
    // receivable regardless of what status combination it also matches.
    const orders = rawOrders
      .filter(o => !o.cancelledAt)
      .map(o => buildReceivableOrder(o, overrides[o.id]));

    return NextResponse.json({ orders, localDataError });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
