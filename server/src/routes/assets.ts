import { Router } from 'express';
import { deleteAsset, favoriteAsset, getAsset, getAssetDownload, listAssets } from '../services/assetService.js';
import { asyncHandler } from '../utils/errors.js';

export const assetsRouter = Router();

assetsRouter.get('/', asyncHandler(async (req, res) => {
  res.json({ data: await listAssets({
    type: typeof req.query.type === 'string' ? req.query.type : undefined,
    projectId: typeof req.query.projectId === 'string' ? req.query.projectId : undefined,
    providerId: typeof req.query.providerId === 'string' ? req.query.providerId : undefined,
  }) });
}));

assetsRouter.get('/:id', asyncHandler(async (req, res) => {
  res.json({ data: await getAsset(String(req.params.id)) });
}));

assetsRouter.get('/:id/access-url', asyncHandler(async (req, res) => {
  const asset = await getAsset(String(req.params.id));
  
  if (asset.storageType === 'local') {
    res.json({ data: { assetId: asset.id, accessType: 'local', url: asset.url } });
    return;
  }
  
  if (asset.storageType === 'object') {
    const { readDb } = await import('../services/storageService.js');
    const db = await readDb();
    const config = db.storageConfig;
    
    if (config.accessMode === 'public' && asset.publicUrl) {
      res.json({ data: { assetId: asset.id, accessType: 'public', url: asset.publicUrl } });
      return;
    }
    
    if (asset.objectKey) {
      const { createPresignedUrl } = await import('../services/fileStorageService.js');
      const expiresIn = config.presignedUrlExpiresInSeconds ?? 900;
      const url = await createPresignedUrl({ objectKey: asset.objectKey, expiresInSeconds: expiresIn });
      res.json({
        data: {
          assetId: asset.id,
          accessType: 'presigned',
          url,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        }
      });
      return;
    }
  }
  
  res.json({ data: { assetId: asset.id, accessType: 'mock', url: asset.url } });
}));

assetsRouter.get('/:id/download', asyncHandler(async (req, res) => {
  const asset = await getAsset(String(req.params.id));
  if (!['image', 'video', 'reference'].includes(asset.type)) throw new Error('当前资产类型不支持下载');

  if (asset.storageType === 'object') {
    const { readDb } = await import('../services/storageService.js');
    const db = await readDb();
    if (db.storageConfig.accessMode === 'public' && asset.publicUrl) {
      res.redirect(asset.publicUrl);
      return;
    }
    if (asset.objectKey) {
      const { createPresignedUrl } = await import('../services/fileStorageService.js');
      const url = await createPresignedUrl({
        objectKey: asset.objectKey,
        expiresInSeconds: 900,
        responseContentDisposition: `attachment; filename="${encodeURIComponent(asset.id)}"`,
      });
      res.redirect(url);
      return;
    }
  }

  const file = await getAssetDownload(String(req.params.id));
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Length', String(file.buffer.byteLength));
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
  res.send(file.buffer);
}));

assetsRouter.delete('/:id', asyncHandler(async (req, res) => {
  res.json({ data: await deleteAsset(String(req.params.id)) });
}));

assetsRouter.post('/:id/favorite', asyncHandler(async (req, res) => {
  res.json({ data: await favoriteAsset(String(req.params.id), req.body?.favorite) });
}));
