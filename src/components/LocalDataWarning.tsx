import { AlertTriangle } from 'lucide-react';

export default function LocalDataWarning() {
  return (
    <div className="mb-4 rounded-lg px-4 py-2.5 flex items-center gap-2 text-xs"
         style={{ background: 'var(--warn-bg)', border: '1px solid var(--border)', color: 'var(--warn)' }}>
      <AlertTriangle size={13} />
      <span>
        CMS database is unreachable right now — ETA, material, dimensions, and production-stage data may be
        missing or stale below. Shopify data (products/orders) is still accurate.
      </span>
    </div>
  );
}
