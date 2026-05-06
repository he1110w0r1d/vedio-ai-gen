import { useState } from 'react';
import type { ProviderCapability } from '../../types';
import { Icon } from '../common/Icon';
import { CapabilityChips, providerCapabilities } from './CapabilityChips';

type ProviderDraft = {
  name: string;
  baseUrl: string;
  defaultModel: string;
  apiKey: string;
  capabilities: ProviderCapability[];
};

const initialDraft: ProviderDraft = { name: '', baseUrl: '', defaultModel: '', apiKey: '', capabilities: ['图片生成'] };

export function ProviderForm({ onSubmit }: { onSubmit: (draft: ProviderDraft) => void }) {
  const [draft, setDraft] = useState<ProviderDraft>(initialDraft);

  const toggleCapability = (capability: ProviderCapability) => {
    setDraft((item) => ({
      ...item,
      capabilities: item.capabilities.includes(capability)
        ? item.capabilities.filter((cap) => cap !== capability)
        : [...item.capabilities, capability],
    }));
  };

  const submit = () => {
    if (!draft.name || !draft.baseUrl) return;
    onSubmit(draft);
    setDraft(initialDraft);
  };

  return (
    <section className="card mb-5">
      <h3 className="mb-4 text-lg font-bold">新增供应商</h3>
      <div className="grid gap-3 md:grid-cols-4">
        <input className="field" placeholder="供应商名称" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        <input className="field" placeholder="Base URL" value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} />
        <input className="field" placeholder="默认模型" value={draft.defaultModel} onChange={(event) => setDraft({ ...draft, defaultModel: event.target.value })} />
        <input className="field" placeholder="API Key（仅前端脱敏）" type="password" value={draft.apiKey} onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })} />
      </div>
      <div className="mt-3">
        <CapabilityChips capabilities={providerCapabilities} selected={draft.capabilities} onToggle={toggleCapability} />
      </div>
      <button className="btn-primary mt-4" onClick={submit}>
        <Icon name="add" />
        添加 Mock 供应商
      </button>
    </section>
  );
}
