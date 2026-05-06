import type { Asset } from '../types';
import { requestJson, shouldUseMockApi } from './client';
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
};
