import type { ProviderCreateInput, ProviderRecord, ProviderUpdateInput } from '../types/provider.js';
import { createId } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import { encryptSecret, maskSecret } from './encryptionService.js';

export function createProviderCredential(input: ProviderCreateInput): ProviderRecord {
  const now = nowIso();
  return {
    id: createId('provider'),
    name: input.name,
    providerType: input.providerType,
    baseUrl: input.baseUrl,
    encryptedApiKey: encryptSecret(input.apiKey),
    maskedApiKey: maskSecret(input.apiKey),
    defaultModel: input.defaultModel,
    capabilities: input.capabilities ?? [],
    status: input.apiKey ? 'connected' : 'not_configured',
    createdAt: now,
    updatedAt: now,
  };
}

export function updateProviderCredential(provider: ProviderRecord, input: ProviderUpdateInput): ProviderRecord {
  const encryptedPatch = input.apiKey
    ? {
        encryptedApiKey: encryptSecret(input.apiKey),
        maskedApiKey: maskSecret(input.apiKey),
        status: 'connected' as const,
      }
    : {};

  return {
    ...provider,
    ...encryptedPatch,
    name: input.name ?? provider.name,
    providerType: input.providerType ?? provider.providerType,
    baseUrl: input.baseUrl ?? provider.baseUrl,
    defaultModel: input.defaultModel ?? provider.defaultModel,
    capabilities: input.capabilities ?? provider.capabilities,
    status: input.status ?? encryptedPatch.status ?? provider.status,
    updatedAt: nowIso(),
  };
}
