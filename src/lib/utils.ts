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
