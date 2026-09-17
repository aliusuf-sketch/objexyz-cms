import { shopifyFetch, SHIPPING_QUERY, SHIPPING_BY_ID_QUERY, SHIPPABLE_FILTER } from '@/lib/shopify';
import { getAllShipments } from '@/lib/db';
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

function toShippable(o: RawNode, shippable: boolean): ShippableOrder {
  return {
    id: o.id,
    name: o.name,
    date: o.createdAt,
    customer: o.customer ? `${o.customer.firstName} ${o.customer.lastName || ''}`.trim() : 'Guest',
    financialStatus: o.financialStatus,
    fulfillmentStatus: o.fulfillmentStatus,
    outstanding: Number(o.totalOutstandingSet?.shopMoney?.amount || 0),
    address: o.shippingAddress,
    shippable,
    items: (o.lineItems?.edges || []).map(({ node }) => ({
      key: node.id,
      title: node.title,
      variant: node.variant?.title,
      quantity: node.quantity,
      price: Number(node.originalUnitPriceSet?.shopMoney?.amount || 0),
    })),
  };
}

export const GET = apiRoute(async () => {
  // Page through the shippable pool — it grows with the store.
  const raw: RawNode[] = [];
  const backfilled = new Set<string>();
  let cursor: string | null = null;
  let hasNext = true;
  while (hasNext) {
    const data = await shopifyFetch(SHIPPING_QUERY, { ordersQuery: SHIPPABLE_FILTER, cursor });
    const conn = data?.data?.orders;
    (conn?.edges || []).forEach((e: { node: RawNode }) => raw.push(e.node));
    hasNext = Boolean(conn?.pageInfo?.hasNextPage) && Boolean(conn?.pageInfo?.endCursor);
    cursor = conn?.pageInfo?.endCursor || null;
  }

  // Orders already on a saved shipment must stay resolvable even once
  // they're marked fulfilled in Shopify (which removes them from
  // SHIPPABLE_FILTER) — otherwise past shipments lose their contents and
  // their recorded delivery/collection outcomes.
  let localDataError = false;
  try {
    const shipments = Object.values(await getAllShipments());
    const known = new Set(raw.map(o => o.id));
    const referenced = new Set<string>();
    shipments.forEach(s => s.lines.forEach(l => {
      if (!known.has(l.orderId)) referenced.add(l.orderId);
    }));
    if (referenced.size > 0) {
      const data = await shopifyFetch(SHIPPING_BY_ID_QUERY, { ids: Array.from(referenced) });
      const nodes: (RawNode | null)[] = data?.data?.nodes || [];
      nodes.forEach(n => { if (n) { raw.push(n); backfilled.add(n.id); } });
    }
  } catch (err) {
    localDataError = true;
    console.error('Could not load shipments to back-fill referenced orders:', err);
  }

  const orders = raw.filter(o => !o.cancelledAt).map(o => toShippable(o, !backfilled.has(o.id)));
  return { orders, localDataError };
});
