import { shopifyFetch, SHIPPING_QUERY, SHIPPABLE_FILTER } from '@/lib/shopify';
import { ShippableOrder } from '@/lib/shipments';
import { apiRoute } from '@/lib/apiRoute';

interface RawNode {
  id: string;
  name: string;
  createdAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  cancelledAt: string | null;
  customer: { firstName: string; lastName: string | null } | null;
  totalOutstandingSet: { shopMoney: { amount: string } } | null;
  shippingAddress: ShippableOrder['address'];
  lineItems: {
    edges: {
      node: {
        id: string;
        title: string;
        quantity: number;
        originalUnitPriceSet: { shopMoney: { amount: string } } | null;
        variant: { title: string } | null;
      };
    }[];
  };
}

export const GET = apiRoute(async () => {
  // Page through everything — the shippable set grows with the store.
  const raw: RawNode[] = [];
  let cursor: string | null = null;
  let hasNext = true;
  while (hasNext) {
    const data = await shopifyFetch(SHIPPING_QUERY, { ordersQuery: SHIPPABLE_FILTER, cursor });
    const conn = data?.data?.orders;
    (conn?.edges || []).forEach((e: { node: RawNode }) => raw.push(e.node));
    hasNext = Boolean(conn?.pageInfo?.hasNextPage) && Boolean(conn?.pageInfo?.endCursor);
    cursor = conn?.pageInfo?.endCursor || null;
  }

  const orders: ShippableOrder[] = raw
    .filter(o => !o.cancelledAt)
    .map(o => ({
      id: o.id,
      name: o.name,
      date: o.createdAt,
      customer: o.customer ? `${o.customer.firstName} ${o.customer.lastName || ''}`.trim() : 'Guest',
      financialStatus: o.financialStatus,
      fulfillmentStatus: o.fulfillmentStatus,
      outstanding: Number(o.totalOutstandingSet?.shopMoney?.amount || 0),
      address: o.shippingAddress,
      items: (o.lineItems?.edges || []).map(({ node }) => ({
        key: node.id,
        title: node.title,
        variant: node.variant?.title,
        quantity: node.quantity,
        price: Number(node.originalUnitPriceSet?.shopMoney?.amount || 0),
      })),
    }));

  return { orders };
});
