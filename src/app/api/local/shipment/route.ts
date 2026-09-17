import { getAllShipments, saveShipment, deleteShipment, updateShipmentOutcome } from '@/lib/db';
import { Shipment, nextShipmentReference } from '@/lib/shipments';
import { apiRoute, ApiError } from '@/lib/apiRoute';

export const GET = apiRoute(async () => {
  const map = await getAllShipments();
  const shipments = Object.values(map).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { shipments };
});

// Two modes on the same resource:
//   { id, orderId, outcome } -> record delivery/collection for one order
//   { id?, note?, lines }    -> create or replace a shipment
export const POST = apiRoute(async (request) => {
  const body = await request.json();

  if (body.id && body.orderId && body.outcome) {
    const o = body.outcome;
    const patch: Record<string, unknown> = {};
    if (o.delivered !== undefined) {
      patch.delivered = Boolean(o.delivered);
      patch.deliveredAt = o.delivered ? new Date().toISOString() : undefined;
    }
    if (o.collected !== undefined) {
      patch.collected = Boolean(o.collected);
      patch.collectedAt = o.collected ? new Date().toISOString() : undefined;
    }
    if (o.unitsDelivered !== undefined) patch.unitsDelivered = Number(o.unitsDelivered) || 0;
    if (o.amountCollected !== undefined) patch.amountCollected = Number(o.amountCollected) || 0;
    if (o.note !== undefined) patch.note = String(o.note);

    const shipment = await updateShipmentOutcome(body.id, body.orderId, patch);
    if (!shipment) throw new ApiError('Shipment not found', 404);
    return { shipment };
  }

  const lines = body.lines;
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new ApiError('At least one order with selected items is required');
  }
  for (const l of lines) {
    if (!l?.orderId || !Array.isArray(l.lineItemKeys) || l.lineItemKeys.length === 0) {
      throw new ApiError('Each line needs an orderId and at least one lineItemKey');
    }
  }

  const existingMap = await getAllShipments();
  const existing = body.id ? existingMap[body.id] : undefined;

  const shipment: Shipment = {
    id: existing?.id || `shp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    reference: existing?.reference || nextShipmentReference(Object.values(existingMap)),
    createdAt: existing?.createdAt || new Date().toISOString(),
    note: typeof body.note === 'string' ? body.note : existing?.note,
    lines: lines.map((l: { orderId: string; lineItemKeys: string[] }) => ({
      orderId: l.orderId,
      lineItemKeys: l.lineItemKeys,
    })),
  };

  await saveShipment(shipment);
  return { shipment };
});

export const DELETE = apiRoute(async (request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) throw new ApiError('id is required');
  await deleteShipment(id);
  return { ok: true };
});
