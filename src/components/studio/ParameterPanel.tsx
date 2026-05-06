import type { Provider } from '../../types';

export function ParameterPanel({
  providers,
  providerId,
  model,
  style,
  aspectRatio,
  count,
  seed,
  onProviderChange,
  onStyleChange,
  onAspectRatioChange,
  onCountChange,
  onSeedChange,
}: {
  providers: Provider[];
  providerId: string;
  model: string;
  style: string;
  aspectRatio: string;
  count: number;
  seed: string;
  onProviderChange: (value: string) => void;
  onStyleChange: (value: string) => void;
  onAspectRatioChange: (value: string) => void;
  onCountChange: (value: number) => void;
  onSeedChange: (value: string) => void;
}) {
  return (
    <>
      <label className="block text-sm">
        <span className="mb-1 block text-on-surface-variant">供应商</span>
        <select className="field" value={providerId} onChange={(event) => onProviderChange(event.target.value)}>
          {providers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-on-surface-variant">模型</span>
        <input className="field" value={model} readOnly />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="mb-1 block text-on-surface-variant">风格预设</span>
          <select className="field" value={style} onChange={(event) => onStyleChange(event.target.value)}>
            <option>电影感</option>
            <option>产品展示</option>
            <option>赛博朋克</option>
            <option>极简商业</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-on-surface-variant">画幅</span>
          <select className="field" value={aspectRatio} onChange={(event) => onAspectRatioChange(event.target.value)}>
            <option>1:1</option>
            <option>16:9</option>
            <option>9:16</option>
            <option>4:3</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-on-surface-variant">数量</span>
          <input className="field" type="number" min={1} max={4} value={count} onChange={(event) => onCountChange(Number(event.target.value))} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-on-surface-variant">Seed</span>
          <input className="field" value={seed} onChange={(event) => onSeedChange(event.target.value)} placeholder="随机" />
        </label>
      </div>
    </>
  );
}
