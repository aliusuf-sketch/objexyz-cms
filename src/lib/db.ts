import { Redis } from '@upstash/redis';
import { CostRates, DEFAULT_COST_RATES } from '@/lib/costCalc';

// CMS-owned data store (Upstash Redis via REST). Holds everything that does
// NOT need to live in Shopify: per-variant ETA/material/dimensions/cost
// usage, studio-wide cost rates, and per-order production stages. Each is a
// single JSON document — the catalogue is small (tens of products), so this
// is simpler and faster than scanning many keys.
const redis = Redis.fromEnv();

const VARIANT_DATA_KEY = 'objexyz:variant_data';
const ORDER_STAGES_KEY = 'objexyz:order_stages';
const COST_RATES_KEY = 'objexyz:cost_rates';

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
