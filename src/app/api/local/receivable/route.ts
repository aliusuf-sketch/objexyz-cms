import { NextRequest, NextResponse } from 'next/server';
import { getAllReceivableOverrides, setReceivableOverride } from '@/lib/db';
import { ReceivableOverride } from '@/lib/receivables';

export async function GET() {
  try {
    const data = await getAllReceivableOverrides();
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// Upsert one order's override. Body: { orderId, ...Partial<ReceivableOverride> }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }
    const patch: Partial<ReceivableOverride> = {};
    if (body.disputed !== undefined) patch.disputed = Boolean(body.disputed);
    if (body.disputeNote !== undefined) patch.disputeNote = String(body.disputeNote);
    if (body.amountReceived !== undefined) patch.amountReceived = Number(body.amountReceived) || 0;
    if (body.removedLineItemKeys !== undefined) patch.removedLineItemKeys = body.removedLineItemKeys;
    if (body.uncheckedLineItemKeys !== undefined) patch.uncheckedLineItemKeys = body.uncheckedLineItemKeys;
    if (body.customItems !== undefined) patch.customItems = body.customItems;

    const data = await setReceivableOverride(orderId, patch);
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
