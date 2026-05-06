import { mockProviderAdapter } from './mockProviderAdapter';
import type { ProviderAdapter } from './types';

const adapters: Record<string, ProviderAdapter> = {
  mock: mockProviderAdapter,
};

export function getProviderAdapter(providerId?: string): ProviderAdapter {
  if (providerId && adapters[providerId]) return adapters[providerId];
  return mockProviderAdapter;
}

export function registerProviderAdapter(adapter: ProviderAdapter) {
  adapters[adapter.id] = adapter;
}

export function listProviderAdapters() {
  return Object.values(adapters);
}
