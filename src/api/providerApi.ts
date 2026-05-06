import { maskKey } from '../services/mockService';
import type { Provider } from '../types';
import { getProviderAdapter } from '../providers/providerRegistry';
import { realApiNotImplemented, shouldUseMockApi } from './client';
import type { ProviderInput, ProviderTestResult } from './types';

export const providerApi = {
  async listProviders(providers: Provider[]): Promise<Provider[]> {
    if (!shouldUseMockApi()) realApiNotImplemented('GET /api/providers');
    return providers;
  },

  async createProvider(input: ProviderInput): Promise<Provider> {
    if (!shouldUseMockApi()) realApiNotImplemented('POST /api/providers');
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
    if (!shouldUseMockApi()) realApiNotImplemented('PATCH /api/providers/:id');
    return provider;
  },

  async deleteProviderKey(provider: Provider): Promise<Provider> {
    if (!shouldUseMockApi()) realApiNotImplemented('DELETE /api/providers/:id');
    return {
      ...provider,
      apiKeyMasked: undefined,
      status: 'unconfigured',
    };
  },

  async testProvider(provider: Provider): Promise<ProviderTestResult> {
    if (!shouldUseMockApi()) realApiNotImplemented('POST /api/providers/:id/test');
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
