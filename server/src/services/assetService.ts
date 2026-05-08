import type { AssetRecord } from '../types/asset.js';
import { modelNotSupported, notFound } from '../utils/errors.js';
import { deleteLocalFile, readLocalAssetFile } from './fileStorageService.js';
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
  const asset = await getAsset(assetId);
  if (asset.storageType === 'local' && asset.localPath) {
    await deleteLocalFile({ localPath: asset.localPath });
  }
  let removed = false;
  await updateDb((db) => {
    const before = db.assets.length;
    db.assets = db.assets.filter((asset) => asset.id !== assetId);
    removed = db.assets.length !== before;
  });
  if (!removed) throw notFound('资产不存在');
  return { id: assetId, deleted: true };
}

export async function getAssetDownload(assetId: string) {
  const asset = await getAsset(assetId);
  if (!['image', 'video', 'reference'].includes(asset.type)) throw modelNotSupported('asset', '当前资产类型不支持下载');
  if (asset.storageType !== 'local') throw notFound('仅本地保存的资产支持下载');
  const file = await readLocalAssetFile(asset.localPath);
  if (!file) throw notFound('资产文件不存在');
  return {
    asset,
    buffer: file.buffer,
    fileName: buildDownloadFileName(asset),
    mimeType: asset.mimeType ?? 'application/octet-stream',
  };
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

function buildDownloadFileName(asset: AssetRecord) {
  const provider = asset.providerName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
  const date = asset.createdAt.slice(0, 10).replace(/-/g, '');
  const extension = extensionFromMime(asset.mimeType) ?? asset.localPath?.match(/\.([a-zA-Z0-9]+)$/)?.[1] ?? 'bin';
  return `${asset.id}_${provider}_${date}.${extension}`;
}

function extensionFromMime(mimeType?: string) {
  if (!mimeType) return undefined;
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('mp4')) return 'mp4';
  return undefined;
}
