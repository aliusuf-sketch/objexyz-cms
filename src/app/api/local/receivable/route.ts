import { getAllReceivableOverrides, setReceivableOverride } from '@/lib/db';
import { ReceivableOverride } from '@/lib/receivables';
import { apiRoute, ApiError } from '@/lib/apiRoute';

export const GET = apiRoute(async () => ({ data: await getAllReceivableOverrides() }));

// Upsert one order's override. Body: { orderId, ...Partial<ReceivableOverride> }
// Note: array fields REPLACE rather than merge — callers must send the
// complete list (see the removedLineItemKeys handling in useReceivables).
export const POST = apiRoute(async (request) => {
  const body = await request.json();
  const { orderId } = body;
  if (!orderId) throw new ApiError('orderId is required');

  const patch: Partial<ReceivableOverride> = {};
  if (body.disputed !== undefined) patch.disputed = Boolean(body.disputed);
  if (body.disputeNote !== undefined) patch.disputeNote = String(body.disputeNote);
  if (body.amountReceived !== undefined) patch.amountReceived = Number(body.amountReceived) || 0;
  if (body.removedLineItemKeys !== undefined) patch.removedLineItemKeys = body.removedLineItemKeys;
  if (body.uncheckedLineItemKeys !== undefined) patch.uncheckedLineItemKeys = body.uncheckedLineItemKeys;
  if (body.customItems !== undefined) patch.customItems = body.customItems;

  return { data: await setReceivableOverride(orderId, patch) };
});
