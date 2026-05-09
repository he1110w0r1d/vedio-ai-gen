import { requestJson } from './client';
import type { StorageConfig } from '../types';

export const storageApi = {
  async getConfig(): Promise<StorageConfig> {
    return requestJson<StorageConfig>('/api/storage/config');
  },

  async updateConfig(data: Partial<StorageConfig>): Promise<StorageConfig> {
    return requestJson<StorageConfig>('/api/storage/config', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async testConnection(data: Partial<StorageConfig>): Promise<{ success: boolean }> {
    return requestJson<{ success: boolean }>('/api/storage/test', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async migrateAssets(data: { assetIds?: string[]; projectId?: string; deleteLocalAfterUpload?: boolean }): Promise<{ successCount: number; failedCount: number; warnings: string[] }> {
    return requestJson<{ successCount: number; failedCount: number; warnings: string[] }>('/api/storage/migrate-assets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async presignUrl(data: { objectKey: string; expiresInSeconds?: number }): Promise<{ accessType: 'public' | 'presigned'; url: string; expiresAt?: string }> {
    return requestJson<{ accessType: 'public' | 'presigned'; url: string; expiresAt?: string }>('/api/storage/presign', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
