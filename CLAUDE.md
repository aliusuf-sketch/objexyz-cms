# OBJEXYZ CMS

Internal operations dashboard for OBJEXYZ Studio (Lahore/Karachi, 3D-printed
military scale models). Next.js 14 (App Router) + Tailwind + Shopify Admin
GraphQL API, deployed on Vercel. Repo: `objexyz-cms`.

## Stack

- Next.js 14 App Router, TypeScript, Tailwind CSS
- Shopify Admin GraphQL API (2024-10) via server-side API routes — token
  never touches the client
- Auth: single shared password (`CMS_PASSWORD`), JWT session cookie (7 day),
  enforced by `src/middleware.ts`
- Data: two sources, deliberately split (see below)

## Data architecture — two sources, don't mix them up

1. **Shopify** — anything the storefront/customers need: product title,
   status, price, images, orders, fulfillment/financial status. Read via
   `src/lib/shopify.ts` (GraphQL queries + `shopifyFetch`), written via
   dedicated `/api/shopify/*` routes.
2. **CMS-owned database (Upstash Redis)** — internal-only operational data
   that does NOT need to live in Shopify: per-variant **ETA**, **material
   grams**, **dimensions**, and per-order **production stages**
   (Print → Paint → Decals → Ready to Ship → Shipped). See `src/lib/db.ts`.
   Two JSON documents (`variant_data`, `order_stages`) — the catalogue is
   small (tens of products), so one doc beats scanning many keys.
   Read/write via `/api/local/variant` and `/api/local/stage`.

**Do not write ETA/material/dimensions/stages back to Shopify metafields.**
That was the original design and it was replaced — Shopify metafield writes
were unreliable (scope issues, silent failures) and there's no current
requirement for these fields to be storefront-visible. If that requirement
comes back, revisit deliberately (don't silently dual-write).

The `/api/shopify/products` and `/api/shopify/queue` routes merge CMS data
server-side before returning to the client — each variant gets a `local: {
eta, etaNote, materialGrams, dimensions }` object attached. Frontend code
should read `variant.local?.eta`, never re-add Shopify metafield fetching
for these fields.

Requires env vars `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
(Vercel Storage → Marketplace Database Integrations → Upstash Redis).

## Auth to Shopify

Store uses a 2026 Dev Dashboard app (Client ID + Client Secret, NOT a
static token). `src/lib/shopify.ts` exchanges these for a 24h access token
via the client credentials grant and caches it in memory per serverless
instance. Requires `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET`. A legacy
`SHOPIFY_ADMIN_API_TOKEN` env var is still supported as an override if ever
needed, but shouldn't be the default path.

`SHOPIFY_STORE_DOMAIN=hyzdg1-5f.myshopify.com`, currency PKR, launch date
2026-05-09 (analytics/dashboard baseline from this date).

## Pages (sidebar order)

| Route | Purpose |
|---|---|
| `/` | Dashboard — revenue/volume, payment status, fulfillment breakdown, recent orders, top products |
| `/production` | Production Planning — paid+unshipped items grouped by product+variant, with unit/order/material totals |
| `/queue` | Shipping Queue — kanban board, 5 stages: Print → Paint → Decals → Ready to Ship → Shipped |
| `/catalogue` | Full spec sheet — image, variants, price, dimensions, ETA, material grams, all editable inline |
| `/products` | Product table — status toggle, variant prices, ETA summary |
| `/orders` | Order list — expandable line items |
| `/analytics` | ShopifyQL — revenue/sessions/top products |
| `/eta-manager` | Per-variant ETA + ETA note + material grams editor |
| `/new-product` | Create product form |

## Design system

Dark "tactical ops" aesthetic with a **light/dark theme toggle** (sidebar
footer, persisted to `localStorage`, no-flash init script in
`src/app/layout.tsx`). **Never hardcode colors** — everything is a CSS
variable defined in `src/app/globals.css` under `[data-theme='dark']` /
`[data-theme='light']`:

- `--bg`, `--surface`, `--surface-2`, `--border`, `--border-subtle`
- `--text`, `--heading` (use `.txt-heading` class for headings — not
  `text-white`, which doesn't theme), `--muted`, `--muted-2`, `--faint`
- `--accent`, `--accent-fg` (text color for filled accent buttons — flips
  per theme), `--accent-bg`, `--accent-bg-soft`, `--accent-border`
- `--warn`, `--warn-bg`, `--danger`, `--danger-bg`, `--danger-border`,
  `--neutral-bg`

Accent is **monochrome** (light gray in dark mode, near-black in light
mode) — not green. Amber (`--warn`) and red (`--danger`) are kept as real
signal colors (pending/refunded/overdue) — don't neutralize those.

Typography: Inter, headers uppercase + `tracking-widest`. Sidebar: 240px,
active nav item = accent-colored left border + accent text.

## Conventions

- **Sortable tables**: use `src/hooks/useSortable.ts` +
  `src/components/SortableHeader.tsx`. Every data table in this app should
  be sortable — it's an established pattern, not optional.
- **Per-variant editable fields** (ETA Manager, Catalogue): each row saves
  independently via its own button/request, with `saving`/`saved` local
  state and a 2s auto-clear on the "SAVED" confirmation — follow this
  pattern for any new editable-row UI rather than a page-level save button.
- **Queue/production data**: both `/production` and `/queue` pages consume
  the shared `useQueue()` hook (`src/hooks/useQueue.ts`), which flattens
  Shopify orders to line-item level and merges in CMS local data + stage.
  Add new queue-derived views by consuming this hook, not by re-fetching.
- Money: always format via `formatPKR()` in `src/lib/utils.ts`.
- Dates: `formatDate()`; ETA-to-date math via `parseEtaToDays()` /
  `shipByDate()` / `daysUntil()` in the same file.

## Before building UI

1. Read `src/app/globals.css` for the current variable set before adding
   any new color — reuse existing tokens; only add a new variable if no
   existing one fits both themes.
2. Check whether the data already flows through `useQueue()` or the
   `/api/shopify/products` `local` merge before adding a new fetch.
3. Run `npm run build` before pushing — this project has shipped several
   type errors from `Record<Stage, ...>` literals missing a key after
   stages were added; the build catches these.
4. Follow the existing commit message style (imperative summary line,
   blank line, explanation of *why*, `Co-Authored-By: Claude <model> <noreply@anthropic.com>`).
