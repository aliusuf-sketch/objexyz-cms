import { shopifyFetch, LAUNCH_DATE } from '@/lib/shopify';
import { apiRoute } from '@/lib/apiRoute';

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

export const GET = apiRoute(async () => {
  const [revenueData, productData, sessionData] = await Promise.all([
    runShopifyQL(`FROM sales SHOW total_sales, orders TIMESERIES day SINCE ${LAUNCH_DATE} UNTIL today`),
    runShopifyQL('FROM sales SHOW gross_sales GROUP BY product_title ORDER BY gross_sales DESC LIMIT 10'),
    runShopifyQL(`FROM sessions SHOW sessions TIMESERIES day SINCE ${LAUNCH_DATE} UNTIL today`),
  ]);
  return { revenueData, productData, sessionData };
});
