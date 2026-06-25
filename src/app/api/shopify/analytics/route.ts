import { NextResponse } from 'next/server';
import { shopifyFetch } from '@/lib/shopify';

async function runShopifyQL(query: string) {
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
  return shopifyFetch(gql);
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
