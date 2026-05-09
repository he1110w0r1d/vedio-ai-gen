import { Router } from 'express';
import {
  listQualityFeedback,
  getQualitySummary,
  getTargetFeedback,
  upsertFeedback,
  updateFeedback,
  deleteFeedback,
} from '../services/qualityService.js';
import { asyncHandler } from '../utils/errors.js';

export const qualityRouter = Router();

qualityRouter.get('/', asyncHandler(async (req, res) => {
  const feedback = await listQualityFeedback(req.query as Record<string, string>);
  res.json({ data: feedback });
}));

qualityRouter.get('/summary', asyncHandler(async (req, res) => {
  const summary = await getQualitySummary(req.query as Record<string, string>);
  res.json({ data: summary });
}));

qualityRouter.post('/', asyncHandler(async (req, res) => {
  const { targetType, targetId, ...data } = req.body;
  const feedback = await upsertFeedback(targetType, targetId, data);
  res.status(201).json({ data: feedback });
}));

qualityRouter.patch('/:id', asyncHandler(async (req, res) => {
  const updated = await updateFeedback(req.params.id as string, req.body);
  res.json({ data: updated });
}));

qualityRouter.delete('/:id', asyncHandler(async (req, res) => {
  await deleteFeedback(req.params.id as string);
  res.status(204).end();
}));

// Convenience routes for assets and tasks
qualityRouter.get('/assets/:id', asyncHandler(async (req, res) => {
  const feedback = await getTargetFeedback('asset', req.params.id as string);
  res.json({ data: feedback ?? null });
}));

qualityRouter.post('/assets/:id', asyncHandler(async (req, res) => {
  const feedback = await upsertFeedback('asset', req.params.id as string, req.body);
  res.status(201).json({ data: feedback });
}));

qualityRouter.get('/tasks/:id', asyncHandler(async (req, res) => {
  const feedback = await getTargetFeedback('task', req.params.id as string);
  res.json({ data: feedback ?? null });
}));

qualityRouter.post('/tasks/:id', asyncHandler(async (req, res) => {
  const feedback = await upsertFeedback('task', req.params.id as string, req.body);
  res.status(201).json({ data: feedback });
}));
