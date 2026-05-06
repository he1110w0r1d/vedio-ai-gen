import type { AssetRecord } from '../types/asset.js';
import { notFound } from '../utils/errors.js';
import { readDb, updateDb } from './storageService.js';

export async function listAssets(query: { type?: string; projectId?: string; providerId?: string } = {}) {
  const db = await readDb();
  return db.assets.filter((asset) => {
    const matchType = !query.type || asset.type === query.type;
    const matchProject = !query.projectId || asset.projectId === query.projectId;
    const matchProvider = !query.providerId || asset.providerId === query.providerId;
    return matchType && matchProject && matchProvider;
  });
}

export async function getAsset(assetId: string) {
  const db = await readDb();
  const asset = db.assets.find((item) => item.id === assetId);
  if (!asset) throw notFound('资产不存在');
  return asset;
}

export async function addAssets(assets: AssetRecord[]) {
  await updateDb((db) => {
    db.assets.unshift(...assets);
  });
  return assets;
}

export async function deleteAsset(assetId: string) {
  let removed = false;
  await updateDb((db) => {
    const before = db.assets.length;
    db.assets = db.assets.filter((asset) => asset.id !== assetId);
    removed = db.assets.length !== before;
  });
  if (!removed) throw notFound('资产不存在');
  return { id: assetId, deleted: true };
}

export async function favoriteAsset(assetId: string, favorite?: boolean) {
  let updated: AssetRecord | undefined;
  await updateDb((db) => {
    db.assets = db.assets.map((asset) => {
      if (asset.id !== assetId) return asset;
      updated = { ...asset, favorite: favorite ?? !asset.favorite, updatedAt: new Date().toISOString() };
      return updated;
    });
  });
  if (!updated) throw notFound('资产不存在');
  return updated;
}
