import { getAllVariantData, setVariantData, VariantData } from '@/lib/db';
import { apiRoute, ApiError } from '@/lib/apiRoute';

export const GET = apiRoute(async () => ({ data: await getAllVariantData() }));

const NUMERIC_FIELDS = [
  'resinMl', 'printerRuntimeHrs', 'sandingHrs', 'paintingHrs', 'finishingHrs', 'packagingHrs',
] as const;
const STRING_FIELDS = ['eta', 'etaNote', 'materialGrams', 'dimensions'] as const;

export const POST = apiRoute(async (request) => {
  const body = await request.json();
  const { variantId } = body;
  if (!variantId) throw new ApiError('variantId is required');

  const patch: VariantData = {};
  for (const key of STRING_FIELDS) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  for (const key of NUMERIC_FIELDS) {
    if (body[key] !== undefined) patch[key] = Number(body[key]) || 0;
  }
  return { data: await setVariantData(variantId, patch) };
});
