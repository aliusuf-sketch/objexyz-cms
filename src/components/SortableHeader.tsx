'use client';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { SortDir } from '@/hooks/useSortable';

interface Props {
  label: string;
  sortKey: string;
  activeSortKey: string | null;
  sortDir: SortDir;
  onSort: (key: string) => void;
  className?: string;
}

export default function SortableHeader({ label, sortKey, activeSortKey, sortDir, onSort, className }: Props) {
  const isActive = activeSortKey === sortKey;
  return (
    <th
      className={`text-left px-5 py-3 tracking-widest cursor-pointer select-none group ${className ?? ''}`}
      onClick={() => onSort(sortKey)}
      style={{ color: isActive ? 'var(--text)' : 'var(--muted-2)' }}
    >
      <span className="flex items-center gap-1">
        {label}
        <span style={{ color: isActive ? 'var(--text)' : 'var(--border)' }}>
          {isActive
            ? sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
            : <ChevronsUpDown size={11} />}
        </span>
      </span>
    </th>
  );
}
