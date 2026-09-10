import { shopifyFetch } from '@/lib/shopify';
import { apiRoute, ApiError } from '@/lib/apiRoute';

const UPDATE_STATUS = `
  mutation UpdateProductStatus($input: ProductInput!) {
    productUpdate(input: $input) {
      product { id status }
      userErrors { field message }
    }
  }
`;

export const POST = apiRoute(async (request) => {
  const { productId, status } = await request.json();
  if (!productId || !status) throw new ApiError('productId and status are required');
  return shopifyFetch(UPDATE_STATUS, { input: { id: productId, status } });
});
