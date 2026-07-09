import { Redis } from '@upstash/redis';

// CMS-owned data store (Upstash Redis via REST). Holds everything that does
// NOT need to live in Shopify: per-variant ETA/material/dimensions, and
// per-order production stages. Two keys, each a single JSON document — the
// catalogue is small (tens of products), so this is simpler and faster than
// scanning many keys.
const redis = Redis.fromEnv();

const VARIANT_DATA_KEY = 'objexyz:variant_data';
const ORDER_STAGES_KEY = 'objexyz:order_stages';

export interface VariantData {
  eta?: string;
  etaNote?: string;
  materialGrams?: string;
  dimensions?: string;
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
