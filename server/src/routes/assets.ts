import { Router } from 'express';
import { deleteAsset, favoriteAsset, getAsset, listAssets } from '../services/assetService.js';
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

assetsRouter.delete('/:id', asyncHandler(async (req, res) => {
  res.json({ data: await deleteAsset(String(req.params.id)) });
}));

assetsRouter.post('/:id/favorite', asyncHandler(async (req, res) => {
  res.json({ data: await favoriteAsset(String(req.params.id), req.body?.favorite) });
}));
