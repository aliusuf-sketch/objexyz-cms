const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN!;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';

export async function shopifyFetch(query: string, variables?: Record<string, unknown>) {
  const endpoint = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Shopify API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const PRODUCTS_QUERY = `
  query GetProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          status
          productType
          tags
          variants(first: 10) {
            edges {
              node {
                id
                title
                price
              }
            }
          }
          metafields(identifiers: [
            {namespace: "custom", key: "eta"},
            {namespace: "custom", key: "eta_note"}
          ]) {
            namespace
            key
            value
          }
        }
      }
    }
  }
`;

export const ORDERS_QUERY = `
  query GetOrders($first: Int!, $query: String!) {
    orders(first: $first, query: $query) {
      edges {
        node {
          id
          name
          createdAt
          financialStatus
          fulfillmentStatus
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          customer {
            firstName
            lastName
            email
          }
          lineItems(first: 10) {
            edges {
              node {
                title
                quantity
                variant {
                  price
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const DASHBOARD_QUERY = `
  query DashboardData($ordersQuery: String!) {
    orders(first: 250, query: $ordersQuery) {
      edges {
        node {
          id
          name
          createdAt
          financialStatus
          fulfillmentStatus
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          lineItems(first: 5) {
            edges {
              node {
                title
                quantity
              }
            }
          }
        }
      }
    }
  }
`;
