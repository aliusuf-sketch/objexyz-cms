import { NextRequest, NextResponse } from 'next/server';
import { getCostRates, setCostRates } from '@/lib/db';

export async function GET() {
  try {
    const rates = await getCostRates();
    return NextResponse.json({ rates });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const patch = await request.json();
    const rates = await setCostRates(patch);
    return NextResponse.json({ rates });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
