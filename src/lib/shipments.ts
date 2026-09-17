// Client-safe types + pure helpers for Shipping Orders. Kept out of
// src/lib/db.ts (server-only Redis import) so both API routes and the
// page/PDF components can use them — same split as receivables.ts.

// ── Stored shipment ───────────────────────────────────────────────────

export interface ShipmentLine {
  orderId: string;          // gid://shopify/Order/…
  lineItemKeys: string[];   // gid://shopify/LineItem/… actually being shipped
  outcome?: ShipmentLineOutcome;
}

/**
 * What actually happened after dispatch, recorded by the manager per
 * order. Deliberately separate from Shopify's own fulfillment/financial
 * status: the courier handing over 2 of 3 models, or collecting less cash
 * than invoiced, is a real-world fact Shopify won't know about unless
 * someone edits the order there.
 */
export interface ShipmentLineOutcome {
  delivered: boolean;
  deliveredAt?: string;
  /** Models actually handed over — may be fewer than shipped. */
  unitsDelivered?: number;
  collected: boolean;
  collectedAt?: string;
  amountCollected: number;
  note?: string;
}

export const DEFAULT_OUTCOME: ShipmentLineOutcome = {
  delivered: false,
  collected: false,
  amountCollected: 0,
};

export interface Shipment {
  id: string;
  reference: string;        // human-facing, e.g. SHP-0007
  createdAt: string;
  note?: string;
  lines: ShipmentLine[];
}

export type ShipmentMap = Record<string, Shipment>;

/** Next sequential reference, e.g. SHP-0008. */
export function nextShipmentReference(existing: Shipment[]): string {
  const max = existing.reduce((n, s) => {
    const m = /SHP-(\d+)/.exec(s.reference || '');
    return m ? Math.max(n, Number(m[1])) : n;
  }, 0);
  return `SHP-${String(max + 1).padStart(4, '0')}`;
}

// ── Shopify-sourced shippable order ───────────────────────────────────

export interface ShippingAddress {
  name: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  zip: string | null;
  country: string | null;
  phone: string | null;
}

export interface ShippableLineItem {
  key: string;
  title: string;
  variant?: string;
  quantity: number;
  price: number;
}

export interface ShippableOrder {
  id: string;
  name: string;
  date: string;
  customer: string;
  financialStatus: string;
  fulfillmentStatus: string;
  /** Amount still to collect (COD etc), straight from Shopify. */
  outstanding: number;
  address: ShippingAddress | null;
  items: ShippableLineItem[];
  /**
   * False for orders pulled in only because a saved shipment references
   * them (already fulfilled in Shopify). They must stay resolvable for
   * past shipments, but must not be offered as new dispatch candidates.
   */
  shippable: boolean;
}

// ── Address helpers ───────────────────────────────────────────────────

/**
 * Printable address lines, skipping the blanks. Real orders in this store
 * routinely have null province/zip, and at least one has an entirely empty
 * address — so never assume a field is present.
 */
export function addressLines(a: ShippingAddress | null): string[] {
  if (!a) return [];
  const cityLine = [a.city, a.province, a.zip].filter(Boolean).join(', ');
  return [a.address1, a.address2, cityLine, a.country].filter(
    (l): l is string => Boolean(l && l.trim())
  );
}

/**
 * True when there's nothing usable to put on a box label — the shipping
 * team needs this flagged rather than handed a label with just a name.
 */
export function isAddressIncomplete(a: ShippingAddress | null): boolean {
  if (!a) return true;
  const hasStreet = Boolean(a.address1 && a.address1.trim());
  const hasCity = Boolean(a.city && a.city.trim());
  return !hasStreet || !hasCity;
}

// ── Resolving a shipment against live orders ──────────────────────────

export interface ResolvedShipmentOrder {
  order: ShippableOrder;
  items: ShippableLineItem[];
  itemsTotal: number;
  unitCount: number;
  outcome: ShipmentLineOutcome;
}

/**
 * Join a stored shipment to the current Shopify order data. Line items
 * that no longer exist (order edited after the shipment was built) are
 * simply dropped, and orders with nothing left resolve to nothing —
 * the documents should never invent a line that isn't really shipping.
 */
export function resolveShipment(
  shipment: Shipment,
  orders: ShippableOrder[]
): ResolvedShipmentOrder[] {
  const byId = new Map(orders.map(o => [o.id, o]));
  const resolved: ResolvedShipmentOrder[] = [];

  for (const line of shipment.lines) {
    const order = byId.get(line.orderId);
    if (!order) continue;
    const keys = new Set(line.lineItemKeys);
    const items = order.items.filter(i => keys.has(i.key));
    if (items.length === 0) continue;
    resolved.push({
      order,
      items,
      itemsTotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
      unitCount: items.reduce((s, i) => s + i.quantity, 0),
      outcome: { ...DEFAULT_OUTCOME, ...(line.outcome || {}) },
    });
  }
  return resolved;
}

export function shipmentTotals(resolved: ResolvedShipmentOrder[]) {
  return {
    orderCount: resolved.length,
    unitCount: resolved.reduce((s, r) => s + r.unitCount, 0),
    itemsValue: resolved.reduce((s, r) => s + r.itemsTotal, 0),
    toCollect: resolved.reduce((s, r) => s + r.order.outstanding, 0),
  };
}

/**
 * Post-dispatch progress: how much of what went out has actually landed
 * and been paid for. Units delivered falls back to the shipped count when
 * an order is ticked delivered without an explicit figure.
 */
export function shipmentProgress(resolved: ResolvedShipmentOrder[]) {
  const totals = shipmentTotals(resolved);
  const deliveredOrders = resolved.filter(r => r.outcome.delivered).length;
  const collectedOrders = resolved.filter(r => r.outcome.collected).length;
  const unitsDelivered = resolved.reduce(
    (s, r) => s + (r.outcome.delivered ? (r.outcome.unitsDelivered ?? r.unitCount) : 0), 0
  );
  const amountCollected = resolved.reduce((s, r) => s + (r.outcome.amountCollected || 0), 0);

  return {
    ...totals,
    deliveredOrders,
    collectedOrders,
    unitsDelivered,
    amountCollected,
    outstandingAfter: Math.max(0, totals.toCollect - amountCollected),
    complete: resolved.length > 0 && resolved.every(r => r.outcome.delivered && r.outcome.collected),
    started: resolved.some(r => r.outcome.delivered || r.outcome.collected),
  };
}
