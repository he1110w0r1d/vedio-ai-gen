import { getProviderAdapter } from '../providers/providerRegistry.js';
import type { ProviderCreateInput, ProviderPublic, ProviderRecord, ProviderUpdateInput } from '../types/provider.js';
import { notFound, validationError } from '../utils/errors.js';
import { createProviderCredential, updateProviderCredential } from './credentialService.js';
import { readDb, updateDb } from './storageService.js';

function toPublic(provider: ProviderRecord): ProviderPublic {
  const { encryptedApiKey: _encryptedApiKey, ...publicProvider } = provider;
  return publicProvider;
}

export async function listProviders(): Promise<ProviderPublic[]> {
  const db = await readDb();
  return db.providers.map(toPublic);
}

export async function getProviderRecord(providerId: string): Promise<ProviderRecord> {
  const db = await readDb();
  const provider = db.providers.find((item) => item.id === providerId);
  if (!provider) throw notFound('供应商不存在');
  return provider;
}

export async function createProvider(input: ProviderCreateInput): Promise<ProviderPublic> {
  if (!input.name || !input.providerType || !input.apiKey) throw validationError('name、providerType、apiKey 为必填字段');
  const provider = createProviderCredential(input);
  await updateDb((db) => {
    db.providers.unshift(provider);
  });
  return toPublic(provider);
}

export async function updateProvider(providerId: string, input: ProviderUpdateInput): Promise<ProviderPublic> {
  let updated: ProviderRecord | undefined;
  await updateDb((db) => {
    db.providers = db.providers.map((provider) => {
      if (provider.id !== providerId) return provider;
      updated = updateProviderCredential(provider, input);
      return updated;
    });
  });
  if (!updated) throw notFound('供应商不存在');
  return toPublic(updated);
}

export async function deleteProvider(providerId: string) {
  let removed = false;
  await updateDb((db) => {
    const before = db.providers.length;
    db.providers = db.providers.filter((provider) => provider.id !== providerId);
    removed = db.providers.length !== before;
  });
  if (!removed) throw notFound('供应商不存在');
  return { id: providerId, deleted: true };
}

export async function testProvider(providerId: string) {
  const provider = await getProviderRecord(providerId);
  const result = await getProviderAdapter(provider.providerType).testConnection(provider);
  const status = result.ok ? 'connected' : 'failed';
  await updateProvider(providerId, { status, capabilities: result.capabilities });
  return { status, message: result.message, capabilities: result.capabilities };
}
