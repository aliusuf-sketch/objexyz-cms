import { NextRequest, NextResponse } from 'next/server';
import { getAllVariantData, setVariantData } from '@/lib/db';

export async function GET() {
  try {
    const data = await getAllVariantData();
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { variantId, eta, etaNote, materialGrams, dimensions } = body;
    if (!variantId) {
      return NextResponse.json({ error: 'variantId is required' }, { status: 400 });
    }
    const patch: Record<string, string> = {};
    if (eta !== undefined) patch.eta = eta;
    if (etaNote !== undefined) patch.etaNote = etaNote;
    if (materialGrams !== undefined) patch.materialGrams = materialGrams;
    if (dimensions !== undefined) patch.dimensions = dimensions;

    const data = await setVariantData(variantId, patch);
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
