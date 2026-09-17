'use client';
import { useCallback, useEffect, useState } from 'react';
import { Shipment, ShipmentLine, ShippableOrder } from '@/lib/shipments';

/**
 * Shipping module data: the pool of orders that can still be shipped
 * (live from Shopify) plus the saved shipment records (CMS-owned).
 */
export function useShipping() {
  const [orders, setOrders] = useState<ShippableOrder[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [candRes, shipRes] = await Promise.all([
        fetch('/api/shopify/shipping-candidates').then(r => r.json()),
        fetch('/api/local/shipment').then(r => r.json()),
      ]);
      if (candRes.error) setError(candRes.error);
      else setOrders(candRes.orders || []);
      // A shipments failure shouldn't hide the order pool.
      if (!shipRes.error) setShipments(shipRes.shipments || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createShipment = useCallback(async (lines: ShipmentLine[], note: string) => {
    const res = await fetch('/api/local/shipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines, note }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    setShipments(prev => [data.shipment, ...prev]);
    return data.shipment as Shipment;
  }, []);

  const removeShipment = useCallback(async (id: string) => {
    setShipments(prev => prev.filter(s => s.id !== id));
    await fetch(`/api/local/shipment?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      .catch(() => { /* optimistic; a failure just means it returns on refresh */ });
  }, []);

  return { orders, shipments, loading, error, reload: load, createShipment, removeShipment };
}
