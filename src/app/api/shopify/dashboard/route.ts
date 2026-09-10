import { shopifyFetch, DASHBOARD_QUERY, SINCE_LAUNCH } from '@/lib/shopify';
import { apiRoute } from '@/lib/apiRoute';

export const GET = apiRoute(async () =>
  shopifyFetch(DASHBOARD_QUERY, { ordersQuery: SINCE_LAUNCH })
);
