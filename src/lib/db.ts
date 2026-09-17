import { Redis } from '@upstash/redis';
import { CostRates, DEFAULT_COST_RATES } from '@/lib/costCalc';
import { ReceivableOverride, ReceivableOverrideMap, DEFAULT_RECEIVABLE_OVERRIDE } from '@/lib/receivables';
import { Shipment, ShipmentMap, ShipmentLineOutcome, DEFAULT_OUTCOME } from '@/lib/shipments';

// CMS-owned data store (Upstash Redis via REST). Holds everything that does
// NOT need to live in Shopify: per-variant ETA/material/dimensions/cost
// usage, studio-wide cost rates, and per-order production stages. Each is a
// single JSON document — the catalogue is small (tens of products), so this
// is simpler and faster than scanning many keys.
const redis = Redis.fromEnv();

const VARIANT_DATA_KEY = 'objexyz:variant_data';
const ORDER_STAGES_KEY = 'objexyz:order_stages';
const COST_RATES_KEY = 'objexyz:cost_rates';
const RECEIVABLE_OVERRIDES_KEY = 'objexyz:receivable_overrides';
const SHIPMENTS_KEY = 'objexyz:shipments';

export interface VariantData {
  eta?: string;
  etaNote?: string;
  materialGrams?: string;
  dimensions?: string;
  // Cost Calculator — per-variant usage entries.
  resinMl?: number;
  printerRuntimeHrs?: number;
  sandingHrs?: number;
  paintingHrs?: number;
  finishingHrs?: number;
  packagingHrs?: number;
  updatedAt?: string;
}

export type VariantDataMap = Record<string, VariantData>;
export type OrderStagesMap = Record<string, Record<string, string>>;

export async function getAllVariantData(): Promise<VariantDataMap> {
  const data = await redis.get<VariantDataMap>(VARIANT_DATA_KEY);
  return data || {};
}

export async function setVariantData(variantId: string, patch: VariantData): Promise<VariantDataMap> {
  const all = await getAllVariantData();
  all[variantId] = { ...all[variantId], ...patch, updatedAt: new Date().toISOString() };
  await redis.set(VARIANT_DATA_KEY, all);
  return all;
}

export async function getAllOrderStages(): Promise<OrderStagesMap> {
  const data = await redis.get<OrderStagesMap>(ORDER_STAGES_KEY);
  return data || {};
}

export async function setOrderStages(orderId: string, stages: Record<string, string>): Promise<OrderStagesMap> {
  const all = await getAllOrderStages();
  all[orderId] = stages;
  await redis.set(ORDER_STAGES_KEY, all);
  return all;
}

// ── Cost Calculator: studio-wide rate settings ─────────────────────────
// (Types + defaults live in src/lib/costCalc.ts, which is client-safe —
// this file only owns the Redis read/write.)

export async function getCostRates(): Promise<CostRates> {
  const data = await redis.get<CostRates>(COST_RATES_KEY);
  return data ? { ...DEFAULT_COST_RATES, ...data } : DEFAULT_COST_RATES;
}

export async function setCostRates(patch: Partial<CostRates>): Promise<CostRates> {
  const current = await getCostRates();
  const next = { ...current, ...patch };
  await redis.set(COST_RATES_KEY, next);
  return next;
}

// ── Pending Receivables: per-order local overrides ─────────────────────
// Shopify is the source of truth for financial/fulfillment status, but
// "disputed" is a real-world fact Shopify's API can never reflect (courier
// collected less COD than invoiced, an off-platform partial refund, etc),
// and checked/removed/custom line items are pure UI state that must survive
// a refresh and a re-sync from Shopify.
// (Types + defaults live in src/lib/receivables.ts, which is client-safe —
// this file only owns the Redis read/write, same split as Cost Rates above.)

export async function getAllReceivableOverrides(): Promise<ReceivableOverrideMap> {
  const data = await redis.get<ReceivableOverrideMap>(RECEIVABLE_OVERRIDES_KEY);
  return data || {};
}

export async function setReceivableOverride(
  shopifyOrderId: string,
  patch: Partial<ReceivableOverride>
): Promise<ReceivableOverrideMap> {
  const all = await getAllReceivableOverrides();
  const current = all[shopifyOrderId] || DEFAULT_RECEIVABLE_OVERRIDE;
  all[shopifyOrderId] = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await redis.set(RECEIVABLE_OVERRIDES_KEY, all);
  return all;
}

// ── Shipping Orders ────────────────────────────────────────────────────
// A shipment is a CMS-owned record of "these line items, from these
// orders, went out in this dispatch" — Shopify has no concept of it.
// (Types live in src/lib/shipments.ts, client-safe.)

export async function getAllShipments(): Promise<ShipmentMap> {
  const data = await redis.get<ShipmentMap>(SHIPMENTS_KEY);
  return data || {};
}

export async function saveShipment(shipment: Shipment): Promise<ShipmentMap> {
  const all = await getAllShipments();
  all[shipment.id] = shipment;
  await redis.set(SHIPMENTS_KEY, all);
  return all;
}

export async function deleteShipment(id: string): Promise<ShipmentMap> {
  const all = await getAllShipments();
  delete all[id];
  await redis.set(SHIPMENTS_KEY, all);
  return all;
}

/** Record what actually happened for one order inside a shipment. */
export async function updateShipmentOutcome(
  shipmentId: string,
  orderId: string,
  patch: Partial<ShipmentLineOutcome>
): Promise<Shipment | null> {
  const all = await getAllShipments();
  const shipment = all[shipmentId];
  if (!shipment) return null;
  shipment.lines = shipment.lines.map(l =>
    l.orderId === orderId
      ? { ...l, outcome: { ...DEFAULT_OUTCOME, ...(l.outcome || {}), ...patch } }
      : l
  );
  all[shipmentId] = shipment;
  await redis.set(SHIPMENTS_KEY, all);
  return shipment;
}
