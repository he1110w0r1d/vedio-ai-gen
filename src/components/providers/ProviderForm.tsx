import { useState } from 'react';
import type { ProviderCapability } from '../../types';
import { Icon } from '../common/Icon';
import { CapabilityChips, providerCapabilities } from './CapabilityChips';

type ProviderDraft = {
  name: string;
  providerType: string;
  baseUrl: string;
  defaultModel: string;
  apiKey: string;
  capabilities: ProviderCapability[];
};

const initialDraft: ProviderDraft = { name: '', providerType: 'custom', baseUrl: '', defaultModel: '', apiKey: '', capabilities: ['图片生成'] };

const providerTypeOptions = [
  { value: 'custom', label: 'Custom Provider', defaultModel: 'custom-model', capabilities: ['图片生成', 'T2V', 'I2V'] as ProviderCapability[] },
  { value: 'openai-images', label: '万物焕新 gpt-image-2', defaultModel: 'gpt-image-2', capabilities: ['图片生成'] as ProviderCapability[] },
  { value: 'mock', label: 'Mock Provider', defaultModel: 'mock-image/mock-video', capabilities: ['图片生成', 'T2V', 'I2V', 'R2V', '异步任务'] as ProviderCapability[] },
];

const wanwuImageModels = ['gpt-image-2'];

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

  const changeProviderType = (providerType: string) => {
    const option = providerTypeOptions.find((item) => item.value === providerType);
    setDraft((item) => ({
      ...item,
      providerType,
      name: item.name || option?.label || '',
      baseUrl: providerType === 'openai-images' ? 'https://api.wanwuhuanxin.cn/v1' : item.baseUrl,
      defaultModel: option?.defaultModel ?? item.defaultModel,
      capabilities: option?.capabilities ?? item.capabilities,
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
      <div className="grid gap-3 md:grid-cols-5">
        <select className="field" value={draft.providerType} onChange={(event) => changeProviderType(event.target.value)}>
          {providerTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <input className="field" placeholder="供应商名称" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        <input className="field" placeholder="Base URL" value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} />
        {draft.providerType === 'openai-images' ? (
          <select className="field" value={draft.defaultModel} onChange={(event) => setDraft({ ...draft, defaultModel: event.target.value })}>
            {wanwuImageModels.map((model) => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        ) : (
          <input className="field" placeholder="默认模型" value={draft.defaultModel} onChange={(event) => setDraft({ ...draft, defaultModel: event.target.value })} />
        )}
        <input className="field" placeholder="API Key（仅前端脱敏）" type="password" value={draft.apiKey} onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })} />
      </div>
      <div className="mt-3">
        <CapabilityChips capabilities={providerCapabilities} selected={draft.capabilities} onToggle={toggleCapability} />
      </div>
      <button className="btn-primary mt-4" onClick={submit}>
        <Icon name="add" />
        添加供应商
      </button>
      {draft.providerType === 'openai-images' ? (
        <p className="mt-3 rounded-xl border border-primary-fixed-dim/30 bg-primary-fixed-dim/10 p-3 text-xs leading-5 text-on-surface-variant">
          万物焕新 gpt-image-2 目前仅用于图片文生图测试。API Key 通过后端加密保存，视频生成仍使用 Mock。
        </p>
      ) : null}
    </section>
  );
}
