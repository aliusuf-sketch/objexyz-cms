// Client-safe types + pure logic for Pending Receivables. Kept separate
// from src/lib/db.ts (which imports the server-only Redis client) so this
// can be imported from both API routes and the frontend page, mirroring
// the CostRates/costCalc.ts split.

export interface CustomReceivableItem {
  key: string;
  title: string;
  price: number;
}

export interface ReceivableOverride {
  disputed: boolean;
  disputeNote?: string;
  amountReceived: number;
  removedLineItemKeys: string[];
  uncheckedLineItemKeys: string[];
  customItems: CustomReceivableItem[];
  updatedAt?: string;
}

export type ReceivableOverrideMap = Record<string, ReceivableOverride>;

export const DEFAULT_RECEIVABLE_OVERRIDE: ReceivableOverride = {
  disputed: false,
  disputeNote: '',
  amountReceived: 0,
  removedLineItemKeys: [],
  uncheckedLineItemKeys: [],
  customItems: [],
};

// ── Shopify raw shape (subset of RECEIVABLE_ORDER_FIELDS) ───────────────

export interface RawReceivableOrder {
  id: string;
  name: string;
  createdAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  cancelledAt: string | null;
  customer: { firstName: string; lastName: string | null } | null;
  shippingLine: { title: string; originalPriceSet: { shopMoney: { amount: string } } } | null;
  totalPriceSet: { shopMoney: { amount: string } };
  lineItems: {
    edges: {
      node: {
        id: string;
        title: string;
        quantity: number;
        sku: string | null;
        originalUnitPriceSet: { shopMoney: { amount: string } };
        variant: { title: string; image: { url: string } | null } | null;
        product: { featuredImage: { url: string } | null } | null;
      };
    }[];
  };
}

// ── View model ────────────────────────────────────────────────────────

export interface ReceivableLineItem {
  key: string;
  title: string;
  variant?: string;
  price: number;
  imageUrl?: string;
  checked: boolean;
  isCustom: boolean;
}

export interface ReceivableShipping {
  key: string;
  price: number;
  checked: boolean;
}

export interface ReceivableOrderVM {
  id: string;
  name: string;
  date: string;
  customer: string;
  financialStatus: string;
  fulfillmentStatus: string;
  disputed: boolean;
  disputeNote: string;
  amountReceived: number;
  locked: boolean;
  shippedWithoutPayment: boolean;
  items: ReceivableLineItem[];
  shipping: ReceivableShipping | null;
}

export function buildReceivableOrder(
  raw: RawReceivableOrder,
  override: ReceivableOverride | undefined
): ReceivableOrderVM {
  const ov = override || DEFAULT_RECEIVABLE_OVERRIDE;
  const removed = new Set(ov.removedLineItemKeys);
  const unchecked = new Set(ov.uncheckedLineItemKeys);

  const shopifyItems: ReceivableLineItem[] = (raw.lineItems?.edges || [])
    .map(({ node }) => ({
      key: node.id,
      title: node.title,
      variant: node.variant?.title,
      price: Number(node.originalUnitPriceSet?.shopMoney?.amount || 0),
      imageUrl: node.variant?.image?.url || node.product?.featuredImage?.url,
      checked: !unchecked.has(node.id),
      isCustom: false,
    }))
    .filter(item => !removed.has(item.key));

  const customItems: ReceivableLineItem[] = (ov.customItems || []).map(c => ({
    key: c.key,
    title: c.title,
    price: c.price,
    checked: !unchecked.has(c.key),
    isCustom: true,
  }));

  const shippingPrice = Number(raw.shippingLine?.originalPriceSet?.shopMoney?.amount || 0);
  const shippingKey = `${raw.id}:shipping`;
  const shipping: ReceivableShipping | null =
    raw.shippingLine && shippingPrice > 0 && !removed.has(shippingKey)
      ? { key: shippingKey, price: shippingPrice, checked: !unchecked.has(shippingKey) }
      : null;

  const customerName = raw.customer
    ? `${raw.customer.firstName} ${raw.customer.lastName || ''}`.trim()
    : 'Guest';

  return {
    id: raw.id,
    name: raw.name,
    date: raw.createdAt,
    customer: customerName,
    financialStatus: raw.financialStatus,
    fulfillmentStatus: raw.fulfillmentStatus,
    disputed: ov.disputed,
    disputeNote: ov.disputeNote || '',
    amountReceived: ov.amountReceived,
    locked: raw.financialStatus === 'PAID' && !ov.disputed,
    shippedWithoutPayment: raw.financialStatus !== 'PAID' && raw.fulfillmentStatus === 'FULFILLED',
    items: [...shopifyItems, ...customItems],
    shipping,
  };
}

// ── Totals (shared by the summary bar and both exports) ─────────────────

export function orderReceivableTotal(order: ReceivableOrderVM): { amount: number; clamped: boolean } {
  if (order.locked) return { amount: 0, clamped: false };

  const itemsTotal = order.items.filter(i => i.checked).reduce((s, i) => s + i.price, 0);
  const shippingTotal = order.shipping?.checked ? order.shipping.price : 0;
  const checkedTotal = itemsTotal + shippingTotal;

  if (order.disputed) {
    const remaining = checkedTotal - order.amountReceived;
    return { amount: Math.max(0, remaining), clamped: remaining < 0 };
  }
  return { amount: checkedTotal, clamped: false };
}
