import type { Asset } from '../../types';

export function ReferenceSlot({
  label,
  value,
  assets,
  onChange,
}: {
  label: string;
  value: string;
  assets: Asset[];
  onChange: (assetId: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-on-surface-variant">{label}</span>
      <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">选择素材</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.title}
          </option>
        ))}
      </select>
    </label>
  );
}
