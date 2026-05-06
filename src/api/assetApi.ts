import type { Asset } from '../types';
import { realApiNotImplemented, shouldUseMockApi } from './client';
import type { AssetListQuery } from './types';

export const assetApi = {
  async listAssets(assets: Asset[], query: AssetListQuery = {}): Promise<Asset[]> {
    if (!shouldUseMockApi()) realApiNotImplemented('GET /api/assets');
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
    if (!shouldUseMockApi()) realApiNotImplemented('GET /api/assets/:id');
    return assets.find((asset) => asset.id === assetId);
  },

  async deleteAsset(assetId: string): Promise<{ id: string; deleted: true }> {
    if (!shouldUseMockApi()) realApiNotImplemented('DELETE /api/assets/:id');
    return { id: assetId, deleted: true };
  },

  async favoriteAsset(asset: Asset, favorite = !asset.favorite): Promise<Asset> {
    if (!shouldUseMockApi()) realApiNotImplemented('POST /api/assets/:id/favorite');
    return { ...asset, favorite };
  },
};
