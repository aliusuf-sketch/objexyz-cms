import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPKR(amount: string | number) {
  return `PKR ${Number(amount).toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-PK', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

// Parse a free-text ETA ("2-3 weeks", "10 days", "1 week") into a day count.
// Uses the larger number in a range to be conservative.
export function parseEtaToDays(eta?: string | null): number | null {
  if (!eta) return null;
  const lower = eta.toLowerCase();
  const nums = (lower.match(/\d+/g) || []).map(Number);
  if (nums.length === 0) return null;
  const n = Math.max(...nums);
  if (lower.includes('week') || lower.includes('wk')) return n * 7;
  if (lower.includes('month')) return n * 30;
  if (lower.includes('day')) return n;
  // No unit → assume weeks (studio convention).
  return n * 7;
}

// Ship-by date = order placed date + ETA days.
export function shipByDate(placedISO: string, eta?: string | null): Date | null {
  const days = parseEtaToDays(eta);
  if (days == null) return null;
  const d = new Date(placedISO);
  d.setDate(d.getDate() + days);
  return d;
}

// Whole days from now until the target date (negative = overdue).
export function daysUntil(date: Date): number {
  const ms = date.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
