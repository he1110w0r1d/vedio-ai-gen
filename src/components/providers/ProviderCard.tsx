import type { Provider } from '../../types';
import { maskKey } from '../../services/mockService';
import { Icon } from '../common/Icon';
import { StatusBadge } from '../common/StatusBadge';
import { CapabilityChips } from './CapabilityChips';

export function ProviderCard({
  provider,
  onSave,
  onDeleteKey,
  onTest,
  onSetDefault,
}: {
  provider: Provider;
  onSave: (provider: Provider) => void;
  onDeleteKey: (providerId: string) => void;
  onTest: (providerId: string) => void;
  onSetDefault: (providerId: string) => void;
}) {
  return (
    <section className="card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">{provider.name}</h3>
          <p className="text-xs text-on-surface-variant">{provider.baseUrl}</p>
        </div>
        <StatusBadge status={provider.status} />
      </div>
      <label className="mb-3 block text-sm">
        <span className="mb-1 block text-on-surface-variant">API Key</span>
        <div className="flex gap-2">
          <input
            className="field"
            type="password"
            placeholder="输入 API Key"
            defaultValue={provider.apiKeyMasked ?? ''}
            onBlur={(event) => onSave({ ...provider, apiKeyMasked: event.target.value ? maskKey(event.target.value) : provider.apiKeyMasked })}
          />
          <button className="btn-ghost px-3" title="删除 Key" onClick={() => onDeleteKey(provider.id)}>
            <Icon name="delete" />
          </button>
        </div>
      </label>
      <label className="mb-3 block text-sm">
        <span className="mb-1 block text-on-surface-variant">默认模型</span>
        <input className="field" value={provider.defaultModel} onChange={(event) => onSave({ ...provider, defaultModel: event.target.value })} />
      </label>
      <div className="mb-4">
        <CapabilityChips capabilities={provider.capabilities} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button className="btn-ghost px-2" onClick={() => onTest(provider.id)}>
          <Icon name="sensors" />
          测试
        </button>
        <button className="btn-ghost px-2" onClick={() => onSetDefault(provider.id)}>
          {provider.isDefault ? '默认中' : '设默认'}
        </button>
        <button className="btn-ghost px-2" onClick={() => onSave({ ...provider, status: provider.apiKeyMasked ? 'connected' : 'unconfigured' })}>
          保存
        </button>
      </div>
    </section>
  );
}
