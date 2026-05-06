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
    baseUrl: input.baseUrl ?? '',
    defaultModel: input.defaultModel ?? 'mock-model',
    apiKeyMasked: input.maskedApiKey,
    capabilities: input.capabilities as Provider['capabilities'],
    status: input.status === 'not_configured' ? 'unconfigured' : input.status,
  };
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
          providerType: 'custom',
          baseUrl: input.baseUrl,
          apiKey: input.apiKey,
          defaultModel: input.defaultModel,
          capabilities: input.capabilities,
        }),
      });
      return toProvider(provider);
    }
    return {
      id: `custom_${Date.now()}`,
      name: input.name,
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
          providerType: 'custom',
          baseUrl: provider.baseUrl,
          defaultModel: provider.defaultModel,
          capabilities: provider.capabilities,
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
        capabilities: result.capabilities as Provider['capabilities'],
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
