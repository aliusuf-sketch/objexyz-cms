import { shopifyFetch, QUEUE_QUERY, SINCE_LAUNCH } from '@/lib/shopify';
import { getAllVariantData, getAllOrderStages, VariantDataMap, OrderStagesMap } from '@/lib/db';
import { apiRoute } from '@/lib/apiRoute';

export const GET = apiRoute(async () => {
  const data = await shopifyFetch(QUEUE_QUERY, { ordersQuery: SINCE_LAUNCH });

  // Same principle as /api/shopify/products: CMS-local overlays
  // (production stages, per-variant usage) must never take down real
  // Shopify order data if Redis is unreachable/misconfigured.
  let variantData: VariantDataMap = {};
  let orderStages: OrderStagesMap = {};
  let localDataError = false;
  try {
    [variantData, orderStages] = await Promise.all([getAllVariantData(), getAllOrderStages()]);
  } catch (err) {
    localDataError = true;
    console.error('CMS local data fetch failed, continuing without overlay:', err);
  }

  const edges = data?.data?.orders?.edges;
  if (Array.isArray(edges)) {
    for (const edge of edges) {
      const order = edge?.node;
      if (!order) continue;
      order.productionStages = orderStages[order.id] || {};
      const liEdges = order.lineItems?.edges;
      if (Array.isArray(liEdges)) {
        for (const li of liEdges) {
          const variant = li?.node?.variant;
          if (variant) {
            variant.local = variantData[variant.id] || {};
          }
        }
      }
    }
  }
  return { ...data, localDataError };
});
