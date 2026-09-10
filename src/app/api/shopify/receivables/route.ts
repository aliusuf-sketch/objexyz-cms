import { shopifyFetch, RECEIVABLES_QUERY, RECEIVABLES_BY_ID_QUERY, RECEIVABLES_FILTER } from '@/lib/shopify';
import { getAllReceivableOverrides } from '@/lib/db';
import { buildReceivableOrder, RawReceivableOrder, ReceivableOverrideMap } from '@/lib/receivables';
import { apiRoute } from '@/lib/apiRoute';

export const GET = apiRoute(async () => {
  // Paginate through every matching order — the filtered set can exceed
  // 50 as the store grows, never silently truncate.
  const rawOrders: RawReceivableOrder[] = [];
  let cursor: string | null = null;
  let hasNext = true;
  while (hasNext) {
    const data = await shopifyFetch(RECEIVABLES_QUERY, { ordersQuery: RECEIVABLES_FILTER, cursor });
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

  return { orders, localDataError };
});
