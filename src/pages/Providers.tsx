import { useState } from 'react';
import { SectionHeader, StatusBadge, Icon } from '../components/ui';
import { useApp } from '../context/AppContext';
import { maskKey } from '../services/mockService';
import type { ProviderCapability } from '../types';

const allCapabilities: ProviderCapability[] = ['图片生成', 'T2V', 'I2V', 'R2V', '首帧', '尾帧', '多参考图', '负面提示词', 'Seed', '异步任务'];

export function Providers() {
  const { providers, upsertProvider, deleteProviderKey, testProvider, setDefaultProvider, addCustomProvider } = useApp();
  const [draft, setDraft] = useState({ name: '', baseUrl: '', defaultModel: '', apiKey: '', capabilities: ['图片生成'] as ProviderCapability[] });

  return (
    <div>
      <SectionHeader title="供应商与 API Keys" subtitle="前端 Mock 管理 BYOK 配置，不会保存真实密钥到远端。" />
      <div className="mb-5 rounded-2xl border border-primary-fixed-dim/30 bg-primary-fixed-dim/10 p-4 text-sm leading-6 text-primary">
        平台仅提供统一创作工作台、资产管理和调用编排能力。用户通过本人 API Key 调用第三方供应商生成内容，相关费用、内容审核、版权归属、商用授权和使用限制均以对应第三方供应商的服务条款为准。平台不对第三方模型生成内容的版权、合规性或商用授权作额外承诺。请不要在代码中写入真实 API Key。
      </div>
      <section className="card mb-5">
        <h3 className="mb-4 text-lg font-bold">新增供应商</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <input className="field" placeholder="供应商名称" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <input className="field" placeholder="Base URL" value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} />
          <input className="field" placeholder="默认模型" value={draft.defaultModel} onChange={(event) => setDraft({ ...draft, defaultModel: event.target.value })} />
          <input className="field" placeholder="API Key（仅前端脱敏）" type="password" value={draft.apiKey} onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {allCapabilities.map((capability) => (
            <button key={capability} className={`chip ${draft.capabilities.includes(capability) ? 'border-primary-fixed-dim text-primary-fixed' : ''}`} onClick={() => setDraft((item) => ({ ...item, capabilities: item.capabilities.includes(capability) ? item.capabilities.filter((cap) => cap !== capability) : [...item.capabilities, capability] }))}>
              {capability}
            </button>
          ))}
        </div>
        <button className="btn-primary mt-4" onClick={() => {
          if (!draft.name || !draft.baseUrl) return;
          addCustomProvider(draft);
          setDraft({ name: '', baseUrl: '', defaultModel: '', apiKey: '', capabilities: ['图片生成'] });
        }}><Icon name="add" />添加 Mock 供应商</button>
      </section>
      <div className="grid gap-4 xl:grid-cols-3">
        {providers.map((provider) => (
          <section key={provider.id} className="card">
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
                  onBlur={(event) => upsertProvider({ ...provider, apiKeyMasked: event.target.value ? maskKey(event.target.value) : provider.apiKeyMasked })}
                />
                <button className="btn-ghost px-3" title="删除 Key" onClick={() => deleteProviderKey(provider.id)}><Icon name="delete" /></button>
              </div>
            </label>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-on-surface-variant">默认模型</span>
              <input className="field" value={provider.defaultModel} onChange={(event) => upsertProvider({ ...provider, defaultModel: event.target.value })} />
            </label>
            <div className="mb-4 flex flex-wrap gap-2">
              {provider.capabilities.map((capability) => <span key={capability} className="chip">{capability}</span>)}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button className="btn-ghost px-2" onClick={() => testProvider(provider.id)}><Icon name="sensors" />测试</button>
              <button className="btn-ghost px-2" onClick={() => setDefaultProvider(provider.id)}>{provider.isDefault ? '默认中' : '设默认'}</button>
              <button className="btn-ghost px-2" onClick={() => upsertProvider({ ...provider, status: provider.apiKeyMasked ? 'connected' : 'unconfigured' })}>保存</button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
