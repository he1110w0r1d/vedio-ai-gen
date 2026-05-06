import { Icon } from './Icon';

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-[240px] flex-1">
      <Icon name="search" className="pointer-events-none absolute left-3 top-2.5 text-on-surface-variant" />
      <input className="field pl-10" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}
