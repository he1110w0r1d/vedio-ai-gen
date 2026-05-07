import { maskKey } from '../services/mockService';
import type { Provider } from '../types';
import { getProviderAdapter } from '../providers/providerRegistry';
import { requestJson, shouldUseMockApi } from './client';
import type { ProviderInput, ProviderTestResult } from './types';

type ServerProvider = {
  id: string;
  name: string;
  providerType: string;
  baseUrl?: string;
  maskedApiKey?: string;
  defaultModel?: string;
  capabilities: string[];
  status: 'connected' | 'failed' | 'not_configured';
};

function toProvider(input: ServerProvider): Provider {
  return {
    id: input.id,
    name: input.name,
    providerType: input.providerType,
    baseUrl: input.baseUrl ?? '',
    defaultModel: input.defaultModel ?? 'mock-model',
    apiKeyMasked: input.maskedApiKey,
    capabilities: input.capabilities.map(toFrontendCapability) as Provider['capabilities'],
    status: input.status === 'not_configured' ? 'unconfigured' : input.status,
  };
}

function inferProviderType(provider: Provider) {
  if (provider.providerType) return provider.providerType;
  const name = provider.name.toLowerCase();
  if (provider.id === 'openai' || name.includes('openai') || name.includes('万物焕新')) return 'openai-images';
  return 'custom';
}

function toBackendCapability(capability: string) {
  const map: Record<string, string> = {
    图片生成: 'image',
    T2V: 't2v',
    I2V: 'i2v',
    R2V: 'r2v',
    首帧: 'firstFrame',
    尾帧: 'lastFrame',
    多参考图: 'multiReference',
    负面提示词: 'negativePrompt',
    Seed: 'seed',
    异步任务: 'asyncTask',
  };
  return map[capability] ?? capability;
}

function toFrontendCapability(capability: string) {
  const map: Record<string, string> = {
    image: '图片生成',
    t2v: 'T2V',
    i2v: 'I2V',
    r2v: 'R2V',
    firstFrame: '首帧',
    lastFrame: '尾帧',
    multiReference: '多参考图',
    negativePrompt: '负面提示词',
    seed: 'Seed',
    asyncTask: '异步任务',
  };
  return map[capability] ?? capability;
}

export const providerApi = {
  async listProviders(providers: Provider[]): Promise<Provider[]> {
    if (!shouldUseMockApi()) {
      const items = await requestJson<ServerProvider[]>('/api/providers');
      return items.map(toProvider);
    }
    return providers;
  },

  async createProvider(input: ProviderInput): Promise<Provider> {
    if (!shouldUseMockApi()) {
      const provider = await requestJson<ServerProvider>('/api/providers', {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          providerType: input.providerType ?? 'custom',
          baseUrl: input.baseUrl,
          apiKey: input.apiKey,
          defaultModel: input.defaultModel,
          capabilities: input.capabilities.map(toBackendCapability),
        }),
      });
      return toProvider(provider);
    }
    return {
      id: `custom_${Date.now()}`,
      name: input.name,
      providerType: input.providerType ?? 'custom',
      baseUrl: input.baseUrl,
      defaultModel: input.defaultModel,
      apiKeyMasked: input.apiKey ? maskKey(input.apiKey) : undefined,
      capabilities: input.capabilities,
      status: input.apiKey ? 'connected' : 'unconfigured',
    };
  },

  async updateProvider(provider: Provider): Promise<Provider> {
    if (!shouldUseMockApi()) {
      const updated = await requestJson<ServerProvider>(`/api/providers/${provider.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: provider.name,
          providerType: inferProviderType(provider),
          baseUrl: provider.baseUrl,
          defaultModel: provider.defaultModel,
          capabilities: provider.capabilities.map(toBackendCapability),
        }),
      });
      return toProvider(updated);
    }
    return provider;
  },

  async deleteProviderKey(provider: Provider): Promise<Provider> {
    if (!shouldUseMockApi()) {
      const updated = await requestJson<ServerProvider>(`/api/providers/${provider.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'not_configured' }),
      });
      return toProvider(updated);
    }
    return {
      ...provider,
      apiKeyMasked: undefined,
      status: 'unconfigured',
    };
  },

  async testProvider(provider: Provider): Promise<ProviderTestResult> {
    if (!shouldUseMockApi()) {
      const result = await requestJson<{ status: 'connected' | 'failed' | 'not_configured'; message: string; capabilities?: string[] }>(`/api/providers/${provider.id}/test`, {
        method: 'POST',
      });
      return {
        status: result.status === 'not_configured' ? 'unconfigured' : result.status,
        message: result.message,
        capabilities: result.capabilities?.map(toFrontendCapability) as Provider['capabilities'],
      };
    }
    const adapter = getProviderAdapter(provider.id);
    const result = await adapter.testConnection({
      providerId: provider.id,
      apiKeyMasked: provider.apiKeyMasked,
      baseUrl: provider.baseUrl,
      defaultModel: provider.defaultModel,
    });
    return {
      status: result.ok ? 'connected' : 'failed',
      message: result.message,
      capabilities: result.capabilities,
    };
  },
};
