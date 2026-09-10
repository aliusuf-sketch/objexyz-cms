import { shopifyFetch, ORDERS_QUERY, SINCE_LAUNCH } from '@/lib/shopify';
import { apiRoute } from '@/lib/apiRoute';

export const GET = apiRoute(async () =>
  shopifyFetch(ORDERS_QUERY, { first: 50, query: SINCE_LAUNCH })
);
