import { inputStyle } from '@/components/ui';

/** Compact numeric input shared by the rates form, catalog rows and the
 *  single-item calculator. */
export function numInput(value: number, onChange: (v: number) => void, width = 64) {
  return (
    <input
      type="number"
      min={0}
      step="any"
      value={value || ''}
      onChange={e => onChange(Number(e.target.value) || 0)}
      className="px-2 py-1 rounded text-xs outline-none"
      style={{ ...inputStyle, width }}
      placeholder="0"
    />
  );
}
