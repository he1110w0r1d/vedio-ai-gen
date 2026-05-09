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
  { value: 'aliyun-wanxiang-t2v', label: '阿里云百炼 万相文生视频', defaultModel: 'wan2.7-t2v', capabilities: ['T2V', '异步任务'] as ProviderCapability[] },
  { value: 'aliyun-wanxiang-i2v', label: '阿里云百炼 万相图生视频', defaultModel: 'wan2.6-i2v-flash', capabilities: ['I2V', '异步任务'] as ProviderCapability[] },
  { value: 'aliyun-wanxiang-r2v', label: '阿里云百炼 万相参考生视频', defaultModel: 'wan2.7-r2v', capabilities: ['R2V', '异步任务'] as ProviderCapability[] },
  { value: 'aliyun-happyhorse-t2v', label: '阿里云百炼 HappyHorse 文生视频', defaultModel: 'happyhorse-1.0-t2v', capabilities: ['T2V', '异步任务'] as ProviderCapability[] },
  { value: 'aliyun-happyhorse-i2v', label: '阿里云百炼 HappyHorse 图生视频', defaultModel: 'happyhorse-1.0-i2v', capabilities: ['I2V', '异步任务'] as ProviderCapability[] },
  { value: 'aliyun-happyhorse-r2v', label: '阿里云百炼 HappyHorse 参考生视频', defaultModel: 'happyhorse-1.0-r2v', capabilities: ['R2V', '异步任务'] as ProviderCapability[] },
  { value: 'kling-t2v', label: 'Kling 文生视频', defaultModel: 'pro-text-to-video', capabilities: ['T2V', '异步任务'] as ProviderCapability[] },
  { value: 'mock', label: 'Mock Provider', defaultModel: 'mock-image/mock-video', capabilities: ['图片生成', 'T2V', 'I2V', 'R2V', '异步任务'] as ProviderCapability[] },
];

const wanwuImageModels = ['gpt-image-2'];
const wanxiangVideoModels = ['wan2.7-t2v', 'wan2.6-t2v'];
const wanxiangI2VModels = ['wan2.6-i2v-flash', 'wan2.6-i2v', 'wan2.5-i2v-preview'];
const wanxiangR2VModels = ['wan2.7-r2v', 'wan2.6-r2v'];
const happyHorseT2VModels = ['happyhorse-1.0-t2v'];
const happyHorseI2VModels = ['happyhorse-1.0-i2v'];
const happyHorseR2VModels = ['happyhorse-1.0-r2v'];
const klingT2VModels = ['pro-text-to-video', 'std-text-to-video'];

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
      baseUrl: providerType === 'openai-images' ? 'https://api.wanwuhuanxin.cn/v1' : providerType.includes('aliyun-wanxiang') || providerType.includes('aliyun-happyhorse') ? 'https://dashscope.aliyuncs.com' : providerType === 'kling-t2v' ? 'https://kling3api.com' : item.baseUrl,
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
        {draft.providerType === 'openai-images' || draft.providerType.includes('aliyun-wanxiang') || draft.providerType.includes('aliyun-happyhorse') || draft.providerType === 'kling-t2v' ? (
          <select className="field" value={draft.defaultModel} onChange={(event) => setDraft({ ...draft, defaultModel: event.target.value })}>
            {(draft.providerType === 'openai-images' ? wanwuImageModels : draft.providerType === 'aliyun-wanxiang-i2v' ? wanxiangI2VModels : draft.providerType === 'aliyun-wanxiang-r2v' ? wanxiangR2VModels : draft.providerType === 'aliyun-happyhorse-t2v' ? happyHorseT2VModels : draft.providerType === 'aliyun-happyhorse-i2v' ? happyHorseI2VModels : draft.providerType === 'aliyun-happyhorse-r2v' ? happyHorseR2VModels : draft.providerType === 'kling-t2v' ? klingT2VModels : wanxiangVideoModels).map((model) => (
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
          万物焕新 gpt-image-2 用于真实图片文生图。API Key 通过后端加密保存。
        </p>
      ) : null}
      {draft.providerType.includes('aliyun-wanxiang') || draft.providerType.includes('aliyun-happyhorse') ? (
        <p className="mt-3 rounded-xl border border-primary-fixed-dim/30 bg-primary-fixed-dim/10 p-3 text-xs leading-5 text-on-surface-variant">
          {draft.providerType.includes('happyhorse') ? '阿里云百炼 HappyHorse 用于真实视频生成。' : '阿里云百炼万相用于真实视频生成。'}虽然都来自百炼账号，但为避免参数混淆，T2V / I2V / R2V 在本项目中作为三个独立供应商配置。真实生成会调用用户自己的百炼 API Key，并可能产生费用。
        </p>
      ) : null}
      {draft.providerType === 'kling-t2v' ? (
        <p className="mt-3 rounded-xl border border-primary-fixed-dim/30 bg-primary-fixed-dim/10 p-3 text-xs leading-5 text-on-surface-variant">
          Kling T2V 通过 kling3api.com 兼容网关接入（第三方，非 Kling 官方 API）。当前仅接入真实 T2V 文生视频，I2V / R2V / 视频编辑暂未接入。请确认 API Key 来源与 Base URL 一致。真实生成会调用用户自己的网关 API Key，并可能产生费用；费用以 kling3api.com 后台为准。
        </p>
      ) : null}
    </section>
  );
}
