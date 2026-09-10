// Shared UI primitives. Before this existed, every page hand-rolled its own
// card wrapper, loading line, stat tile, status badge and input style — the
// card wrapper style alone appeared 34 times. Reach for these instead of
// re-inlining `background: var(--surface), border: 1px solid var(--border)`.

// ── Form controls ─────────────────────────────────────────────────────
// The one input/select style used across every editable field in the CMS.
export const inputStyle = {
  background: 'var(--bg)',
  border: '1px solid var(--input-border)',
  color: 'var(--text)',
} as const;

// Same, on a surface-coloured background (filter bars sitting on the page
// rather than inside a card).
export const inputStyleOnSurface = {
  background: 'var(--surface)',
  border: '1px solid var(--input-border)',
  color: 'var(--text)',
} as const;

// ── Layout ────────────────────────────────────────────────────────────

export function Card({ children, className = '', style }: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-lg ${className}`}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', ...style }}
    >
      {children}
    </div>
  );
}

// Card with a titled header bar and a scrollable body (Dashboard panels).
export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col min-h-0">
      <div className="px-4 py-2.5 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>{title}</h2>
      </div>
      <div className="p-4 overflow-y-auto flex-1 min-h-0">{children}</div>
    </Card>
  );
}

export function PageHeading({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode; // right-aligned actions
}) {
  return (
    <div className="mb-6 flex items-end justify-between flex-wrap gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-widest uppercase txt-heading">{title}</h1>
        {subtitle && (
          <p className="text-xs mt-1 tracking-widest" style={{ color: 'var(--muted-2)' }}>{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Status / feedback ─────────────────────────────────────────────────

export function Loading({ label = 'LOADING...' }: { label?: string }) {
  return <div className="text-xs tracking-widest" style={{ color: 'var(--muted-2)' }}>{label}</div>;
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div
      className="rounded p-4 text-xs"
      style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)' }}
    >
      {message}
    </div>
  );
}

export function StatCard({ label, value, sub, warn, big }: {
  label: string;
  value: string;
  sub?: string;
  warn?: boolean;
  big?: boolean;
}) {
  return (
    <Card className="px-4 flex flex-col justify-center h-full">
      <div className="text-xs tracking-widest mb-1 truncate" style={{ color: 'var(--muted-2)' }}>{label}</div>
      <div className={big ? 'text-2xl font-bold' : 'text-lg font-bold'} style={{ color: warn ? 'var(--warn)' : 'var(--text)' }}>{value}</div>
      {sub && <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted-2)' }}>{sub}</div>}
    </Card>
  );
}

// ── Badges ────────────────────────────────────────────────────────────

export type Tone = 'accent' | 'warn' | 'danger' | 'neutral';

const TONES: Record<Tone, { bg: string; color: string }> = {
  accent: { bg: 'var(--accent-bg)', color: 'var(--accent)' },
  warn: { bg: 'var(--warn-bg)', color: 'var(--warn)' },
  danger: { bg: 'var(--danger-bg)', color: 'var(--danger)' },
  neutral: { bg: 'var(--neutral-bg)', color: 'var(--muted)' },
};

export function Badge({ text, tone = 'neutral' }: { text: string; tone?: Tone }) {
  const t = TONES[tone];
  return <span className="px-2 py-0.5 rounded text-xs" style={{ background: t.bg, color: t.color }}>{text}</span>;
}

// Shopify order status -> tone. Kept in one place so Orders, Dashboard,
// Queue and Receivables can't drift apart on what "PARTIALLY_PAID" looks
// like. Covers both the `PARTIAL` and `PARTIALLY_FULFILLED` spellings the
// Admin API uses in different contexts.
export function financialTone(status: string): Tone {
  if (status === 'PAID') return 'accent';
  if (status === 'PENDING' || status === 'PARTIALLY_PAID') return 'warn';
  if (status === 'REFUNDED' || status === 'PARTIALLY_REFUNDED' || status === 'VOIDED') return 'danger';
  return 'neutral';
}

export function fulfillmentTone(status: string): Tone {
  if (status === 'FULFILLED') return 'accent';
  if (status === 'IN_PROGRESS' || status === 'PARTIAL' || status === 'PARTIALLY_FULFILLED') return 'warn';
  if (status === 'ON_HOLD') return 'danger';
  return 'neutral';
}

export function FinancialBadge({ status }: { status: string }) {
  return <Badge text={status || '—'} tone={financialTone(status)} />;
}

export function FulfillmentBadge({ status }: { status: string }) {
  return <Badge text={status || 'UNFULFILLED'} tone={fulfillmentTone(status)} />;
}

// Profit-margin colouring, shared by the Cost Calculator's three tabs.
export function marginColor(pct: number): string {
  if (pct < 0) return 'var(--danger)';
  if (pct < 20) return 'var(--warn)';
  return 'var(--accent)';
}
