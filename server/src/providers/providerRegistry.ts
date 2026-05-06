import { mockProviderAdapter } from './mockProviderAdapter.js';
import { openaiImagesAdapter } from './openaiImagesAdapter.js';
import type { ProviderAdapter } from './types.js';
import { providerUnavailable } from '../utils/errors.js';

const registry: Record<string, ProviderAdapter> = {
  mock: mockProviderAdapter,
  google: mockProviderAdapter,
  openai: openaiImagesAdapter,
  'openai-images': openaiImagesAdapter,
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
  throw providerUnavailable(providerType ?? 'unknown', 'UNKNOWN_PROVIDER_TYPE');
}

export function registerProviderAdapter(providerType: string, adapter: ProviderAdapter) {
  registry[providerType] = adapter;
}
