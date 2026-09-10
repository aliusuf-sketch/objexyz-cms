import { shopifyFetch } from '@/lib/shopify';
import { apiRoute, ApiError } from '@/lib/apiRoute';

const CREATE_PRODUCT = `
  mutation CreateProduct($input: ProductInput!) {
    productCreate(input: $input) {
      product { id title }
      userErrors { field message }
    }
  }
`;

export const POST = apiRoute(async (request) => {
  const body = await request.json();
  const { title, productType, status, tags, eta, price8in, price16in, priceCustom } = body;
  if (!title || typeof title !== 'string') throw new ApiError('title is required');

  const variants = [];
  if (price8in) variants.push({ title: '8in', price: price8in });
  if (price16in) variants.push({ title: '16in', price: price16in });
  if (priceCustom) variants.push({ title: 'Custom Size', price: priceCustom });

  const metafields = [];
  if (eta) metafields.push({ namespace: 'custom', key: 'eta', value: eta, type: 'single_line_text_field' });

  return shopifyFetch(CREATE_PRODUCT, {
    input: {
      title,
      productType,
      status: String(status || 'DRAFT').toUpperCase(),
      tags: tags ? String(tags).split(',').map((t: string) => t.trim()) : [],
      variants: variants.length > 0 ? variants : undefined,
      metafields: metafields.length > 0 ? metafields : undefined,
    },
  });
});
