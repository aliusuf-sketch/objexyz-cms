import { NextRequest, NextResponse } from 'next/server';
import { getAllVariantData, setVariantData, VariantData } from '@/lib/db';

export async function GET() {
  try {
    const data = await getAllVariantData();
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

const NUMERIC_FIELDS = [
  'resinMl', 'printerRuntimeHrs', 'sandingHrs', 'paintingHrs', 'finishingHrs', 'packagingHrs',
] as const;
const STRING_FIELDS = ['eta', 'etaNote', 'materialGrams', 'dimensions'] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { variantId } = body;
    if (!variantId) {
      return NextResponse.json({ error: 'variantId is required' }, { status: 400 });
    }
    const patch: VariantData = {};
    for (const key of STRING_FIELDS) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
    for (const key of NUMERIC_FIELDS) {
      if (body[key] !== undefined) patch[key] = Number(body[key]) || 0;
    }

    const data = await setVariantData(variantId, patch);
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
