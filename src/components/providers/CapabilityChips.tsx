import type { ProviderCapability } from '../../types';

export const providerCapabilities: ProviderCapability[] = ['图片生成', 'T2V', 'I2V', 'R2V', '首帧', '尾帧', '多参考图', '负面提示词', 'Seed', '异步任务'];

export function CapabilityChips({
  capabilities,
  selected,
  onToggle,
}: {
  capabilities: ProviderCapability[];
  selected?: ProviderCapability[];
  onToggle?: (capability: ProviderCapability) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {capabilities.map((capability) => (
        <button
          key={capability}
          type="button"
          className={`chip ${selected?.includes(capability) ? 'border-primary-fixed-dim text-primary-fixed' : ''} ${onToggle ? '' : 'pointer-events-none'}`}
          onClick={() => onToggle?.(capability)}
        >
          {capability}
        </button>
      ))}
    </div>
  );
}
