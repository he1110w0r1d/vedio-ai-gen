import { Router } from 'express';
import { createProvider, deleteProvider, listProviders, testProvider, updateProvider } from '../services/providerService.js';
import { asyncHandler } from '../utils/errors.js';

export const providersRouter = Router();

providersRouter.get('/', asyncHandler(async (_req, res) => {
  res.json({ data: await listProviders() });
}));

providersRouter.post('/', asyncHandler(async (req, res) => {
  res.status(201).json({ data: await createProvider(req.body) });
}));

providersRouter.patch('/:id', asyncHandler(async (req, res) => {
  res.json({ data: await updateProvider(String(req.params.id), req.body) });
}));

providersRouter.delete('/:id', asyncHandler(async (req, res) => {
  res.json({ data: await deleteProvider(String(req.params.id)) });
}));

providersRouter.post('/:id/test', asyncHandler(async (req, res) => {
  res.json({ data: await testProvider(String(req.params.id)) });
}));
