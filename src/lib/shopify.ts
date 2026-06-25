const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';

// Legacy static token (optional). If set, it's used directly.
const SHOPIFY_ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
// 2026 Dev Dashboard apps: exchange these for a 24h token via client credentials grant.
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

// In-memory token cache (per serverless instance).
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Prefer a static token if explicitly provided.
  if (SHOPIFY_ADMIN_API_TOKEN) return SHOPIFY_ADMIN_API_TOKEN;

  // Reuse cached token if still valid (refresh 5 min before the 24h expiry).
  if (cachedToken && Date.now() < cachedToken.expiresAt - 5 * 60 * 1000) {
    return cachedToken.value;
  }

  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
    throw new Error(
      'No Shopify credentials. Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET (or a static SHOPIFY_ADMIN_API_TOKEN).'
    );
  }

  const tokenRes = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
      }),
      cache: 'no-store',
    }
  );

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`Token exchange failed: ${tokenRes.status} ${text}`);
  }

  const data = await tokenRes.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 86399) * 1000,
  };
  return cachedToken.value;
}

export async function shopifyFetch(query: string, variables?: Record<string, unknown>) {
  const token = await getAccessToken();
  const endpoint = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
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
