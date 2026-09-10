import { getAllOrderStages, setOrderStages } from '@/lib/db';
import { apiRoute, ApiError } from '@/lib/apiRoute';

export const GET = apiRoute(async () => ({ data: await getAllOrderStages() }));

// Body: { orderId, stages: { [lineItemId]: "PRINT" | "PAINT" | "DECALS" | "READY" | "SHIPPED" } }
export const POST = apiRoute(async (request) => {
  const { orderId, stages } = await request.json();
  if (!orderId || typeof stages !== 'object') {
    throw new ApiError('orderId and stages are required');
  }
  return { data: await setOrderStages(orderId, stages) };
});
