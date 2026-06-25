import { NextResponse } from 'next/server';

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN!;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';

async function runShopifyQL(query: string) {
  const endpoint = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  const gql = `
    query {
      shopifyqlQuery(query: "${query.replace(/"/g, '\\"')}") {
        ... on TableResponse {
          tableData {
            rowData
            columns { name dataType }
          }
        }
        parseErrors { code message }
      }
    }
  `;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
    },
    body: JSON.stringify({ query: gql }),
    cache: 'no-store',
  });
  return res.json();
}

export async function GET() {
  try {
    const [revenueData, productData, sessionData] = await Promise.all([
      runShopifyQL('FROM sales SHOW total_sales, orders TIMESERIES day SINCE 2026-05-09 UNTIL today'),
      runShopifyQL('FROM sales SHOW gross_sales GROUP BY product_title ORDER BY gross_sales DESC LIMIT 10'),
      runShopifyQL('FROM sessions SHOW sessions TIMESERIES day SINCE 2026-05-09 UNTIL today'),
    ]);
    return NextResponse.json({ revenueData, productData, sessionData });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
