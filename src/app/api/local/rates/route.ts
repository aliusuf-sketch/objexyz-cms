import { getCostRates, setCostRates } from '@/lib/db';
import { apiRoute } from '@/lib/apiRoute';

export const GET = apiRoute(async () => ({ rates: await getCostRates() }));

export const POST = apiRoute(async (request) => {
  const patch = await request.json();
  return { rates: await setCostRates(patch) };
});
