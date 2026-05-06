import { mockProviderAdapter } from './mockProviderAdapter.js';
import type { ProviderAdapter } from './types.js';

const registry: Record<string, ProviderAdapter> = {
  mock: mockProviderAdapter,
  google: mockProviderAdapter,
  openai: mockProviderAdapter,
  runway: mockProviderAdapter,
  kling: mockProviderAdapter,
  minimax: mockProviderAdapter,
  pika: mockProviderAdapter,
  luma: mockProviderAdapter,
  stability: mockProviderAdapter,
  custom: mockProviderAdapter,
};

export function getProviderAdapter(providerType?: string): ProviderAdapter {
  if (providerType && registry[providerType]) return registry[providerType];
  return mockProviderAdapter;
}

export function registerProviderAdapter(providerType: string, adapter: ProviderAdapter) {
  registry[providerType] = adapter;
}
