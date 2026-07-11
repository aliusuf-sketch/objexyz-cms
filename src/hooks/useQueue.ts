'use client';
import { useCallback, useEffect, useState } from 'react';

export type Stage = 'PRINT' | 'PAINT' | 'DECALS' | 'READY' | 'SHIPPED';
export const STAGES: Stage[] = ['PRINT', 'PAINT', 'DECALS', 'READY', 'SHIPPED'];
export const STAGE_LABELS: Record<Stage, string> = {
  PRINT: 'PRINT',
  PAINT: 'PAINT',
  DECALS: 'DECALS',
  READY: 'READY TO SHIP',
  SHIPPED: 'SHIPPED',
};

interface RawVariantLocal {
  eta?: string;
  materialGrams?: string;
  resinMl?: number;
  printerRuntimeHrs?: number;
  sandingHrs?: number;
  paintingHrs?: number;
  finishingHrs?: number;
  packagingHrs?: number;
}
interface RawLineItem {
  id: string;
  title: string;
  quantity: number;
  variant?: {
    id: string;
    title: string;
    price: string;
    local?: RawVariantLocal | null;
  } | null;
  product?: { id: string; featuredImage?: { url: string; altText?: string } | null } | null;
}
interface RawOrder {
  id: string;
  name: string;
  createdAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  customer?: { firstName: string; lastName: string } | null;
  productionStages?: Record<string, Stage> | null;
  lineItems: { edges: { node: RawLineItem }[] };
}

export interface QueueItem {
  key: string;
  orderId: string;
  orderName: string;
  lineItemId: string;
  createdAt: string;
  customer: string;
  productId: string;
  productTitle: string;
  variantId: string;
  variantTitle: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  eta?: string;
  grams: number;
  usage: {
    resinMl: number;
    printerRuntimeHrs: number;
    sandingHrs: number;
    paintingHrs: number;
    finishingHrs: number;
    packagingHrs: number;
  };
  fulfillmentStatus: string;
  financialStatus: string;
  stage: Stage;
}

export function useQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [orderStages, setOrderStages] = useState<Record<string, Record<string, Stage>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/shopify/queue')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        const edges: { node: RawOrder }[] = data?.data?.orders?.edges || [];
        const stagesByOrder: Record<string, Record<string, Stage>> = {};
        const flat: QueueItem[] = [];
        edges.forEach(({ node: o }) => {
          const stages = o.productionStages || {};
          stagesByOrder[o.id] = stages;
          (o.lineItems?.edges || []).forEach(({ node: li }) => {
            const defaultStage: Stage = o.fulfillmentStatus === 'FULFILLED' ? 'SHIPPED' : 'PRINT';
            flat.push({
              key: `${o.id}::${li.id}`,
              orderId: o.id,
              orderName: o.name,
              lineItemId: li.id,
              createdAt: o.createdAt,
              customer: o.customer ? `${o.customer.firstName} ${o.customer.lastName}`.trim() : 'Guest',
              productId: li.product?.id || '',
              productTitle: li.title,
              variantId: li.variant?.id || '',
              variantTitle: li.variant?.title || '',
              quantity: li.quantity,
              price: Number(li.variant?.price || 0),
              imageUrl: li.product?.featuredImage?.url,
              eta: li.variant?.local?.eta || undefined,
              grams: Number(li.variant?.local?.materialGrams || 0),
              usage: {
                resinMl: li.variant?.local?.resinMl || 0,
                printerRuntimeHrs: li.variant?.local?.printerRuntimeHrs || 0,
                sandingHrs: li.variant?.local?.sandingHrs || 0,
                paintingHrs: li.variant?.local?.paintingHrs || 0,
                finishingHrs: li.variant?.local?.finishingHrs || 0,
                packagingHrs: li.variant?.local?.packagingHrs || 0,
              },
              fulfillmentStatus: o.fulfillmentStatus || 'UNFULFILLED',
              financialStatus: o.financialStatus || '',
              stage: stages[li.id] || defaultStage,
            });
          });
        });
        setOrderStages(stagesByOrder);
        setItems(flat);
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const setStage = useCallback(async (item: QueueItem, next: Stage) => {
    // Optimistic UI update.
    setItems(prev => prev.map(it => it.key === item.key ? { ...it, stage: next } : it));
    const merged = { ...(orderStages[item.orderId] || {}), [item.lineItemId]: next };
    setOrderStages(prev => ({ ...prev, [item.orderId]: merged }));
    try {
      await fetch('/api/local/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: item.orderId, stages: merged }),
      });
    } catch {
      // Roll back on failure.
      setItems(prev => prev.map(it => it.key === item.key ? { ...it, stage: item.stage } : it));
    }
  }, [orderStages]);

  return { items, loading, error, setStage };
}
