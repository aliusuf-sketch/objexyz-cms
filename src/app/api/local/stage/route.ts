import { NextRequest, NextResponse } from 'next/server';
import { getAllOrderStages, setOrderStages } from '@/lib/db';

export async function GET() {
  try {
    const data = await getAllOrderStages();
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// Body: { orderId, stages: { [lineItemId]: "PRINT" | "PAINT" | "READY" | "SHIPPED" } }
export async function POST(request: NextRequest) {
  try {
    const { orderId, stages } = await request.json();
    if (!orderId || typeof stages !== 'object') {
      return NextResponse.json({ error: 'orderId and stages are required' }, { status: 400 });
    }
    const data = await setOrderStages(orderId, stages);
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
