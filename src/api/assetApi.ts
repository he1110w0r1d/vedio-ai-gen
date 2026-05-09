import type { Asset } from '../types';
import { API_BASE_URL, requestJson, shouldUseMockApi } from './client';
import type { AssetListQuery } from './types';

export const assetApi = {
  async listAssets(assets: Asset[], query: AssetListQuery = {}): Promise<Asset[]> {
    if (!shouldUseMockApi()) {
      const params = new URLSearchParams();
      if (query.projectId) params.set('projectId', query.projectId);
      if (query.type) params.set('type', query.type);
      if (query.providerId) params.set('providerId', query.providerId);
      return requestJson<Asset[]>(`/api/assets${params.toString() ? `?${params}` : ''}`);
    }
    const keyword = query.search?.toLowerCase();
    return assets.filter((asset) => {
      const matchProject = !query.projectId || asset.projectId === query.projectId;
      const matchType = !query.type || asset.type === query.type;
      const matchProvider = !query.providerId || asset.providerId === query.providerId;
      const matchModel = !query.model || asset.model === query.model;
      const matchFavorite = query.favorite === undefined || asset.favorite === query.favorite;
      const matchSearch = !keyword || `${asset.title} ${asset.prompt} ${asset.model} ${asset.providerName}`.toLowerCase().includes(keyword);
      return matchProject && matchType && matchProvider && matchModel && matchFavorite && matchSearch;
    });
  },

  async getAsset(assets: Asset[], assetId: string): Promise<Asset | undefined> {
    if (!shouldUseMockApi()) return requestJson<Asset>(`/api/assets/${assetId}`);
    return assets.find((asset) => asset.id === assetId);
  },

  async deleteAsset(assetId: string): Promise<{ id: string; deleted: true }> {
    if (!shouldUseMockApi()) return requestJson<{ id: string; deleted: true }>(`/api/assets/${assetId}`, { method: 'DELETE' });
    return { id: assetId, deleted: true };
  },

  async favoriteAsset(asset: Asset, favorite = !asset.favorite): Promise<Asset> {
    if (!shouldUseMockApi()) {
      return requestJson<Asset>(`/api/assets/${asset.id}/favorite`, {
        method: 'POST',
        body: JSON.stringify({ favorite }),
      });
    }
    return { ...asset, favorite };
  },

  async downloadAsset(asset: Asset): Promise<void> {
    if (shouldUseMockApi()) return;
    const response = await fetch(`${API_BASE_URL}/api/assets/${asset.id}/download`);
    if (!response.ok) throw new Error('资产下载失败');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const disposition = response.headers.get('Content-Disposition') ?? '';
    link.href = url;
    link.download = parseFileName(disposition) ?? `${asset.id}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  async getAssetAccessUrl(assetId: string): Promise<{ assetId: string; accessType: 'local' | 'public' | 'presigned' | 'mock'; url: string; expiresAt?: string }> {
    if (shouldUseMockApi()) {
      return { assetId, accessType: 'mock', url: '' };
    }
    return requestJson(`/api/assets/${assetId}/access-url`);
  },
};

function parseFileName(disposition: string) {
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1];
  if (encoded) return decodeURIComponent(encoded);
  return disposition.match(/filename="?([^";]+)"?/)?.[1];
}
